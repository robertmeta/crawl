import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";

import { crawlKeyCode } from "../protocol/keymap";
import type { OutgoingMessage } from "../protocol/messages";
import { connectCrawlSocket, type CrawlSocket } from "../protocol/socket";
import {
  createAccessibleGameState,
  type AccessibleGameState,
  type GameUiButton,
  type GameUiPanel as GameUiPanelData
} from "../state/game-state";
import { createTileRenderer, type TileRenderer } from "../tiles/tile-renderer";

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
  let gameInputRef: HTMLDivElement | undefined;

  const send = (message: OutgoingMessage) => socket()?.send(message);
  const inGameView = () => state.activeLayer === "game" || state.isInGame;

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
      queueMicrotask(() => gameInputRef?.focus());
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

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!state.isInGame || isTextInput(event.target)) {
      return;
    }

    const keycode = crawlKeyCode(event);
    if (keycode !== undefined) {
      event.preventDefault();
      send({ msg: "key", keycode });
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (!state.isInGame || isTextInput(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (event.key.length === 1) {
      event.preventDefault();
      if (event.key === "{") {
        send({ msg: "input", data: [event.key.charCodeAt(0)] });
      } else {
        send({ msg: "input", text: event.key });
      }
    }
  };

  return (
    <div class="app-shell">
      <LiveRegion message={state.lastAnnouncement} />
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

      <main class="main" aria-label="WebTiles client">
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
            setGameInputRef={(element) => { gameInputRef = element; }}
            onKeyDown={handleKeyDown}
            onKeyPress={handleKeyPress}
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

function GamePanel(props: {
  state: AccessibleGameState;
  send: (message: OutgoingMessage) => void;
  setGameInputRef: (element: HTMLDivElement) => void;
  onKeyDown: (event: KeyboardEvent) => void;
  onKeyPress: (event: KeyboardEvent) => void;
}) {
  return (
    <>
      <section class="panel game-panel" aria-labelledby="game-title">
        <div class="game-heading">
          <div>
            <h2 id="game-title">Game</h2>
            <p id="game-keyboard-help" class="status-line">
              Focus the game input region to send Crawl keyboard commands.
            </p>
          </div>
          <button type="button" onClick={() => props.send({ msg: "go_lobby" })}>
            End game and return to lobby
          </button>
        </div>

        <div
          ref={props.setGameInputRef}
          class="game-input"
          tabindex="0"
          role="group"
          aria-label="Game keyboard input"
          aria-describedby="game-keyboard-help"
          onKeyDown={props.onKeyDown}
          onKeyPress={props.onKeyPress}
        >
          <p class="status-line">
            Keyboard input is active when this region has focus.
          </p>
        </div>
      </section>

      <TileMapPanel state={props.state} />

      <section class="panel" aria-labelledby="game-screen-title">
        <h2 id="game-screen-title">Game Interface</h2>
        <Show
          when={props.state.uiStack.at(-1)}
          fallback={<GameTextAreas textAreas={props.state.textAreas} />}
        >
          {(panel) => <GameUiPanel panel={panel()} send={props.send} />}
        </Show>
      </section>

      <Show when={props.state.player}>
        {(player) => <PlayerPanel player={player()} />}
      </Show>

      <MessagesPanel state={props.state} />
    </>
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
    if (!nextRenderer || !canvas || !hasMap()) {
      return;
    }
    nextRenderer.draw(canvas, props.state.mapCells, props.state.mapCenter, revision);
  });

  return (
    <section class="panel tile-map-panel" aria-labelledby="tile-map-title">
      <h2 id="tile-map-title">Tile Map</h2>
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

function PlayerPanel(props: { player: NonNullable<AccessibleGameState["player"]> }) {
  return (
    <section class="panel" aria-labelledby="player-title">
      <h2 id="player-title">Player</h2>
      <dl class="player-summary">
        <Show when={props.player.name}>
          <dt>Name</dt>
          <dd>{props.player.name}</dd>
        </Show>
        <Show when={props.player.species}>
          <dt>Species</dt>
          <dd>{props.player.species}</dd>
        </Show>
        <Show when={props.player.job}>
          <dt>Title</dt>
          <dd>{props.player.job}</dd>
        </Show>
        <Show when={props.player.place}>
          <dt>Place</dt>
          <dd>{props.player.place}</dd>
        </Show>
        <Show when={props.player.hp}>
          <dt>HP</dt>
          <dd>{props.player.hp}</dd>
        </Show>
        <Show when={props.player.mp}>
          <dt>MP</dt>
          <dd>{props.player.mp}</dd>
        </Show>
        <Show when={props.player.xl}>
          <dt>XL</dt>
          <dd>{props.player.xl}</dd>
        </Show>
        <Show when={props.player.turn}>
          <dt>Turn</dt>
          <dd>{props.player.turn}</dd>
        </Show>
      </dl>
    </section>
  );
}

function GameTextAreas(props: { textAreas: AccessibleGameState["textAreas"] }) {
  const entries = () => Object.entries(props.textAreas)
    .filter(([, lines]) => Object.keys(lines).length > 0)
    .sort(([left], [right]) => left.localeCompare(right));

  return (
    <Show when={entries().length > 0} fallback={<p class="status-line">No active text overlay.</p>}>
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

function MessagesPanel(props: { state: AccessibleGameState }) {
  return (
    <section class="panel" aria-labelledby="messages-title">
      <h2 id="messages-title">Messages</h2>
      <Show when={props.state.morePrompt}>
        <p role="status">{props.state.morePrompt}</p>
      </Show>
      <div class="messages" role="log" aria-live="off" aria-relevant="additions">
        <For each={props.state.messages}>
          {(message) => <p class="message">{message.text}</p>}
        </For>
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
  return `Dungeon tile map centered on ${state.mapCenter.x}, ${state.mapCenter.y}${location}.`;
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
