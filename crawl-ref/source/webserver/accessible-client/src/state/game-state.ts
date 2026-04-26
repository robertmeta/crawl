import { createStore, produce, type SetStoreFunction } from "solid-js/store";

import { parseGameLinks, type GameLink } from "../protocol/game-links";
import type { CrawlMessage } from "../protocol/messages";

export type LobbyEntry = {
  id: string;
  username: string;
  gameId: string;
  summary: string;
};

export type GameMessage = {
  id: number;
  text: string;
};

export type RcFile = {
  gameId: string;
  contents: string;
};

export type InventoryItem = {
  slot: number;
  letter: string;
  name: string;
  quantity: number;
  quantityLabel: string;
  colour: number | null;
  actionPanelOrder: number | null;
  actionVerb: string;
  subType: number;
  tile: unknown;
  useless: boolean;
  raw: Record<string, unknown>;
};

export type StaleProcessPrompt = {
  game: string;
  timeout: number;
};

export type TextInputPrompt = {
  source: "init_input" | "title_prompt";
  type: string;
  tag: string;
  prompt: string;
  value: string;
  maxLength: number | null;
  selectOnOpen: boolean;
};

export type GameUiButton = {
  label: string;
  description: string;
  hotkey: number;
  menuId: string;
  x: number;
  y: number;
};

export type GameUiAction = {
  label: string;
  hotkey: number | null;
};

export type GameUiGroup = {
  id: string;
  label: string;
  buttons: GameUiButton[];
};

export type GameUiPanel = {
  generationId: number | null;
  type: string;
  title: string;
  prompt: string;
  body: string;
  actions: string;
  actionButtons: GameUiAction[];
  groups: GameUiGroup[];
  focusedHotkey: number | null;
};

export type GameMenuItem = {
  index: number;
  level: number;
  text: string;
  hotkeys: number[];
  selectable: boolean;
  colour: number | null;
};

export type GameMenu = {
  tag: string;
  type: string;
  title: string;
  flags: number;
  totalItems: number;
  lastHovered: number;
  firstVisible: number;
  lastVisible: number;
  more: string;
  altMore: string;
  items: GameMenuItem[];
};

export type PlayerSummary = {
  name: string;
  species: string;
  god: string;
  job: string;
  place: string;
  hp: string;
  mp: string;
  ac: string;
  ev: string;
  sh: string;
  str: string;
  int: string;
  dex: string;
  xl: string;
  progress: string;
  turn: string;
  gold: string;
  weaponSlot: number | null;
  offhandSlot: number | null;
  quiverSlot: number | null;
  quiver: string;
};

export type TileCell = {
  x: number;
  y: number;
  glyph: string;
  colour: number | null;
  feature: number | null;
  mapFeature: number | null;
  monster: Record<string, unknown> | null;
  t: Record<string, unknown> | null;
};

export type MapBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type MapPoint = {
  x: number;
  y: number;
};

export type BackendMessageLogEntry = {
  id: number;
  msg: string;
  handled: boolean;
  keys: string[];
  summary: string;
};

export type GameCursorName = "mouse" | "tutorial" | "map";

export type GameCursor = MapPoint & {
  type: GameCursorName;
};

export type GameCursors = Record<GameCursorName, MapPoint | null>;

type HostileSnapshot = {
  key: string;
  name: string;
  position: MapPoint;
  distance: number;
  threat: number | null;
};

export type AccessibleGameState = {
  connectionStatus: string;
  errors: string[];
  backendMessages: BackendMessageLogEntry[];
  backendMessageCounts: Record<string, number>;
  lastUnhandledMessage: BackendMessageLogEntry | null;
  staleProcess: StaleProcessPrompt | null;
  forceTerminatePrompt: StaleProcessPrompt | null;
  textInputPrompt: TextInputPrompt | null;
  currentUser: string | null;
  isAdmin: boolean;
  isInGame: boolean;
  activeLayer: string;
  uiState: number | null;
  inputMode: number | null;
  modeLabel: string;
  cursors: GameCursors;
  activeCursor: GameCursor | null;
  cursorRevision: number;
  gameVersion: string | null;
  gameLinks: GameLink[];
  lobbyEntries: LobbyEntry[];
  messages: GameMessage[];
  morePrompt: string | null;
  textAreas: Record<string, Record<string, string>>;
  uiStack: GameUiPanel[];
  activeMenu: GameMenu | null;
  activeCrtMenuTag: string | null;
  menuStack: GameMenu[];
  inventory: InventoryItem[];
  player: PlayerSummary | null;
  mapCells: Record<string, TileCell>;
  mapBounds: MapBounds | null;
  mapCenter: MapPoint;
  playerPosition: MapPoint | null;
  mapRevision: number;
  rcFile: RcFile | null;
  lastAnnouncement: string;
};

function createInitialState(): AccessibleGameState {
  return {
    connectionStatus: "Connecting",
    errors: [],
    backendMessages: [],
    backendMessageCounts: {},
    lastUnhandledMessage: null,
    staleProcess: null,
    forceTerminatePrompt: null,
    textInputPrompt: null,
    currentUser: null,
    isAdmin: false,
    isInGame: false,
    activeLayer: "lobby",
    uiState: null,
    inputMode: null,
    modeLabel: "Lobby",
    cursors: {
      mouse: null,
      tutorial: null,
      map: null
    },
    activeCursor: null,
    cursorRevision: 0,
    gameVersion: null,
    gameLinks: [],
    lobbyEntries: [],
    messages: [],
    morePrompt: null,
    textAreas: {},
    uiStack: [],
    activeMenu: null,
    activeCrtMenuTag: null,
    menuStack: [],
    inventory: [],
    player: null,
    mapCells: {},
    mapBounds: null,
    mapCenter: { x: 0, y: 0 },
    playerPosition: null,
    mapRevision: 0,
    rcFile: null,
    lastAnnouncement: ""
  };
}

let nextMessageId = 1;
let nextBackendMessageId = 1;

const MAX_BACKEND_MESSAGES = 250;
const MENU_ARROWS_SELECT = 0x40000;
const HANDLED_BACKEND_MESSAGES = new Set([
  "admin_log",
  "admin_pw_reset_done",
  "attach",
  "auth_error",
  "change_email_done",
  "change_email_fail",
  "change_password_done",
  "change_password_fail",
  "chat",
  "client_path",
  "close",
  "close_all_menus",
  "close_input",
  "close_menu",
  "cursor",
  "delay",
  "exit_reason",
  "flush_messages",
  "force_terminate?",
  "game_client",
  "game_ended",
  "game_started",
  "go_admin",
  "go_lobby",
  "html",
  "init_input",
  "input_mode",
  "layout",
  "layer",
  "lobby_clear",
  "lobby_complete",
  "lobby_entry",
  "lobby_remove",
  "login_cookie",
  "login_fail",
  "login_required",
  "login_success",
  "logout",
  "map",
  "menu",
  "menu_scroll",
  "more",
  "msgs",
  "note",
  "options",
  "ping",
  "player",
  "rcfile_contents",
  "register_fail",
  "reload_url",
  "server_announcement",
  "set_game_links",
  "set_option",
  "spectator_joined",
  "stale_processes",
  "start_change_email",
  "start_change_password",
  "super_hide_chat",
  "text_cursor",
  "title_prompt",
  "toggle_chat",
  "txt",
  "ui-push",
  "ui-pop",
  "ui-stack",
  "ui-state",
  "ui_cutoff",
  "ui_state",
  "update_input",
  "update_menu",
  "update_menu_items",
  "update_spectators",
  "version",
  "watching_started"
]);

export function createAccessibleGameState() {
  const [state, setState] = createStore(createInitialState());
  let lastAnnouncedCursorKey: string | null = null;
  let pendingCrawlAnnouncement: string | null = null;
  let currentPlayerPosition: MapPoint | null = null;
  let previousPlayerPosition: MapPoint | null = null;
  let playerMovedSinceLastMap = false;
  let lastAnnouncedPlayerTerrain: string | null = null;
  let lastAnnouncedNearbyContext: string | null = null;
  let hostileSnapshots = new Map<string, HostileSnapshot>();

  const setStatus = (status: string) => {
    setState("connectionStatus", status);
  };

  const addError = (error: string) => {
    setState("errors", (errors) => [...errors, error]);
    setState("lastAnnouncement", error);
  };

  const announceMenuSelection = (menu: GameMenu | null) => {
    const announcement = menu ? describeSelectedMenuItem(menu) : "";
    if (announcement) {
      setState("lastAnnouncement", announcement);
    }
  };

  const clearTextArea = (id: string) => {
    setState("textAreas", produce((areas) => {
      delete areas[id];
    }));
  };

  const applyMessage = (message: CrawlMessage) => {
    recordBackendMessage(message, setState);

    switch (message.msg) {
      case "ping":
        break;
      case "login_success":
        setState("currentUser", stringField(message, "username", "unknown"));
        setState("isAdmin", Boolean(message.admin));
        setState("lastAnnouncement", `Logged in as ${stringField(message, "username", "unknown")}.`);
        break;
      case "login_fail":
      case "auth_error":
      case "register_fail":
        addError(stringField(message, "reason", "Login failed."));
        break;
      case "logout":
        setState("currentUser", null);
        setState("isAdmin", false);
        setState("isInGame", false);
        setState("lastAnnouncement", stringField(message, "reason", "Logged out."));
        break;
      case "set_game_links":
        setState("gameLinks", parseGameLinks(stringField(message, "content")));
        break;
      case "lobby_clear":
        setState("lobbyEntries", []);
        break;
      case "lobby_entry":
        setState("lobbyEntries", (entries) => {
          const nextEntry = lobbyEntryFromMessage(message);
          return [...entries.filter((entry) => entry.id !== nextEntry.id), nextEntry]
            .sort((a, b) => a.username.localeCompare(b.username));
        });
        break;
      case "lobby_remove":
        setState("lobbyEntries", (entries) => entries.filter((entry) => entry.id !== stringField(message, "id")));
        break;
      case "game_client":
        setState("gameVersion", stringField(message, "version"));
        setState("activeLayer", "game");
        setState("uiStack", []);
        setState("menuStack", []);
        setState("activeMenu", null);
        setState("activeCrtMenuTag", null);
        setState("textInputPrompt", null);
        setState("inventory", []);
        setState("textAreas", {});
        setState("mapCells", {});
        setState("mapBounds", null);
        setState("mapCenter", { x: 0, y: 0 });
        setState("playerPosition", null);
        setState("mapRevision", (revision) => revision + 1);
        setState("uiState", null);
        setState("inputMode", null);
        setState("modeLabel", "Game");
        setState("cursors", {
          mouse: null,
          tutorial: null,
          map: null
        });
        setState("activeCursor", null);
        setState("cursorRevision", (revision) => revision + 1);
        lastAnnouncedCursorKey = null;
        pendingCrawlAnnouncement = null;
        currentPlayerPosition = null;
        previousPlayerPosition = null;
        playerMovedSinceLastMap = false;
        lastAnnouncedPlayerTerrain = null;
        lastAnnouncedNearbyContext = null;
        hostileSnapshots = new Map();
        break;
      case "game_started":
        setState("isInGame", true);
        setState("activeLayer", "game");
        if (!state.staleProcess && !state.forceTerminatePrompt) {
          setState("lastAnnouncement", "Game started.");
        }
        break;
      case "game_ended":
        setState("isInGame", false);
        setState("lastAnnouncement", stringField(message, "message", stringField(message, "reason", "Game ended.")));
        break;
      case "go_lobby":
        setState("activeLayer", "lobby");
        setState("isInGame", false);
        setState("uiStack", []);
        setState("menuStack", []);
        setState("activeMenu", null);
        setState("activeCrtMenuTag", null);
        setState("textInputPrompt", null);
        break;
      case "rcfile_contents":
        setState("rcFile", {
          gameId: stringField(message, "game_id"),
          contents: stringField(message, "contents")
        });
        setState("lastAnnouncement", `Editing rc file for ${stringField(message, "game_id")}.`);
        break;
      case "init_input": {
        const prompt = textInputPromptFromMessage(message, "init_input");
        setState("textInputPrompt", prompt);
        setState("lastAnnouncement", prompt.prompt);
        break;
      }
      case "update_input":
        if (state.textInputPrompt) {
          setState("textInputPrompt", {
            ...state.textInputPrompt,
            value: stringField(message, "input_text", state.textInputPrompt.value),
            selectOnOpen: Boolean(message.select)
          });
        }
        break;
      case "close_input":
        setState("textInputPrompt", null);
        break;
      case "title_prompt":
        if (Boolean(message.close)) {
          setState("textInputPrompt", null);
          break;
        }
        if (Boolean(message.raw)) {
          setState("lastAnnouncement", "Raw key input mode.");
          break;
        }
        {
          const prompt = textInputPromptFromMessage(message, "title_prompt");
          setState("textInputPrompt", prompt);
          setState("lastAnnouncement", prompt.prompt);
        }
        break;
      case "msgs":
        if (numberField(message, "rollback") || numberField(message, "old_msgs")) {
          const removeCount = numberField(message, "rollback") || numberField(message, "old_msgs") || 0;
          setState("messages", (messages) => messages.slice(0, Math.max(0, messages.length - removeCount)));
        }
        if (isTextMessageArray(message.messages)) {
          const newMessages = message.messages;
          const spokenMessages = newMessages
            .map((item) => htmlToText(item.text))
            .filter(Boolean);
          setState("messages", (messages) => [
            ...messages,
            ...spokenMessages.map((text) => ({ id: nextMessageId++, text }))
          ].slice(-500));
          if (spokenMessages.length > 0) {
            pendingCrawlAnnouncement = spokenMessages.join(" ");
            setState("lastAnnouncement", pendingCrawlAnnouncement);
          }
        }
        setState("morePrompt", message.more ? stringField(message, "more_text", "--more--") : null);
        if (message.more) {
          pendingCrawlAnnouncement = combineAnnouncements(pendingCrawlAnnouncement, stringField(message, "more_text", "--more--"));
          setState("lastAnnouncement", pendingCrawlAnnouncement);
        }
        break;
      case "txt":
        setState("textAreas", produce((areas) => {
          const id = stringField(message, "id");
          const lines = recordField(message, "lines");
          const area = areas[id] || {};
          if (Boolean(message.clear)) {
            for (const line of Object.keys(area)) {
              if (!(line in lines)) {
                delete area[line];
              }
            }
          }
          for (const [line, content] of Object.entries(lines)) {
            area[line] = htmlToText(content, { preserveWhitespace: true });
          }
          areas[id] = area;
        }));
        break;
      case "ui-push": {
        const panel = uiPanelFromMessage(message);
        setState("uiStack", (stack) => [...stack, panel]);
        setState("activeMenu", null);
        setState("activeCrtMenuTag", null);
        setState("lastAnnouncement", panel.title || "Game menu opened.");
        break;
      }
      case "ui-pop":
        setState("uiStack", (stack) => stack.slice(0, -1));
        break;
      case "ui-stack":
        setState("uiStack", uiStackFromMessage(message));
        break;
      case "menu": {
        if (stringField(message, "type") === "crt") {
          setState("menuStack", []);
          setState("activeMenu", null);
          setState("activeCrtMenuTag", stringField(message, "tag", "menu_txt"));
          setState("uiStack", []);
          setState("lastAnnouncement", "Text menu opened.");
          break;
        }
        const nextMenu = gameMenuFromMessage(message);
        const nextStack = Boolean(message.replace)
          ? [...state.menuStack.slice(0, -1), nextMenu]
          : [...state.menuStack, nextMenu];
        setState("menuStack", nextStack);
        setState("activeMenu", nextMenu);
        setState("activeCrtMenuTag", null);
        setState("uiStack", []);
        setState("lastAnnouncement", describeMenuOpen(nextMenu));
        break;
      }
      case "update_menu": {
        const nextStack = updateTopMenu(state.menuStack, (menu) => updateMenuFromMessage(menu, message));
        setState("menuStack", nextStack);
        setState("activeMenu", nextStack.at(-1) ?? null);
        announceMenuSelection(nextStack.at(-1) ?? null);
        break;
      }
      case "update_menu_items": {
        const nextStack = updateTopMenu(state.menuStack, (menu) => updateMenuItemsFromMessage(menu, message));
        setState("menuStack", nextStack);
        setState("activeMenu", nextStack.at(-1) ?? null);
        announceMenuSelection(nextStack.at(-1) ?? null);
        break;
      }
      case "menu_scroll": {
        const nextStack = updateTopMenu(state.menuStack, (menu) => ({
          ...menu,
          firstVisible: numberField(message, "first") ?? menu.firstVisible,
          lastVisible: numberField(message, "last") ?? menu.lastVisible,
          lastHovered: numberField(message, "last_hovered") ?? numberField(message, "hover") ?? menu.lastHovered
        }));
        setState("menuStack", nextStack);
        setState("activeMenu", nextStack.at(-1) ?? null);
        announceMenuSelection(nextStack.at(-1) ?? null);
        break;
      }
      case "ui-state":
        setState("uiStack", produce((stack) => {
          const top = stack.at(-1);
          if (top) {
            top.focusedHotkey = numberField(message, "button_focus") ?? top.focusedHotkey;
          }
        }));
        break;
      case "ui_state": {
        const nextUiState = numberField(message, "state") ?? null;
        const previousMode = state.modeLabel;
        setState("uiState", nextUiState);
        setState("modeLabel", currentModeLabel(nextUiState, state.inputMode));
        lastAnnouncedCursorKey = null;
        const activeCursor = activeCursorFromState(state.cursors, nextUiState, state.inputMode);
        setState("activeCursor", activeCursor);
        setState("cursorRevision", (revision) => revision + 1);
        const nextMode = currentModeLabel(nextUiState, state.inputMode);
        if (nextMode !== previousMode) {
          setState("lastAnnouncement", `${nextMode} mode.`);
        }
        break;
      }
      case "input_mode": {
        const nextInputMode = numberField(message, "mode") ?? null;
        const previousMode = state.modeLabel;
        setState("inputMode", nextInputMode);
        setState("modeLabel", currentModeLabel(state.uiState, nextInputMode));
        lastAnnouncedCursorKey = null;
        const activeCursor = activeCursorFromState(state.cursors, state.uiState, nextInputMode);
        setState("activeCursor", activeCursor);
        setState("cursorRevision", (revision) => revision + 1);
        const nextMode = currentModeLabel(state.uiState, nextInputMode);
        if (nextMode !== previousMode && shouldAnnounceMode(nextInputMode, state.uiState)) {
          setState("lastAnnouncement", `${nextMode} mode.`);
        }
        break;
      }
      case "cursor": {
        const cursorName = cursorNameFromId(numberField(message, "id"));
        if (!cursorName) {
          break;
        }
        const cursorLocation = pointField(message, "loc");
        setState("cursors", cursorName, cursorLocation);
        const activeCursor = isActiveCursor(cursorName, state.uiState, state.inputMode)
          ? cursorLocation && { ...cursorLocation, type: cursorName }
          : activeCursorFromState({ ...state.cursors, [cursorName]: cursorLocation }, state.uiState, state.inputMode);
        setState("activeCursor", activeCursor);
        setState("cursorRevision", (revision) => revision + 1);
        if (activeCursor) {
          const key = cursorAnnouncementKey(activeCursor);
          if (key !== lastAnnouncedCursorKey) {
            setState("lastAnnouncement", describeCursorPosition(activeCursor, state.mapCells, state.playerPosition));
            lastAnnouncedCursorKey = key;
          }
        }
        break;
      }
      case "player":
        setState("inventory", mergeInventory(state.inventory, message.inv));
        setState("player", playerSummaryFromMessage(message, state.player));
        {
          const position = pointField(message, "pos");
          if (position) {
            const oldPosition = currentPlayerPosition;
            playerMovedSinceLastMap = oldPosition ? !samePoint(oldPosition, position) : false;
            previousPlayerPosition = playerMovedSinceLastMap && oldPosition ? { ...oldPosition } : null;
            currentPlayerPosition = { ...position };
            setState("mapCenter", position);
            setState("playerPosition", position);
          }
        }
        break;
      case "map": {
        const update = mapUpdateFromMessage(message, state.mapCells, state.mapBounds);
        const nextHostileSnapshots = hostileSnapshotsFromCells(update.cells, currentPlayerPosition);
        const newHostiles = currentPlayerPosition
          ? findNewHostiles(hostileSnapshots, nextHostileSnapshots)
          : [];
        const approachingHostiles = currentPlayerPosition && !playerMovedSinceLastMap && !pendingCrawlAnnouncement
          ? findApproachingHostiles(hostileSnapshots, nextHostileSnapshots)
          : [];
        hostileSnapshots = nextHostileSnapshots;
        setState("mapCells", update.cells);
        setState("mapBounds", update.bounds);
        const center = pointField(message, "vgrdc");
        if (center) {
          setState("mapCenter", center);
        }
        setState("mapRevision", (revision) => revision + 1);
        if (currentPlayerPosition && (newHostiles.length > 0 || approachingHostiles.length > 0)) {
          const tacticalAnnouncement = newHostiles.length > 0
            ? describeNewHostiles(newHostiles, currentPlayerPosition)
            : describeApproachingHostiles(approachingHostiles, currentPlayerPosition);
          setState("lastAnnouncement", combineAnnouncements(pendingCrawlAnnouncement, tacticalAnnouncement));
        } else if (currentPlayerPosition && playerMovedSinceLastMap && !pendingCrawlAnnouncement) {
          const movementAnnouncement = describeMovementAnnouncement(
            previousPlayerPosition,
            currentPlayerPosition,
            update.cells,
            lastAnnouncedPlayerTerrain,
            lastAnnouncedNearbyContext
          );
          lastAnnouncedPlayerTerrain = movementAnnouncement.terrain;
          lastAnnouncedNearbyContext = movementAnnouncement.nearbyContext;
          if (movementAnnouncement.text) {
            setState("lastAnnouncement", movementAnnouncement.text);
          }
        }
        pendingCrawlAnnouncement = null;
        playerMovedSinceLastMap = false;
        break;
      }
      case "stale_processes":
        setState("staleProcess", staleProcessPromptFromMessage(message));
        setState("lastAnnouncement", `Stale ${stringField(message, "game", "game")} process. Press any key to keep waiting.`);
        break;
      case "force_terminate?":
        setState("forceTerminatePrompt", staleProcessPromptFromMessage(message));
        setState("lastAnnouncement", "Could not stop a stale process gracefully. Press y to force termination, or any other key for no.");
        break;
      case "close_menu": {
        const nextStack = state.menuStack.slice(0, -1);
        setState("menuStack", nextStack);
        setState("activeMenu", nextStack.at(-1) ?? null);
        setState("activeCrtMenuTag", null);
        setState("textInputPrompt", null);
        clearTextArea("menu_txt");
        break;
      }
      case "close_all_menus":
        setState("menuStack", []);
        setState("activeMenu", null);
        setState("activeCrtMenuTag", null);
        setState("textInputPrompt", null);
        clearTextArea("menu_txt");
        break;
      case "layer":
        setState("activeLayer", stringField(message, "layer"));
        break;
      case "close":
        setStatus(message.reason ? `Closed: ${stringField(message, "reason")}` : "Closed");
        break;
      case "chat":
      case "html":
      case "layout":
      case "lobby_complete":
      case "login_cookie":
      case "login_required":
      case "options":
      case "server_announcement":
      case "set_option":
      case "text_cursor":
      case "ui_cutoff":
      case "update_spectators":
      case "version":
        break;
      default:
        break;
    }
  };

  return { state, setState, setStatus, addError, applyMessage };
}

function lobbyEntryFromMessage(message: CrawlMessage): LobbyEntry {
  const details = [
    stringField(message, "char"),
    stringField(message, "place"),
    message.turn ? `turn ${String(message.turn)}` : undefined,
    stringField(message, "god")
  ].filter(Boolean).join(", ");

  return {
    id: stringField(message, "id"),
    username: stringField(message, "username", "unknown"),
    gameId: stringField(message, "game_id", "unknown"),
    summary: details || "No status available"
  };
}

function staleProcessPromptFromMessage(message: CrawlMessage): StaleProcessPrompt {
  return {
    game: stringField(message, "game", "game"),
    timeout: numberField(message, "timeout") ?? 0
  };
}

function textInputPromptFromMessage(message: CrawlMessage, source: TextInputPrompt["source"]): TextInputPrompt {
  const prompt = htmlToText(stringField(message, "prompt"), { preserveWhitespace: true })
    || (source === "title_prompt" ? "Select what? (regex)" : "Input here. Escape cancels.");
  const prefill = stringField(message, "prefill");
  return {
    source,
    type: stringField(message, "type", source === "title_prompt" ? "menu" : "generic"),
    tag: stringField(message, "tag"),
    prompt,
    value: source === "init_input" ? prefill.trim() : "",
    maxLength: numberField(message, "maxlen") ?? null,
    selectOnOpen: Boolean(message.select_prefill)
  };
}

function uiStackFromMessage(message: CrawlMessage): GameUiPanel[] {
  const items = arrayField(message, "items");
  return items
    .filter((item): item is CrawlMessage => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .filter((item) => item.msg === "ui-push")
    .map(uiPanelFromMessage);
}

function uiPanelFromMessage(message: CrawlMessage): GameUiPanel {
  const rawBody = uiPanelBodyFromMessage(message);
  const spellset = spellsetTextFromValue(message.spellset);
  const body = rawBody.includes("SPELLSET_PLACEHOLDER")
    ? rawBody.replace("SPELLSET_PLACEHOLDER", spellset)
    : [rawBody, spellset].filter(Boolean).join("\n\n");
  const actions = htmlToText(stringField(message, "actions"), { preserveWhitespace: true });

  return {
    generationId: numberField(message, "generation_id") ?? null,
    type: stringField(message, "type", "unknown"),
    title: htmlToText(stringField(message, "title")),
    prompt: htmlToText(stringField(message, "prompt")),
    body,
    actions,
    actionButtons: uiActionsFromText(actions),
    groups: [
      uiGroupFromValue("Primary choices", message["main-items"]),
      uiGroupFromValue("Secondary choices", message["sub-items"])
    ].filter((group): group is GameUiGroup => Boolean(group && group.buttons.length > 0)),
    focusedHotkey: null
  };
}

function uiPanelBodyFromMessage(message: CrawlMessage): string {
  const fields = ["body", "footer", "text", "desc"];
  return fields
    .map((field) => htmlToText(stringField(message, field), { preserveWhitespace: true }))
    .filter(Boolean)
    .join("\n\n");
}

function spellsetTextFromValue(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((book) => {
      const source = recordFromUnknown(book);
      if (!source) {
        return "";
      }
      const label = htmlToText(stringFromUnknown(source.label), { preserveWhitespace: true });
      const spells = Array.isArray(source.spells)
        ? source.spells.map(spellTextFromValue).filter(Boolean)
        : [];
      return [label, ...spells].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function spellTextFromValue(value: unknown): string {
  const source = recordFromUnknown(value);
  if (!source) {
    return "";
  }

  const letter = htmlToText(stringFromUnknown(source.letter));
  const title = htmlToText(stringFromUnknown(source.title));
  const level = numberFromUnknown(source.level);
  const schools = htmlToText(stringFromUnknown(source.schools));
  const effect = htmlToText(stringFromUnknown(source.effect));
  const range = htmlToText(stringFromUnknown(source.range_string));
  const details = [
    level === undefined ? "" : `level ${level}`,
    schools,
    effect,
    range
  ].filter(Boolean).join(", ");
  const prefix = letter ? `${letter} - ` : "";
  return `${prefix}${title}${details ? ` (${details})` : ""}`.trim();
}

function uiActionsFromText(actions: string): GameUiAction[] {
  return actions
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((label) => {
      const hotkey = label.match(/\((.)\)/)?.[1] ?? null;
      return {
        label,
        hotkey: hotkey ? hotkey.charCodeAt(0) : null
      };
    });
}

function uiGroupFromValue(label: string, value: unknown): GameUiGroup | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const id = typeof source.menu_id === "string" ? source.menu_id : label.toLowerCase().replace(/\s+/g, "-");
  const buttons = Array.isArray(source.buttons)
    ? source.buttons.map((button) => uiButtonFromValue(id, button)).filter((button): button is GameUiButton => Boolean(button))
    : [];

  return { id, label, buttons };
}

function uiButtonFromValue(menuId: string, value: unknown): GameUiButton | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const labels = Array.isArray(source.labels)
    ? source.labels.filter((label): label is string => typeof label === "string")
    : [];
  const label = htmlToText(labels.join(" ") || stringFromUnknown(source.label));
  const hotkey = numberFromUnknown(source.hotkey);

  if (!label || hotkey === undefined) {
    return null;
  }

  return {
    label,
    description: htmlToText(stringFromUnknown(source.description)),
    hotkey,
    menuId,
    x: numberFromUnknown(source.x) ?? 0,
    y: numberFromUnknown(source.y) ?? 0
  };
}

function gameMenuFromMessage(message: CrawlMessage): GameMenu {
  const totalItems = numberField(message, "total_items") ?? arrayField(message, "items").length;
  const chunkStart = numberField(message, "chunk_start") ?? 0;
  const tag = stringField(message, "tag", "menu");
  const menu: GameMenu = {
    tag,
    type: stringField(message, "type", "menu"),
    title: menuTitleFromValue(message.title),
    flags: numberField(message, "flags") ?? 0,
    totalItems,
    lastHovered: numberField(message, "last_hovered") ?? -1,
    firstVisible: numberField(message, "first_visible") ?? 0,
    lastVisible: numberField(message, "last_visible") ?? Math.max(0, totalItems - 1),
    more: htmlToText(stringField(message, "more")),
    altMore: htmlToText(stringField(message, "alt_more")),
    items: []
  };
  return updateMenuItems(menu, chunkStart, arrayField(message, "items"));
}

function updateTopMenu(
  stack: GameMenu[],
  update: (menu: GameMenu) => GameMenu
): GameMenu[] {
  const top = stack.at(-1);
  if (!top) {
    return stack;
  }
  return [...stack.slice(0, -1), update(top)];
}

function updateMenuFromMessage(menu: GameMenu, message: CrawlMessage): GameMenu {
  return {
    ...menu,
    title: message.title === undefined ? menu.title : menuTitleFromValue(message.title),
    flags: numberField(message, "flags") ?? menu.flags,
    totalItems: numberField(message, "total_items") ?? menu.totalItems,
    lastHovered: numberField(message, "last_hovered") ?? menu.lastHovered,
    firstVisible: numberField(message, "first_visible") ?? menu.firstVisible,
    lastVisible: numberField(message, "last_visible") ?? menu.lastVisible,
    more: message.more === undefined ? menu.more : htmlToText(stringField(message, "more")),
    altMore: message.alt_more === undefined ? menu.altMore : htmlToText(stringField(message, "alt_more"))
  };
}

function updateMenuItemsFromMessage(menu: GameMenu, message: CrawlMessage): GameMenu {
  return updateMenuItems(menu, numberField(message, "chunk_start") ?? 0, arrayField(message, "items"));
}

function updateMenuItems(menu: GameMenu, chunkStart: number, items: unknown[]): GameMenu {
  const byIndex = new Map(menu.items.map((item) => [item.index, item]));
  for (const [offset, value] of items.entries()) {
    const index = chunkStart + offset;
    const item = gameMenuItemFromValue(value, index, menu.tag, menu.flags);
    if (item) {
      byIndex.set(index, item);
    }
  }
  return {
    ...menu,
    items: [...byIndex.values()].sort((a, b) => a.index - b.index)
  };
}

function describeMenuOpen(menu: GameMenu): string {
  const selected = describeSelectedMenuItem(menu);
  const title = menu.title || "Menu";
  return selected
    ? `${title} opened. ${selected}`
    : `${title} opened. ${menu.totalItems} rows.`;
}

function describeSelectedMenuItem(menu: GameMenu): string {
  const item = menu.items.find((item) => item.index === menu.lastHovered);
  if (!item?.text) {
    return "";
  }
  return `Selected ${item.text}.`;
}

function gameMenuItemFromValue(value: unknown, index: number, tag: string, flags: number): GameMenuItem | null {
  const raw = typeof value === "string" ? { text: value, level: 2 } : recordFromUnknown(value);
  if (!raw) {
    return null;
  }

  const level = numberFromUnknown(raw.level) ?? numberFromUnknown(raw.type) ?? 2;
  const hotkeys = Array.isArray(raw.hotkeys)
    ? raw.hotkeys.filter((hotkey): hotkey is number => typeof hotkey === "number")
    : [];
  const selectable = level === 2 && (
    (flags & MENU_ARROWS_SELECT) !== 0
    || tag === "use_item"
    || hotkeys.length > 0
  );
  return {
    index,
    level,
    text: htmlToText(stringFromUnknown(raw.text)),
    hotkeys,
    selectable,
    colour: numberFromUnknown(raw.colour) ?? null
  };
}

function menuTitleFromValue(value: unknown): string {
  if (typeof value === "string") {
    return htmlToText(value);
  }
  const record = recordFromUnknown(value);
  return record ? htmlToText(stringFromUnknown(record.text)) : "";
}

function recordBackendMessage(
  message: CrawlMessage,
  setState: SetStoreFunction<AccessibleGameState>
) {
  const msg = message.msg || "unknown";
  const entry: BackendMessageLogEntry = {
    id: nextBackendMessageId++,
    msg,
    handled: HANDLED_BACKEND_MESSAGES.has(msg),
    keys: Object.keys(message).filter((key) => key !== "msg").sort(),
    summary: summarizeBackendMessage(message)
  };

  setState("backendMessages", (messages) => [...messages, entry].slice(-MAX_BACKEND_MESSAGES));
  setState("backendMessageCounts", (counts) => ({
    ...counts,
    [msg]: (counts[msg] ?? 0) + 1
  }));
  if (!entry.handled) {
    setState("lastUnhandledMessage", entry);
  }
}

function summarizeBackendMessage(message: CrawlMessage): string {
  switch (message.msg) {
    case "cursor": {
      const id = numberField(message, "id");
      const loc = pointField(message, "loc");
      return loc ? `${cursorNameFromId(id) ?? `cursor ${id}`} at ${loc.x}, ${loc.y}` : `${cursorNameFromId(id) ?? `cursor ${id}`} cleared`;
    }
    case "game_client":
      return `version ${stringField(message, "version", "unknown")}; ${stringField(message, "content").length} html chars`;
    case "map": {
      const center = pointField(message, "vgrdc");
      const centerText = center ? ` centered ${center.x}, ${center.y}` : "";
      return `${arrayField(message, "cells").length} cells${centerText}`;
    }
    case "msgs": {
      if (isTextMessageArray(message.messages)) {
        const last = message.messages.at(-1);
        return last ? compactText(htmlToText(last.text)) : "empty message batch";
      }
      return "message update";
    }
    case "menu":
      return `${menuTitleFromValue(message.title) || stringField(message, "tag", "menu")} with ${numberField(message, "total_items") ?? arrayField(message, "items").length} rows`;
    case "update_menu_items":
      return `${arrayField(message, "items").length} menu rows from ${numberField(message, "chunk_start") ?? 0}`;
    case "player": {
      const pos = pointField(message, "pos");
      const inv = recordFromUnknown(message.inv);
      const invText = inv ? `; ${Object.keys(inv).length} inventory slots` : "";
      return pos ? `position ${pos.x}, ${pos.y}${invText}` : summarizeMessageFields(message);
    }
    default:
      return summarizeMessageFields(message);
  }
}

function summarizeMessageFields(message: CrawlMessage): string {
  return Object.entries(message)
    .filter(([key]) => key !== "msg")
    .slice(0, 6)
    .map(([key, value]) => `${key}: ${summarizeValue(value)}`)
    .join(", ");
}

function summarizeValue(value: unknown): string {
  if (typeof value === "string") {
    return compactText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).length} keys}`;
  }
  return value === null ? "null" : "";
}

function compactText(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}...` : compact;
}

function playerSummaryFromMessage(message: CrawlMessage, previous: PlayerSummary | null): PlayerSummary {
  const hp = pairText(message.hp, message.hp_max) || previous?.hp || "";
  const mp = pairText(message.mp, message.mp_max) || previous?.mp || "";

  return {
    name: stringField(message, "name", previous?.name ?? ""),
    species: stringField(message, "species_display_name", stringField(message, "species", previous?.species ?? "")),
    god: stringField(message, "god", previous?.god ?? ""),
    job: stringField(message, "title", previous?.job ?? ""),
    place: stringField(message, "place", previous?.place ?? ""),
    hp,
    mp,
    ac: textFromUnknown(message.ac) || previous?.ac || "",
    ev: textFromUnknown(message.ev) || previous?.ev || "",
    sh: textFromUnknown(message.sh) || previous?.sh || "",
    str: textFromUnknown(message.str) || previous?.str || "",
    int: textFromUnknown(message.int) || previous?.int || "",
    dex: textFromUnknown(message.dex) || previous?.dex || "",
    xl: textFromUnknown(message.xl) || previous?.xl || "",
    progress: textFromUnknown(message.progress) || previous?.progress || "",
    turn: textFromUnknown(message.turn) || previous?.turn || "",
    gold: textFromUnknown(message.gold) || previous?.gold || "",
    weaponSlot: numberFromUnknown(message.weapon_index) ?? previous?.weaponSlot ?? null,
    offhandSlot: numberFromUnknown(message.offhand_index) ?? previous?.offhandSlot ?? null,
    quiverSlot: numberFromUnknown(message.quiver_item) ?? previous?.quiverSlot ?? null,
    quiver: htmlToText(stringField(message, "quiver_desc", previous?.quiver ?? ""))
  };
}

function mergeInventory(previous: InventoryItem[], update: unknown): InventoryItem[] {
  const updates = recordFromUnknown(update);
  if (!updates) {
    return previous;
  }

  const bySlot = new Map(previous.map((item) => [item.slot, item]));
  for (const [slotText, value] of Object.entries(updates)) {
    const slot = Number(slotText);
    const itemUpdate = recordFromUnknown(value);
    if (!Number.isFinite(slot) || !itemUpdate) {
      continue;
    }

    const raw = { ...(bySlot.get(slot)?.raw ?? {}), ...itemUpdate };
    const name = htmlToText(stringFromUnknown(raw.name));
    const quantity = numberFromUnknown(raw.quantity) ?? 0;
    if (!name || quantity <= 0) {
      bySlot.delete(slot);
      continue;
    }

    bySlot.set(slot, inventoryItemFromRecord(slot, raw));
  }

  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

function inventoryItemFromRecord(slot: number, raw: Record<string, unknown>): InventoryItem {
  const qtyField = stringFromUnknown(raw.qty_field);
  const quantity = numberFromUnknown(raw.quantity) ?? 0;
  return {
    slot,
    letter: inventorySlotLetter(slot),
    name: htmlToText(stringFromUnknown(raw.name)),
    quantity,
    quantityLabel: qtyField ? textFromUnknown(raw[qtyField]) : quantity > 1 ? String(quantity) : "",
    colour: numberFromUnknown(raw.col) ?? null,
    actionPanelOrder: numberFromUnknown(raw.action_panel_order) ?? null,
    actionVerb: stringFromUnknown(raw.action_verb),
    subType: numberFromUnknown(raw.sub_type) ?? 0,
    tile: raw.tile,
    useless: Boolean(raw.useless),
    raw
  };
}

function inventorySlotLetter(index: number): string {
  if (index === -1) {
    return "-";
  }
  if (index < 26) {
    return String.fromCharCode("a".charCodeAt(0) + index);
  }
  return String.fromCharCode("A".charCodeAt(0) + index - 26);
}

function pairText(left: unknown, right: unknown): string {
  const leftText = textFromUnknown(left);
  const rightText = textFromUnknown(right);
  if (!leftText && !rightText) {
    return "";
  }
  return [leftText, rightText].filter(Boolean).join("/");
}

function mapUpdateFromMessage(
  message: CrawlMessage,
  currentCells: Record<string, TileCell>,
  currentBounds: MapBounds | null
): { cells: Record<string, TileCell>; bounds: MapBounds | null } {
  const cells = Boolean(message.clear) ? {} : { ...currentCells };
  let bounds = Boolean(message.clear) ? null : currentBounds && { ...currentBounds };
  let lastX = 0;
  let lastY = 0;

  for (const value of arrayField(message, "cells")) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      continue;
    }

    const raw = value as Record<string, unknown>;
    const x = numberFromUnknown(raw.x) ?? lastX + 1;
    const y = numberFromUnknown(raw.y) ?? lastY;
    lastX = x;
    lastY = y;

    const key = mapKey(x, y);
    const previous = cells[key];
    const nextT = mergeTilePayload(previous?.t ?? null, raw.t);
    const nextMonster = raw.mon === null ? null : mergeTilePayload(previous?.monster ?? null, raw.mon);
    cells[key] = {
      x,
      y,
      glyph: stringFromUnknown(raw.g) || previous?.glyph || " ",
      colour: numberFromUnknown(raw.col) ?? previous?.colour ?? null,
      feature: numberFromUnknown(raw.f) ?? previous?.feature ?? null,
      mapFeature: numberFromUnknown(raw.mf) ?? previous?.mapFeature ?? null,
      monster: nextMonster,
      t: nextT
    };
    bounds = expandBounds(bounds, x, y);
  }

  return { cells, bounds };
}

function mergeTilePayload(current: Record<string, unknown> | null, update: unknown): Record<string, unknown> | null {
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    return current;
  }
  return { ...(current ?? {}), ...(update as Record<string, unknown>) };
}

function expandBounds(bounds: MapBounds | null, x: number, y: number): MapBounds {
  if (!bounds) {
    return { left: x, top: y, right: x, bottom: y };
  }
  return {
    left: Math.min(bounds.left, x),
    top: Math.min(bounds.top, y),
    right: Math.max(bounds.right, x),
    bottom: Math.max(bounds.bottom, y)
  };
}

function currentModeLabel(uiState: number | null, inputMode: number | null): string {
  if (uiState === 2) {
    return "Map exploration";
  }
  if (uiState === 1) {
    return "Character creation";
  }
  return inputModeLabel(inputMode);
}

function inputModeLabel(inputMode: number | null): string {
  const labels: Record<number, string> = {
    0: "Game",
    1: "Command",
    2: "Targeting",
    3: "Directional targeting",
    4: "Path targeting",
    5: "More prompt",
    6: "Macro",
    7: "Prompt",
    8: "Yes or no prompt"
  };
  return inputMode === null ? "Game" : labels[inputMode] ?? `Input mode ${inputMode}`;
}

function shouldAnnounceMode(inputMode: number | null, uiState: number | null): boolean {
  return uiState === 2 || inputMode === 2 || inputMode === 3 || inputMode === 4 || inputMode === 5
    || inputMode === 6 || inputMode === 7 || inputMode === 8;
}

function cursorNameFromId(id: number | undefined): GameCursorName | null {
  switch (id) {
    case 0:
      return "mouse";
    case 1:
      return "tutorial";
    case 2:
      return "map";
    default:
      return null;
  }
}

function activeCursorFromState(
  cursors: GameCursors,
  uiState: number | null,
  inputMode: number | null
): GameCursor | null {
  if (uiState === 2 && cursors.map) {
    return { ...cursors.map, type: "map" };
  }
  if ((inputMode === 2 || inputMode === 3 || inputMode === 4) && cursors.mouse) {
    return { ...cursors.mouse, type: "mouse" };
  }
  if (cursors.tutorial) {
    return { ...cursors.tutorial, type: "tutorial" };
  }
  return null;
}

function isActiveCursor(cursor: GameCursorName, uiState: number | null, inputMode: number | null): boolean {
  return cursor === "map" && uiState === 2
    || cursor === "mouse" && (inputMode === 2 || inputMode === 3 || inputMode === 4)
    || cursor === "tutorial";
}

function cursorAnnouncementKey(cursor: GameCursor): string {
  return `${cursor.type}:${cursor.x},${cursor.y}`;
}

function describeCursorPosition(
  cursor: GameCursor,
  cells: Record<string, TileCell>,
  playerPosition: MapPoint | null
): string {
  const inspected = describeInspectedCell(cells[mapKey(cursor.x, cursor.y)]);
  const relative = playerPosition ? relativePosition(playerPosition, cursor) : `position ${cursor.x}, ${cursor.y}`;
  const label = cursor.type === "map" ? "Map cursor" : cursor.type === "mouse" ? "Target cursor" : "Tutorial cursor";
  return `${label}: ${inspected}, ${relative}.`;
}

function describeInspectedCell(cell: TileCell | undefined): string {
  if (!cell) {
    return "map data has not arrived";
  }

  const terrain = terrainLabel(cell);
  const monsterName = stringFromUnknown(cell.monster?.name);
  if (monsterName) {
    if (cell.mapFeature !== null && isMonsterFeature(cell.mapFeature)) {
      return monsterName;
    }
    return `${monsterName} on ${terrain}`;
  }
  if (cell.glyph === "@") {
    return "you";
  }
  if (cell.mapFeature !== null && isMonsterFeature(cell.mapFeature)) {
    return terrain;
  }
  const glyph = glyphLabel(cell.glyph);
  if (cell.glyph.trim() && glyph !== terrain && !glyph.startsWith("glyph ")) {
    return `${glyph} on ${terrain}`;
  }
  return terrain;
}

function relativePosition(origin: MapPoint, target: MapPoint): string {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  if (dx === 0 && dy === 0) {
    return "at your position";
  }

  const parts = [
    dx === 0 ? "" : tileDistance(Math.abs(dx), dx > 0 ? "east" : "west"),
    dy === 0 ? "" : tileDistance(Math.abs(dy), dy > 0 ? "south" : "north")
  ].filter(Boolean);

  return `${parts.join(" and ")} of you`;
}

function tileDistance(distance: number, direction: string): string {
  return `${distance} ${distance === 1 ? "tile" : "tiles"} ${direction}`;
}

function hostileSnapshotsFromCells(
  cells: Record<string, TileCell>,
  playerPosition: MapPoint | null
): Map<string, HostileSnapshot> {
  const snapshots = new Map<string, HostileSnapshot>();
  if (!playerPosition) {
    return snapshots;
  }

  for (const cell of Object.values(cells)) {
    if (cell.mapFeature !== 10) {
      continue;
    }

    const name = creatureLabel(cell);
    const key = hostileTrackingKey(cell, name);
    const snapshot = {
      key,
      name,
      position: { x: cell.x, y: cell.y },
      distance: gridDistance(playerPosition, cell),
      threat: numberFromUnknown(cell.monster?.threat) ?? null
    };
    const existing = snapshots.get(key);
    if (!existing || snapshot.distance < existing.distance) {
      snapshots.set(key, snapshot);
    }
  }

  return snapshots;
}

function hostileTrackingKey(cell: TileCell, name: string): string {
  const id = numberFromUnknown(cell.monster?.id) ?? numberFromUnknown(cell.monster?.clientid);
  if (id !== undefined) {
    return `id:${id}`;
  }

  const type = numberFromUnknown(cell.monster?.type) ?? numberFromUnknown(cell.monster?.btype);
  if (type !== undefined) {
    return `type:${type}:${name}`;
  }

  return name === "hostile monster" ? `position:${cell.x},${cell.y}` : `name:${name}`;
}

function findNewHostiles(
  previous: Map<string, HostileSnapshot>,
  current: Map<string, HostileSnapshot>
): HostileSnapshot[] {
  return [...current.values()]
    .filter((snapshot) => !previous.has(snapshot.key))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function findApproachingHostiles(
  previous: Map<string, HostileSnapshot>,
  current: Map<string, HostileSnapshot>
): HostileSnapshot[] {
  return [...current.values()]
    .filter((snapshot) => {
      const oldSnapshot = previous.get(snapshot.key);
      return oldSnapshot
        && !samePoint(oldSnapshot.position, snapshot.position)
        && snapshot.distance < oldSnapshot.distance;
    })
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 3);
}

function describeNewHostiles(hostiles: HostileSnapshot[], playerPosition: MapPoint): string {
  const label = hostiles.length === 1 ? "Enemy spotted" : "Enemies spotted";
  return `${label}: ${hostiles
    .map((hostile) => describeHostileSnapshot(hostile, playerPosition))
    .join("; ")}.`;
}

function describeApproachingHostiles(hostiles: HostileSnapshot[], playerPosition: MapPoint): string {
  const label = hostiles.length === 1 ? "Enemy approaching" : "Enemies approaching";
  return `${label}: ${hostiles
    .map((hostile) => `${hostile.name}${threatText(hostile.threat)} now ${relativePosition(playerPosition, hostile.position)}`)
    .join("; ")}.`;
}

function describeHostileSnapshot(hostile: HostileSnapshot, playerPosition: MapPoint): string {
  return `${hostile.name}${threatText(hostile.threat)} ${relativePosition(playerPosition, hostile.position)}`;
}

function threatText(threat: number | null): string {
  const label = threatLabel(threat);
  return label ? `, ${label} threat,` : "";
}

function threatLabel(threat: number | null): string {
  const labels: Record<number, string> = {
    0: "trivial",
    1: "easy",
    2: "tough",
    3: "nasty"
  };
  return threat === null ? "" : labels[threat] ?? "";
}

function combineAnnouncements(primary: string | null, tactical: string): string {
  return primary ? `${primary} ${tactical}` : tactical;
}

function gridDistance(left: MapPoint, right: MapPoint): number {
  return Math.max(Math.abs(right.x - left.x), Math.abs(right.y - left.y));
}

function describeMovementAnnouncement(
  previousPosition: MapPoint | null,
  currentPosition: MapPoint,
  cells: Record<string, TileCell>,
  lastTerrain: string | null,
  lastNearbyContext: string | null
): { text: string; terrain: string; nearbyContext: string } {
  const direction = previousPosition ? movementDirection(previousPosition, currentPosition) : "";
  const movement = direction ? `Moved ${direction}.` : "Moved.";
  const terrain = terrainLabel(cells[mapKey(currentPosition.x, currentPosition.y)]);
  const nearby = nearbyInterestingFeatures(cells, currentPosition);
  const nearbyContext = nearby.join("|");
  const details = [];

  if (terrain && terrain !== lastTerrain && (terrain !== "floor" || lastTerrain !== null)) {
    details.push(`You are on ${terrain}.`);
  }
  if (nearby.length > 0 && nearbyContext !== lastNearbyContext) {
    details.push(`Nearby: ${nearby.join("; ")}.`);
  }
  const hostiles = [...hostileSnapshotsFromCells(cells, currentPosition).values()]
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, 3);
  if (hostiles.length > 0) {
    const label = hostiles.length === 1 ? "Enemy" : "Enemies";
    details.push(`${label}: ${hostiles
      .map((hostile) => describeHostileSnapshot(hostile, currentPosition))
      .join("; ")}.`);
  }

  return {
    text: [movement, ...details].join(" "),
    terrain,
    nearbyContext
  };
}

function movementDirection(previous: MapPoint, current: MapPoint): string {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
    const directions: Record<string, string> = {
      "0,-1": "north",
      "1,-1": "northeast",
      "1,0": "east",
      "1,1": "southeast",
      "0,1": "south",
      "-1,1": "southwest",
      "-1,0": "west",
      "-1,-1": "northwest",
      "0,0": ""
    };
    return directions[`${dx},${dy}`] ?? "";
  }
  return relativePosition(previous, current)
    .replace(/ of you$/, "")
    .replace(/^at your position$/, "");
}

function nearbyInterestingFeatures(cells: Record<string, TileCell>, position: MapPoint): string[] {
  const sightings = adjacentDirections()
    .map(({ dx, dy, direction }) => {
      const cell = cells[mapKey(position.x + dx, position.y + dy)];
      const label = interestingNearbyLabel(cell);
      return label ? `${label} ${direction}` : "";
    })
    .filter(Boolean);

  return dedupeBy(sightings, (sighting) => sighting).slice(0, 5);
}

function interestingNearbyLabel(cell: TileCell | undefined): string {
  if (!cell) {
    return "";
  }
  if (cell.mapFeature !== null && isMonsterFeature(cell.mapFeature)) {
    return creatureLabel(cell);
  }

  const label = terrainLabel(cell);
  return isOrdinaryTerrain(label) || label === "wall" || label === "mapped wall"
    || label === "unseen terrain" || label === "explore horizon"
    ? ""
    : label;
}

function adjacentDirections(): { dx: number; dy: number; direction: string }[] {
  return [
    { dx: 0, dy: -1, direction: "north" },
    { dx: 1, dy: -1, direction: "northeast" },
    { dx: 1, dy: 0, direction: "east" },
    { dx: 1, dy: 1, direction: "southeast" },
    { dx: 0, dy: 1, direction: "south" },
    { dx: -1, dy: 1, direction: "southwest" },
    { dx: -1, dy: 0, direction: "west" },
    { dx: -1, dy: -1, direction: "northwest" }
  ];
}

function terrainLabel(cell: TileCell | undefined): string {
  if (!cell) {
    return "";
  }
  if (cell.feature !== null) {
    const feature = dungeonFeatureLabel(cell.feature);
    if (feature) {
      return feature;
    }
  }
  return cell.mapFeature !== null ? mapFeatureLabel(cell.mapFeature) : glyphLabel(cell.glyph);
}

function isOrdinaryTerrain(label: string): boolean {
  return label === "" || label === "floor" || label === "mapped floor" || label === "player";
}

function describeMapPosition(
  position: MapPoint,
  cells: Record<string, TileCell>,
  player: PlayerSummary | null
): string {
  const current = cells[mapKey(position.x, position.y)];
  const here = describeCell(current);
  const nearbyCreatures = describeNearbyCreatures(cells, position);
  const place = player?.place ? `${player.place}. ` : "";
  return `${place}Position ${position.x}, ${position.y}. ${here}${nearbyCreatures ? ` ${nearbyCreatures}` : ""}`;
}

function describeNearbyCreatures(cells: Record<string, TileCell>, position: MapPoint): string {
  const sightings = adjacentDirections().map(({ dx, dy, direction }) => {
    const cell = cells[mapKey(position.x + dx, position.y + dy)];
    const feature = cell?.mapFeature;
    if (!isMonsterFeature(feature)) {
      return null;
    }
    return { feature, text: `${creatureLabel(cell)} ${direction}` };
  }).filter((item): item is { feature: number; text: string } => Boolean(item));

  const uniqueSightings = dedupeBy(sightings, (sighting) => sighting.text).slice(0, 4);
  const hostile = uniqueSightings.filter((sighting) => sighting.feature === 10);
  if (hostile.length > 0) {
    const label = hostile.length === 1 ? "Enemy position" : "Enemy positions";
    return `${label}: ${hostile.map((sighting) => sighting.text).join("; ")}.`;
  }
  if (uniqueSightings.length > 0) {
    return `Nearby creature positions: ${uniqueSightings.map((sighting) => sighting.text).join("; ")}.`;
  }
  return "";
}

function isMonsterFeature(feature: number | null | undefined): feature is number {
  return feature === 7 || feature === 8 || feature === 9 || feature === 10 || feature === 11;
}

function creatureLabel(cell: TileCell): string {
  return stringFromUnknown(cell.monster?.name)
    || (cell.mapFeature !== null ? mapFeatureLabel(cell.mapFeature) : glyphLabel(cell.glyph));
}

function dedupeBy<T>(items: T[], keyForItem: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyForItem(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function describeCell(cell: TileCell | undefined): string {
  if (!cell) {
    return "Map data for this tile has not arrived yet.";
  }

  const feature = terrainLabel(cell);
  if (cell.glyph === "@") {
    return `You are on ${feature}.`;
  }
  return `Current tile: ${feature}.`;
}

function dungeonFeatureLabel(feature: number): string {
  if (feature >= 1 && feature <= 3) {
    return "closed door";
  }
  if (feature >= 5 && feature <= 29) {
    return "wall";
  }
  if (feature === 30) {
    return "lava";
  }
  if (feature === 31) {
    return "deep water";
  }
  if (feature === 32) {
    return "shallow water";
  }
  if (feature === 33) {
    return "floor";
  }
  if (feature === 34) {
    return "open door";
  }
  if (feature >= 35 && feature <= 39) {
    return "trap";
  }
  if (feature === 40) {
    return "shop entrance";
  }
  if (feature === 41) {
    return "abandoned shop";
  }
  if (feature >= 42 && feature <= 45) {
    return "staircase down";
  }
  if (feature >= 46 && feature <= 49) {
    return "staircase up";
  }
  if (feature >= 50 && feature <= 78) {
    return "portal or branch entrance";
  }
  if (feature >= 79) {
    return "altar or feature";
  }
  return "";
}

function mapFeatureLabel(feature: number): string {
  const labels: Record<number, string> = {
    0: "unseen terrain",
    1: "floor",
    2: "wall",
    3: "mapped floor",
    4: "mapped wall",
    5: "door",
    6: "item",
    7: "friendly monster",
    8: "peaceful monster",
    9: "neutral monster",
    10: "hostile monster",
    11: "plant or non-experience monster",
    12: "staircase up",
    13: "staircase down",
    14: "branch staircase",
    15: "feature",
    16: "water",
    17: "lava",
    18: "trap",
    19: "exclusion center",
    20: "excluded area",
    21: "player",
    22: "deep water",
    23: "portal",
    24: "transporter",
    25: "transporter landing",
    26: "explore horizon"
  };
  return labels[feature] ?? `map feature ${feature}`;
}

function glyphLabel(glyph: string): string {
  const labels: Record<string, string> = {
    ".": "floor",
    "#": "wall",
    "@": "player",
    "<": "staircase up",
    ">": "staircase down",
    "+": "door",
    "^": "trap",
    "~": "water"
  };
  return labels[glyph] ?? (glyph.trim() ? `glyph ${glyph}` : "empty space");
}

function mapKey(x: number, y: number): string {
  return `${x},${y}`;
}

function samePoint(left: MapPoint, right: MapPoint): boolean {
  return left.x === right.x && left.y === right.y;
}

function htmlToText(html: string, options: { preserveWhitespace?: boolean } = {}): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent?.replace(/\u00a0/g, " ") ?? "";
  if (options.preserveWhitespace) {
    return text.replace(/[ \t]+$/gm, "").replace(/\s+$/, "");
  }
  return text.replace(/\s+/g, " ").trim();
}

function stringFromUnknown(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function recordFromUnknown(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function textFromUnknown(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberFromUnknown(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringField(message: CrawlMessage, field: string, fallback = ""): string {
  const value = message[field];
  return typeof value === "string" ? value : fallback;
}

function arrayField(message: CrawlMessage, field: string): unknown[] {
  const value = message[field];
  return Array.isArray(value) ? value : [];
}

function numberField(message: CrawlMessage, field: string): number | undefined {
  const value = message[field];
  return typeof value === "number" ? value : undefined;
}

function pointField(message: CrawlMessage, field: string): MapPoint | null {
  const value = message[field];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const x = numberFromUnknown((value as Record<string, unknown>).x);
  const y = numberFromUnknown((value as Record<string, unknown>).y);
  return x === undefined || y === undefined ? null : { x, y };
}

function recordField(message: CrawlMessage, field: string): Record<string, string> {
  const value = message[field];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function isTextMessageArray(value: unknown): value is { text: string }[] {
  return Array.isArray(value)
    && value.every((item) => item && typeof item === "object" && typeof item.text === "string");
}
