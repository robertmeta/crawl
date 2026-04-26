import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";

import {
  crawlAltInputData,
  crawlKeyCode,
  crawlPrintableInput,
  unsupportedClientShortcut,
  type CrawlPrintableInput
} from "../protocol/keymap";
import type { OutgoingMessage } from "../protocol/messages";
import { connectCrawlSocket, type CrawlSocket } from "../protocol/socket";
import {
  createAccessibleGameState,
  type AccessibleGameState,
  type GameUiAction,
  type GameMenu,
  type GameMenuItem,
  type GameUiButton,
  type GameUiPanel as GameUiPanelData,
  type InventoryItem,
  type TextInputPrompt
} from "../state/game-state";
import { createTileRenderer, type TileRenderer } from "../tiles/tile-renderer";
import { scrollChildIntoView } from "./dom-scroll";
import { menuActivationMessages } from "./menu-actions";

type AppProps = {
  config?: {
    socketServer: string;
    gameVersion: string;
  };
};

export function App(props: AppProps) {
  const { state, setState, setStatus, addError, applyMessage } = createAccessibleGameState();
  const [socket, setSocket] = createSignal<CrawlSocket | null>(null);
  const [authMode, setAuthMode] = createSignal<"login" | "register">("login");
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [repeatPassword, setRepeatPassword] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [rcContents, setRcContents] = createSignal("");
  const [historyOpen, setHistoryOpen] = createSignal(false);
  const [historyQuery, setHistoryQuery] = createSignal("");
  let gameRootRef: HTMLElement | undefined;
  let suppressedKeyPress: string | null = null;

  const send = (message: OutgoingMessage) => socket()?.send(message);
  const inGameView = () => state.activeLayer === "game" || state.isInGame;
  const sendPrintableInput = (input: CrawlPrintableInput) => {
    send("data" in input ? { msg: "input", data: input.data } : { msg: "input", text: input.text });
  };

  createEffect(() => {
    if (!props.config?.socketServer) {
      addError("Missing WebSocket configuration.");
      return;
    }

    const connection = connectCrawlSocket(props.config.socketServer, {
      onOpen: () => send({ msg: "go_lobby" }),
      onMessage: (message) => {
        if (message.msg === "ping") {
          connection.send({ msg: "pong" });
        }
        applyMessage(message);
      },
      onStatus: setStatus,
      onError: addError
    });

    setSocket(connection);
    onCleanup(() => connection.close());
  });

  createEffect(() => {
    setRcContents(state.rcFile?.contents ?? "");
  });

  createEffect(() => {
    if (inGameView()) {
      queueMicrotask(() => gameRootRef?.focus());
    }
  });

  const login = (event: SubmitEvent) => {
    event.preventDefault();
    send({ msg: "login", username: username(), password: password() });
  };

  const register = (event: SubmitEvent) => {
    event.preventDefault();
    if (username().includes(" ")) {
      addError("The username cannot contain spaces.");
      return;
    }
    if (password() !== repeatPassword()) {
      addError("Passwords do not match.");
      return;
    }
    send({ msg: "register", username: username(), password: password(), email: email() });
  };

  const saveRc = (event: SubmitEvent) => {
    event.preventDefault();
    if (!state.rcFile) {
      return;
    }
    send({ msg: "set_rc", game_id: state.rcFile.gameId, contents: rcContents() });
    setState("rcFile", null);
  };

  const stopStalePurge = () => {
    send({ msg: "stop_stale_process_purge" });
    setState("staleProcess", null);
    setState("lastAnnouncement", "Keeping the stale process running.");
  };

  const answerForceTerminate = (answer: boolean) => {
    send({ msg: "force_terminate", answer });
    setState("forceTerminatePrompt", null);
    setState("lastAnnouncement", answer ? "Force termination requested." : "Force termination declined.");
  };

  const openHistory = () => {
    setHistoryOpen(true);
    setState("lastAnnouncement", `Message history opened. ${state.messages.length} messages available.`);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setState("lastAnnouncement", "Message history closed.");
    queueMicrotask(() => gameRootRef?.focus());
  };

  const setTextInputValue = (value: string) => {
    setState("textInputPrompt", (prompt) => prompt ? { ...prompt, value } : prompt);
  };

  const cancelTextInput = () => {
    send({ msg: "key", keycode: 27 });
    setState("textInputPrompt", null);
    setState("lastAnnouncement", "Text input cancelled.");
    queueMicrotask(() => gameRootRef?.focus());
  };

  const submitTextInput = () => {
    const prompt = state.textInputPrompt;
    if (!prompt) {
      return;
    }
    if (prompt.source === "init_input" && prompt.tag !== "repeat") {
      send({ msg: "key", keycode: 21 });
      send({ msg: "key", keycode: 11 });
    }
    send({ msg: "text_input", text: `${prompt.value}\r` });
    setState("textInputPrompt", null);
    queueMicrotask(() => gameRootRef?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (historyOpen()) {
      if (event.key === "Escape" && !isTextInput(event.target)) {
        event.preventDefault();
        closeHistory();
      }
      return;
    }
    if (state.textInputPrompt) {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelTextInput();
      }
      return;
    }
    if ((state.staleProcess || state.forceTerminatePrompt) && isButtonActivation(event)) {
      return;
    }
    if (state.forceTerminatePrompt) {
      event.preventDefault();
      answerForceTerminate(event.key.toLowerCase() === "y");
      return;
    }
    if (state.staleProcess) {
      event.preventDefault();
      stopStalePurge();
      return;
    }
    if (!state.isInGame || isTextInput(event.target) || isNativeControlActivation(event)) {
      return;
    }

    const unsupportedShortcut = unsupportedClientShortcut(event);
    if (unsupportedShortcut) {
      event.preventDefault();
      setState("lastAnnouncement", `Not implemented: ${unsupportedShortcut}.`);
      return;
    }

    const uiHotkeyCode = gameUiHotkeyCode(event, state.uiStack);
    if (uiHotkeyCode !== null) {
      event.preventDefault();
      send({ msg: "key", keycode: uiHotkeyCode });
      return;
    }

    const altData = crawlAltInputData(event);
    if (altData) {
      event.preventDefault();
      send({ msg: "input", data: altData });
      return;
    }

    const keycode = crawlKeyCode(event);
    if (keycode !== undefined) {
      event.preventDefault();
      send({ msg: "key", keycode });
      return;
    }

    const printableInput = crawlPrintableInput(event);
    if (printableInput) {
      event.preventDefault();
      suppressedKeyPress = event.key;
      sendPrintableInput(printableInput);
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (historyOpen()) {
      return;
    }
    if (state.textInputPrompt) {
      return;
    }
    if (state.staleProcess || state.forceTerminatePrompt) {
      event.preventDefault();
      return;
    }
    if (
      !state.isInGame
      || isTextInput(event.target)
      || isNativeControlActivation(event)
    ) {
      return;
    }

    const printableInput = crawlPrintableInput(event);
    if (!printableInput) {
      return;
    }

    if (suppressedKeyPress) {
      if (suppressedKeyPress === event.key) {
        event.preventDefault();
        suppressedKeyPress = null;
        return;
      }
      suppressedKeyPress = null;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      sendPrintableInput(printableInput);
    }
  };

  createEffect(() => {
    if (!state.isInGame && !state.staleProcess && !state.forceTerminatePrompt) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keypress", handleKeyPress);
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keypress", handleKeyPress);
    });
  });

  return (
    <div class="app-shell" classList={{ "game-shell": inGameView() }}>
      <LiveRegion message={state.lastAnnouncement} />
      <SessionPrompts
        state={state}
        onStopStalePurge={stopStalePurge}
        onForceTerminate={answerForceTerminate}
      />
      <Show when={historyOpen()}>
        <MessageHistoryDialog
          messages={state.messages}
          query={historyQuery()}
          setQuery={setHistoryQuery}
          onClose={closeHistory}
        />
      </Show>
      <Show when={state.textInputPrompt}>
        {(prompt) => (
          <TextInputDialog
            prompt={prompt()}
            setValue={setTextInputValue}
            onSubmit={submitTextInput}
            onCancel={cancelTextInput}
            send={send}
          />
        )}
      </Show>
      <Show when={!inGameView()}>
        <aside class="sidebar" aria-label="WebTiles session">
          <div class="stack">
            <header>
              <h1>Accessible WebTiles</h1>
              <p class="status-line">Status: {state.connectionStatus}</p>
              <Show when={props.config?.gameVersion}>
                <p class="status-line">Server version: {props.config?.gameVersion}</p>
              </Show>
            </header>

            <Show when={state.errors.length > 0}>
              <section class="panel" aria-labelledby="errors-title">
                <h2 id="errors-title">Errors</h2>
                <For each={state.errors}>{(error) => <p class="error">{error}</p>}</For>
              </section>
            </Show>

            <Show
              when={state.currentUser}
              fallback={
                <AuthPanel
                  mode={authMode()}
                  setMode={setAuthMode}
                  username={username()}
                  password={password()}
                  repeatPassword={repeatPassword()}
                  email={email()}
                  setUsername={setUsername}
                  setPassword={setPassword}
                  setRepeatPassword={setRepeatPassword}
                  setEmail={setEmail}
                  onLogin={login}
                  onRegister={register}
                />
              }
            >
              <section class="panel" aria-labelledby="account-title">
                <h2 id="account-title">Account</h2>
                <p>Logged in as {state.currentUser}</p>
                <button type="button" onClick={() => send({ msg: "logout" })}>Log out</button>
              </section>
            </Show>
          </div>
        </aside>
      </Show>

      <main class="main" classList={{ "game-main": inGameView() }} aria-label="WebTiles client">
        <Show when={state.rcFile}>
          <section class="panel" aria-labelledby="rc-title">
            <h2 id="rc-title">Edit rc file for {state.rcFile?.gameId}</h2>
            <form class="stack" onSubmit={saveRc}>
              <label for="rc-contents">RC file contents</label>
              <textarea id="rc-contents" rows="18" value={rcContents()} onInput={(event) => setRcContents(event.currentTarget.value)} />
              <div class="inline-actions">
                <button type="submit">Save rc file</button>
                <button type="button" onClick={() => setState("rcFile", null)}>Cancel</button>
              </div>
            </form>
          </section>
        </Show>

        <Show
          when={inGameView()}
          fallback={<LobbyPanels state={state} send={send} />}
        >
          <GamePanel
            state={state}
            send={send}
            setGameRootRef={(element) => { gameRootRef = element; }}
            onOpenHistory={openHistory}
          />
        </Show>
      </main>
    </div>
  );
}

function LobbyPanels(props: {
  state: AccessibleGameState;
  send: (message: OutgoingMessage) => void;
}) {
  return (
    <>
      <section class="panel" aria-labelledby="play-title">
        <h2 id="play-title">Play</h2>
        <Show when={props.state.gameLinks.length > 0} fallback={<p class="status-line">Waiting for game list.</p>}>
          <div class="stack">
            <For each={props.state.gameLinks}>
              {(game) => (
                <div class="inline-actions">
                  <button type="button" onClick={() => props.send({ msg: "play", game_id: game.id })}>
                    {game.label}
                  </button>
                  <Show when={game.rcEditable}>
                    <button type="button" onClick={() => props.send({ msg: "get_rc", game_id: game.id })}>
                      Edit rc
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>

      <RunningGamesPanel state={props.state} send={props.send} />
    </>
  );
}

function SessionPrompts(props: {
  state: AccessibleGameState;
  onStopStalePurge: () => void;
  onForceTerminate: (answer: boolean) => void;
}) {
  return (
    <>
      <Show when={props.state.staleProcess}>
        {(prompt) => (
          <section class="session-prompt panel" role="alertdialog" aria-labelledby="stale-process-title">
            <h2 id="stale-process-title">Stale Game Process</h2>
            <p>
              There are stale {prompt().game} processes. They will be stopped in {prompt().timeout} seconds.
            </p>
            <p class="status-line">Press any key to keep waiting, or use the button below.</p>
            <button type="button" onClick={props.onStopStalePurge}>Keep waiting</button>
          </section>
        )}
      </Show>
      <Show when={props.state.forceTerminatePrompt}>
        {(prompt) => (
          <section class="session-prompt panel" role="alertdialog" aria-labelledby="force-terminate-title">
            <h2 id="force-terminate-title">Force Termination</h2>
            <p>Could not stop a stale {prompt().game} process gracefully. Force its termination?</p>
            <div class="inline-actions">
              <button type="button" onClick={() => props.onForceTerminate(true)}>Yes</button>
              <button type="button" onClick={() => props.onForceTerminate(false)}>No</button>
            </div>
          </section>
        )}
      </Show>
    </>
  );
}

function TextInputDialog(props: {
  prompt: TextInputPrompt;
  setValue: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  send: (message: OutgoingMessage) => void;
}) {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    props.prompt;
    queueMicrotask(() => {
      inputRef?.focus();
      if (props.prompt.selectOnOpen) {
        inputRef?.select();
      }
    });
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    props.onSubmit();
  };

  const keyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
      return;
    }
    if (
      props.prompt.tag === "stash_search"
      && event.key === "?"
      && props.prompt.value.length === 0
    ) {
      event.preventDefault();
      props.send({ msg: "key", keycode: "?".charCodeAt(0) });
    }
  };

  return (
    <section
      class="text-input-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="text-input-title"
      aria-describedby="text-input-help"
      onKeyDown={keyDown}
    >
      <form class="text-input-card panel" onSubmit={submit}>
        <h2 id="text-input-title">Text Input</h2>
        <label for="game-text-input">{props.prompt.prompt}</label>
        <input
          ref={(element) => { inputRef = element; }}
          id="game-text-input"
          type="text"
          autocomplete="off"
          value={props.prompt.value}
          maxLength={props.prompt.maxLength ?? undefined}
          onInput={(event) => props.setValue(event.currentTarget.value)}
        />
        <p id="text-input-help" class="status-line">
          Enter submits to Crawl. Escape cancels.
        </p>
        <div class="inline-actions">
          <button type="submit">Submit</button>
          <button type="button" onClick={props.onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

function GamePanel(props: {
  state: AccessibleGameState;
  send: (message: OutgoingMessage) => void;
  setGameRootRef: (element: HTMLElement) => void;
  onOpenHistory: () => void;
}) {
  return (
    <section
      ref={props.setGameRootRef}
      class="game-screen"
      tabindex="0"
      aria-labelledby="game-title"
      aria-describedby="game-keyboard-help"
    >
      <h2 id="game-title" class="sr-only">Game</h2>
      <p id="game-keyboard-help" class="sr-only">
        Game keyboard input is active. Standard Crawl keys are sent directly to the game.
      </p>
      <TileMapPanel state={props.state} />

      <div class="game-overlay game-interface" aria-labelledby="game-screen-title">
        <h2 id="game-screen-title" class="sr-only">Game Interface</h2>
        <Show
          when={props.state.activeMenu}
          fallback={
            <Show
              when={props.state.uiStack.at(-1)}
              fallback={
                <GameTextAreas
                  textAreas={props.state.textAreas}
                  activeCrtMenuTag={props.state.activeCrtMenuTag}
                />
              }
            >
              {(panel) => <GameUiPanel panel={panel()} send={props.send} />}
            </Show>
          }
        >
          {(menu) => <GameMenuPanel menu={menu()} send={props.send} />}
        </Show>
      </div>

      <Show when={props.state.player}>
        {(player) => (
          <div class="game-overlay player-overlay">
            <PlayerPanel player={player()} inventory={props.state.inventory} />
          </div>
        )}
      </Show>

      <Show when={props.state.inventory.length > 0}>
        <div class="game-overlay inventory-overlay">
          <InventoryPanel
            inventory={props.state.inventory}
            player={props.state.player}
            send={props.send}
          />
        </div>
      </Show>

      <div class="game-overlay messages-overlay">
        <MessagesPanel state={props.state} onOpenHistory={props.onOpenHistory} />
      </div>
    </section>
  );
}

function TileMapPanel(props: { state: AccessibleGameState }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const [renderer, setRenderer] = createSignal<TileRenderer | null>(null);
  const hasMap = () => Object.keys(props.state.mapCells).length > 0;

  createEffect(() => {
    const version = props.state.gameVersion;
    if (!version) {
      setRenderer(null);
      return;
    }

    let cancelled = false;
    createTileRenderer(version)
      .then((nextRenderer) => {
        if (!cancelled) {
          setRenderer(() => nextRenderer);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderer(null);
        }
      });
    onCleanup(() => {
      cancelled = true;
    });
  });

  createEffect(() => {
    const nextRenderer = renderer();
    const canvas = canvasRef;
    const revision = props.state.mapRevision;
    const cursorRevision = props.state.cursorRevision;
    if (!nextRenderer || !canvas || !hasMap()) {
      return;
    }
    nextRenderer.draw(canvas, props.state.mapCells, props.state.mapCenter, props.state.activeCursor, revision + cursorRevision);
  });

  return (
    <section class="tile-map-panel" aria-labelledby="tile-map-title">
      <h2 id="tile-map-title" class="sr-only">Tile Map</h2>
      <Show when={hasMap()} fallback={<p class="status-line">The tile map appears after character creation.</p>}>
        <div class="tile-map-frame">
          <canvas
            ref={(element) => { canvasRef = element; }}
            class="tile-map"
            role="img"
            aria-label={tileMapLabel(props.state)}
          />
        </div>
      </Show>
    </section>
  );
}

function GameUiPanel(props: {
  panel: GameUiPanelData;
  send: (message: OutgoingMessage) => void;
}) {
  return (
    <section class="game-ui" aria-labelledby="active-ui-title">
      <h3 id="active-ui-title">{props.panel.title || "Game Menu"}</h3>
      <Show when={props.panel.prompt}>
        <p class="status-line">{props.panel.prompt}</p>
      </Show>
      <Show when={props.panel.body}>
        <div
          class="ui-description"
          role="region"
          tabindex="0"
          aria-label={`${props.panel.title || "Game"} details`}
        >
          <pre>{props.panel.body}</pre>
        </div>
      </Show>
      <Show when={props.panel.actions}>
        <section class="ui-actions" aria-labelledby="ui-actions-title">
          <h4 id="ui-actions-title">Actions</h4>
          <p class="status-line">{props.panel.actions}</p>
          <Show when={props.panel.actionButtons.length > 0}>
            <div class="inline-actions">
              <For each={props.panel.actionButtons}>
                {(action) => <GameUiActionButton action={action} send={props.send} />}
              </For>
            </div>
          </Show>
        </section>
      </Show>
      <For each={props.panel.groups}>
        {(group) => (
          <section class="choice-group" aria-labelledby={textAreaHeadingId(group.id)}>
            <h4 id={textAreaHeadingId(group.id)}>{group.label}</h4>
            <div class="choice-grid">
              <For each={group.buttons}>
                {(button) => (
                  <GameChoiceButton
                    button={button}
                    focused={button.hotkey === props.panel.focusedHotkey}
                    send={props.send}
                  />
                )}
              </For>
            </div>
          </section>
        )}
      </For>
    </section>
  );
}

function GameUiActionButton(props: {
  action: GameUiAction;
  send: (message: OutgoingMessage) => void;
}) {
  const choose = () => {
    if (props.action.hotkey !== null) {
      props.send({ msg: "key", keycode: props.action.hotkey });
    }
  };

  return (
    <button
      type="button"
      class="ui-action-button"
      disabled={props.action.hotkey === null}
      onClick={choose}
    >
      {props.action.label}
    </button>
  );
}

function GameChoiceButton(props: {
  button: GameUiButton;
  focused: boolean;
  send: (message: OutgoingMessage) => void;
}) {
  const choose = () => props.send({ msg: "key", keycode: props.button.hotkey });
  const focus = () => props.send({
    msg: "outer_menu_focus",
    hotkey: props.button.hotkey,
    menu_id: props.button.menuId
  });

  return (
    <button
      type="button"
      class="choice-button"
      classList={{ selected: props.focused }}
      aria-describedby={choiceDescriptionId(props.button)}
      onClick={choose}
      onFocus={focus}
      onPointerEnter={focus}
    >
      <span>{props.button.label}</span>
      <Show when={props.focused}>
        <span class="sr-only"> selected</span>
      </Show>
      <Show when={props.button.description}>
        <span id={choiceDescriptionId(props.button)} class="choice-description">
          {props.button.description}
        </span>
      </Show>
    </button>
  );
}

function GameMenuPanel(props: {
  menu: GameMenu;
  send: (message: OutgoingMessage) => void;
}) {
  let listRef: HTMLOListElement | undefined;
  const visibleItems = () => props.menu.items.filter((item) => item.text);
  const choose = (item: GameMenuItem) => {
    for (const message of menuActivationMessages(props.menu, item)) {
      props.send(message);
    }
  };
  const focus = (item: GameMenuItem) => {
    if (item.selectable) {
      props.send({ msg: "menu_hover", hover: item.index, mouse: false });
    }
  };

  createEffect(() => {
    props.menu.lastHovered;
    props.menu.items.length;
    queueMicrotask(() => {
      const selected = listRef?.querySelector<HTMLElement>(".menu-item-button.selected");
      if (listRef && selected) {
        scrollChildIntoView(listRef, selected);
      }
    });
  });

  return (
    <section class="game-menu" aria-labelledby="active-menu-title">
      <h3 id="active-menu-title">{props.menu.title || "Game Menu"}</h3>
      <p class="status-line">
        Showing {visibleItems().length} of {props.menu.totalItems} rows. Standard Crawl menu keys still work.
      </p>
      <ol ref={(element) => { listRef = element; }} class="menu-list">
        <For each={visibleItems()}>
          {(item) => (
            <li classList={{ "menu-heading": item.level < 2 }}>
              <Show
                when={item.selectable}
                fallback={<span>{item.text}</span>}
              >
                <button
                  type="button"
                  class="menu-item-button"
                  classList={{ selected: item.index === props.menu.lastHovered }}
                  onFocus={() => focus(item)}
                  onPointerEnter={() => focus(item)}
                  onClick={() => choose(item)}
                >
                  <Show when={item.hotkeys.length > 0}>
                    <span class="sr-only">Hotkey {formatHotkeys(item.hotkeys)}. </span>
                  </Show>
                  <span>{item.text}</span>
                </button>
              </Show>
            </li>
          )}
        </For>
      </ol>
      <Show when={props.menu.more || props.menu.altMore}>
        <p class="status-line">{props.menu.more || props.menu.altMore}</p>
      </Show>
    </section>
  );
}

function InventoryPanel(props: {
  inventory: InventoryItem[];
  player: AccessibleGameState["player"];
  send: (message: OutgoingMessage) => void;
}) {
  const actionItems = () => props.inventory
    .filter((item) => item.actionPanelOrder !== null && item.actionPanelOrder >= 0)
    .sort((left, right) => (
      (left.actionPanelOrder ?? 0) - (right.actionPanelOrder ?? 0)
      || left.subType - right.subType
      || left.slot - right.slot
    ));

  return (
    <section class="inventory-panel panel" aria-labelledby="inventory-title">
      <div class="inventory-heading">
        <div>
          <h2 id="inventory-title">Inventory</h2>
          <p class="status-line">
            {props.inventory.length} item{props.inventory.length === 1 ? "" : "s"}
            <Show when={props.player?.quiver}>. Quiver: {props.player?.quiver}</Show>
          </p>
        </div>
        <button type="button" onClick={() => props.send({ msg: "main_menu_action" })}>
          Main menu
        </button>
      </div>

      <Show
        when={actionItems().length > 0}
        fallback={<p class="status-line">No quick actions are available yet. Press i for the full inventory menu.</p>}
      >
        <ul class="inventory-list" aria-label="Quick inventory actions">
          <For each={actionItems()}>
            {(item) => (
              <li classList={{ useless: item.useless }}>
                <div class="inventory-item-main">
                  <span class="inventory-letter">{item.letter}</span>
                  <span>{inventoryItemLabel(item, props.player)}</span>
                </div>
                <div class="inventory-actions">
                  <button
                    type="button"
                    onClick={() => props.send({ msg: "inv_item_action", slot: item.slot })}
                  >
                    {item.actionVerb || "Use"}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.send({ msg: "inv_item_describe", slot: item.slot })}
                  >
                    Describe
                  </button>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}

function inventoryItemLabel(item: InventoryItem, player: AccessibleGameState["player"]): string {
  const markers = [
    player?.weaponSlot === item.slot ? "wielded" : "",
    player?.offhandSlot === item.slot ? "offhand" : "",
    player?.quiverSlot === item.slot ? "quivered" : ""
  ].filter(Boolean);
  const quantity = item.quantityLabel && item.quantityLabel !== "1" ? `${item.quantityLabel} ` : "";
  return `${quantity}${item.name}${markers.length > 0 ? ` (${markers.join(", ")})` : ""}`;
}

function formatHotkeys(hotkeys: number[]): string {
  return hotkeys.map((hotkey) => hotkey >= 32 && hotkey <= 126
    ? String.fromCharCode(hotkey)
    : hotkey === 13 ? "Enter" : String(hotkey)
  ).join(", ");
}

function PlayerPanel(props: {
  player: NonNullable<AccessibleGameState["player"]>;
  inventory: InventoryItem[];
}) {
  const speciesGod = () => [props.player.species, props.player.god].filter(Boolean).join(" of ");
  const weapon = () => inventorySlotLabel(props.inventory, props.player.weaponSlot) || "Unarmed";
  const offhand = () => inventorySlotLabel(props.inventory, props.player.offhandSlot);
  const quiver = () => props.player.quiver || inventorySlotLabel(props.inventory, props.player.quiverSlot);

  return (
    <section class="webtiles-stats" aria-labelledby="player-title">
      <h2 id="player-title" class="sr-only">Player</h2>
      <div class="stats-titleline">
        <span>{props.player.name}</span>
        <Show when={props.player.job}> <span>{props.player.job}</span></Show>
      </div>
      <Show when={speciesGod()}>
        <div class="stats-species-god">{speciesGod()}</div>
      </Show>
      <div class="stats-line">
        <span class="stats-caption">HP:</span> <span>{props.player.hp}</span>
        <span class="stats-bar stats-hp-bar" aria-hidden="true"><span /></span>
      </div>
      <Show when={props.player.mp}>
        <div class="stats-line">
          <span class="stats-caption">Magic:</span> <span>{props.player.mp}</span>
          <span class="stats-bar stats-mp-bar" aria-hidden="true"><span /></span>
        </div>
      </Show>
      <div class="stats-columns">
        <div>
          <div><span class="stats-caption">AC:</span> {props.player.ac}</div>
          <div><span class="stats-caption">EV:</span> {props.player.ev}</div>
          <div><span class="stats-caption">SH:</span> {props.player.sh}</div>
          <div><span class="stats-caption">XL:</span> {props.player.xl} <span class="stats-caption">Next:</span> {props.player.progress}%</div>
        </div>
        <div>
          <div><span class="stats-caption">Str:</span> {props.player.str}</div>
          <div><span class="stats-caption">Int:</span> {props.player.int}</div>
          <div><span class="stats-caption">Dex:</span> {props.player.dex}</div>
          <div><span class="stats-caption">Place:</span> {props.player.place}</div>
          <div><span class="stats-caption">Turn:</span> {props.player.turn}</div>
        </div>
      </div>
      <div class="stats-equipment"><span class="stats-caption">{slotLetter(props.player.weaponSlot)})</span> {weapon()}</div>
      <Show when={offhand()}>
        <div class="stats-equipment"><span class="stats-caption">{slotLetter(props.player.offhandSlot)})</span> {offhand()}</div>
      </Show>
      <Show when={quiver()}>
        <div class="stats-equipment"><span class="stats-caption">Q:</span> {quiver()}</div>
      </Show>
    </section>
  );
}

function inventorySlotLabel(inventory: InventoryItem[], slot: number | null): string {
  if (slot === null || slot < 0) {
    return "";
  }
  return inventory.find((item) => item.slot === slot)?.name ?? "";
}

function slotLetter(slot: number | null): string {
  if (slot === null || slot < 0) {
    return "-";
  }
  return slot < 26
    ? String.fromCharCode("a".charCodeAt(0) + slot)
    : String.fromCharCode("A".charCodeAt(0) + slot - 26);
}

function GameTextAreas(props: {
  textAreas: AccessibleGameState["textAreas"];
  activeCrtMenuTag: string | null;
}) {
  const entries = () => Object.entries(props.textAreas)
    .filter(([, lines]) => Object.keys(lines).length > 0)
    .filter(([id]) => id !== "menu_txt" || props.activeCrtMenuTag !== null)
    .sort(([left], [right]) => left.localeCompare(right));

  return (
    <Show when={entries().length > 0}>
      <div class="text-areas">
        <For each={entries()}>
          {([id, lines]) => (
            <section class="text-area" aria-labelledby={textAreaHeadingId(id)}>
              <h3 id={textAreaHeadingId(id)}>{textAreaLabel(id)}</h3>
              <pre>{textAreaToString(lines)}</pre>
            </section>
          )}
        </For>
      </div>
    </Show>
  );
}

function MessagesPanel(props: {
  state: AccessibleGameState;
  onOpenHistory: () => void;
}) {
  let messagesRef: HTMLDivElement | undefined;
  const recentMessages = () => props.state.messages.slice(-8);

  createEffect(() => {
    props.state.messages.length;
    props.state.morePrompt;
    queueMicrotask(() => {
      if (messagesRef) {
        messagesRef.scrollTop = messagesRef.scrollHeight;
      }
    });
  });

  return (
    <section class="panel" aria-labelledby="messages-title">
      <div class="messages-heading">
        <div>
          <h2 id="messages-title">Messages</h2>
          <p class="status-line">{props.state.messages.length} messages in history</p>
        </div>
        <button type="button" onClick={props.onOpenHistory}>Open history</button>
      </div>
      <Show when={props.state.morePrompt}>
        <p role="status">{props.state.morePrompt}</p>
      </Show>
      <div
        ref={(element) => { messagesRef = element; }}
        class="messages"
        role="log"
        aria-live="off"
        aria-relevant="additions"
        aria-label="Recent messages"
      >
        <For each={recentMessages()}>
          {(message) => <p class="message">{message.text}</p>}
        </For>
      </div>
    </section>
  );
}

function MessageHistoryDialog(props: {
  messages: AccessibleGameState["messages"];
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
}) {
  let searchRef: HTMLInputElement | undefined;
  const normalizedQuery = () => props.query.trim().toLowerCase();
  const filteredMessages = createMemo(() => {
    const query = normalizedQuery();
    const messages = query
      ? props.messages.filter((message) => message.text.toLowerCase().includes(query))
      : props.messages;
    return [...messages].reverse();
  });

  createEffect(() => {
    queueMicrotask(() => searchRef?.focus());
  });

  return (
    <section
      class="history-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-title"
      aria-describedby="history-summary"
    >
      <div class="history-card panel">
        <div class="history-heading">
          <div>
            <h2 id="history-title">Message History</h2>
            <p id="history-summary" class="status-line">
              Showing {filteredMessages().length} of {props.messages.length} messages, newest first.
            </p>
          </div>
          <button type="button" onClick={props.onClose}>Close history</button>
        </div>

        <div class="history-search">
          <label for="history-search">Search message history</label>
          <input
            ref={(element) => { searchRef = element; }}
            id="history-search"
            type="search"
            autocomplete="off"
            value={props.query}
            onInput={(event) => props.setQuery(event.currentTarget.value)}
          />
        </div>

        <div class="history-list-frame" tabindex="0" role="region" aria-label="Scrollable message history">
          <Show
            when={filteredMessages().length > 0}
            fallback={<p class="status-line">No messages match this search.</p>}
          >
            <ol class="history-list">
              <For each={filteredMessages()}>
                {(message) => (
                  <li>
                    <span class="history-message-number">#{message.id}</span>
                    <span>{message.text}</span>
                  </li>
                )}
              </For>
            </ol>
          </Show>
        </div>
      </div>
    </section>
  );
}

function RunningGamesPanel(props: {
  state: AccessibleGameState;
  send: (message: OutgoingMessage) => void;
}) {
  return (
    <section class="panel" aria-labelledby="lobby-title">
      <h2 id="lobby-title">Running Games</h2>
      <Show when={props.state.lobbyEntries.length > 0} fallback={<p class="status-line">No running games listed.</p>}>
        <table>
          <thead>
            <tr>
              <th scope="col">Player</th>
              <th scope="col">Game</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.state.lobbyEntries}>
              {(entry) => (
                <tr>
                  <td>{entry.username}</td>
                  <td>{entry.gameId}</td>
                  <td>{entry.summary}</td>
                  <td>
                    <button type="button" onClick={() => props.send({ msg: "watch", username: entry.username })}>
                      Watch
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </section>
  );
}

function tileMapLabel(state: AccessibleGameState): string {
  const player = state.player;
  const location = player?.place ? ` at ${player.place}` : "";
  const cursor = state.activeCursor ? ` Cursor at ${state.activeCursor.x}, ${state.activeCursor.y}.` : "";
  return `Dungeon tile map centered on ${state.mapCenter.x}, ${state.mapCenter.y}${location}.${cursor}`;
}

function textAreaHeadingId(id: string): string {
  return `text-area-${id.replace(/[^a-z0-9_-]+/gi, "-")}`;
}

function choiceDescriptionId(button: GameUiButton): string {
  return `choice-${button.menuId}-${button.hotkey}`.replace(/[^a-z0-9_-]+/gi, "-");
}

function textAreaLabel(id: string): string {
  const labels: Record<string, string> = {
    crt: "Main Game View",
    map: "Map",
    menu_txt: "Text Menu",
    message: "Message Area",
    messages: "Messages"
  };
  return labels[id] ?? `Text Area ${id}`;
}

function textAreaToString(lines: Record<string, string>): string {
  return Object.entries(lines)
    .sort(([left], [right]) => compareLineNumbers(left, right))
    .map(([, line]) => line)
    .join("\n");
}

function compareLineNumbers(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    return left.localeCompare(right);
  }
  return leftNumber - rightNumber;
}

function AuthPanel(props: {
  mode: "login" | "register";
  setMode: (mode: "login" | "register") => void;
  username: string;
  password: string;
  repeatPassword: string;
  email: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setRepeatPassword: (value: string) => void;
  setEmail: (value: string) => void;
  onLogin: (event: SubmitEvent) => void;
  onRegister: (event: SubmitEvent) => void;
}) {
  return (
    <section class="panel" aria-labelledby="auth-title">
      <h2 id="auth-title">{props.mode === "login" ? "Login" : "Register"}</h2>
      <div class="inline-actions" role="group" aria-label="Account action">
        <button type="button" aria-pressed={props.mode === "login"} onClick={() => props.setMode("login")}>Login</button>
        <button type="button" aria-pressed={props.mode === "register"} onClick={() => props.setMode("register")}>Register</button>
      </div>
      <Show
        when={props.mode === "register"}
        fallback={<LoginForm {...props} />}
      >
        <RegisterForm {...props} />
      </Show>
    </section>
  );
}

function LoginForm(props: {
  username: string;
  password: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  onLogin: (event: SubmitEvent) => void;
}) {
  return (
    <form class="stack" onSubmit={props.onLogin}>
      <div>
        <label for="username">Username</label>
        <input id="username" autocomplete="username" value={props.username} onInput={(event) => props.setUsername(event.currentTarget.value)} />
      </div>
      <div>
        <label for="password">Password</label>
        <input id="password" type="password" autocomplete="current-password" value={props.password} onInput={(event) => props.setPassword(event.currentTarget.value)} />
      </div>
      <button type="submit">Log in</button>
    </form>
  );
}

function RegisterForm(props: {
  username: string;
  password: string;
  repeatPassword: string;
  email: string;
  setUsername: (value: string) => void;
  setPassword: (value: string) => void;
  setRepeatPassword: (value: string) => void;
  setEmail: (value: string) => void;
  onRegister: (event: SubmitEvent) => void;
}) {
  return (
    <form class="stack" onSubmit={props.onRegister}>
      <div>
        <label for="reg-username">Username</label>
        <input id="reg-username" autocomplete="username" value={props.username} onInput={(event) => props.setUsername(event.currentTarget.value)} />
      </div>
      <div>
        <label for="reg-password">Password</label>
        <input id="reg-password" type="password" autocomplete="new-password" value={props.password} onInput={(event) => props.setPassword(event.currentTarget.value)} />
      </div>
      <div>
        <label for="reg-repeat-password">Repeat password</label>
        <input id="reg-repeat-password" type="password" autocomplete="new-password" value={props.repeatPassword} onInput={(event) => props.setRepeatPassword(event.currentTarget.value)} />
      </div>
      <div>
        <label for="reg-email">Email address</label>
        <input id="reg-email" type="email" autocomplete="email" value={props.email} onInput={(event) => props.setEmail(event.currentTarget.value)} />
      </div>
      <p class="status-line">Email is optional, but password recovery will not work without it.</p>
      <button type="submit">Create account</button>
    </form>
  );
}

function LiveRegion(props: { message: string }) {
  return (
    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {props.message}
    </div>
  );
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || target instanceof HTMLSelectElement
    || target.isContentEditable;
}

function isButtonActivation(event: KeyboardEvent): boolean {
  return event.target instanceof HTMLButtonElement && (event.key === "Enter" || event.key === " ");
}

function isNativeControlActivation(event: KeyboardEvent): boolean {
  if (!(event.target instanceof HTMLElement)) {
    return false;
  }

  const control = event.target.closest("button,a,[role='button'],[role='link']");
  if (!control) {
    return false;
  }

  return event.key === "Enter" || event.key === " ";
}

function gameUiHotkeyCode(event: KeyboardEvent, panels: GameUiPanelData[]): number | null {
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return null;
  }

  const keycode = utf8FromKeyValue(event.key);
  if (keycode === 0) {
    return null;
  }

  const topPanel = panels.at(-1);
  if (!topPanel) {
    return null;
  }

  for (const group of topPanel.groups) {
    if (group.buttons.some((button) => button.hotkey === keycode)) {
      return keycode;
    }
  }
  return null;
}

function utf8FromKeyValue(key: string): number {
  if (key.length === 1) {
    return key.charCodeAt(0);
  }
  switch (key) {
    case "Tab":
      return 9;
    case "Enter":
      return 13;
    case "Escape":
      return 27;
    default:
      return 0;
  }
}
