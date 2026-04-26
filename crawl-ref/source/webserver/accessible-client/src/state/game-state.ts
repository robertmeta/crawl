import { createStore, produce } from "solid-js/store";

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

export type GameUiButton = {
  label: string;
  description: string;
  hotkey: number;
  menuId: string;
  x: number;
  y: number;
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
  groups: GameUiGroup[];
  focusedHotkey: number | null;
};

export type PlayerSummary = {
  name: string;
  species: string;
  job: string;
  place: string;
  hp: string;
  mp: string;
  xl: string;
  turn: string;
};

export type TileCell = {
  x: number;
  y: number;
  glyph: string;
  colour: number | null;
  mapFeature: number | null;
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

export type AccessibleGameState = {
  connectionStatus: string;
  errors: string[];
  currentUser: string | null;
  isAdmin: boolean;
  isInGame: boolean;
  activeLayer: string;
  gameVersion: string | null;
  gameLinks: GameLink[];
  lobbyEntries: LobbyEntry[];
  messages: GameMessage[];
  morePrompt: string | null;
  textAreas: Record<string, Record<string, string>>;
  uiStack: GameUiPanel[];
  player: PlayerSummary | null;
  mapCells: Record<string, TileCell>;
  mapBounds: MapBounds | null;
  mapCenter: MapPoint;
  mapRevision: number;
  rcFile: RcFile | null;
  lastAnnouncement: string;
};

const initialState: AccessibleGameState = {
  connectionStatus: "Connecting",
  errors: [],
  currentUser: null,
  isAdmin: false,
  isInGame: false,
  activeLayer: "lobby",
  gameVersion: null,
  gameLinks: [],
  lobbyEntries: [],
  messages: [],
  morePrompt: null,
  textAreas: {},
  uiStack: [],
  player: null,
  mapCells: {},
  mapBounds: null,
  mapCenter: { x: 0, y: 0 },
  mapRevision: 0,
  rcFile: null,
  lastAnnouncement: ""
};

let nextMessageId = 1;

export function createAccessibleGameState() {
  const [state, setState] = createStore(initialState);
  let pendingMovement: MapPoint | null = null;
  let lastAnnouncedPosition: string | null = null;

  const setStatus = (status: string) => {
    setState("connectionStatus", status);
  };

  const addError = (error: string) => {
    setState("errors", (errors) => [...errors, error]);
    setState("lastAnnouncement", error);
  };

  const applyMessage = (message: CrawlMessage) => {
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
        setState("textAreas", {});
        setState("mapCells", {});
        setState("mapBounds", null);
        setState("mapCenter", { x: 0, y: 0 });
        setState("mapRevision", (revision) => revision + 1);
        pendingMovement = null;
        lastAnnouncedPosition = null;
        break;
      case "game_started":
        setState("isInGame", true);
        setState("activeLayer", "game");
        setState("lastAnnouncement", "Game started.");
        break;
      case "game_ended":
        setState("isInGame", false);
        setState("lastAnnouncement", stringField(message, "message", stringField(message, "reason", "Game ended.")));
        break;
      case "go_lobby":
        setState("activeLayer", "lobby");
        setState("isInGame", false);
        setState("uiStack", []);
        break;
      case "rcfile_contents":
        setState("rcFile", {
          gameId: stringField(message, "game_id"),
          contents: stringField(message, "contents")
        });
        setState("lastAnnouncement", `Editing rc file for ${stringField(message, "game_id")}.`);
        break;
      case "msgs":
        if (numberField(message, "rollback") || numberField(message, "old_msgs")) {
          const removeCount = numberField(message, "rollback") || numberField(message, "old_msgs") || 0;
          setState("messages", (messages) => messages.slice(0, Math.max(0, messages.length - removeCount)));
        }
        if (isTextMessageArray(message.messages)) {
          const newMessages = message.messages;
          setState("messages", (messages) => [
            ...messages,
            ...newMessages.map((item) => ({ id: nextMessageId++, text: htmlToText(item.text) }))
          ].slice(-500));
          const last = newMessages.at(-1);
          if (last) {
            setState("lastAnnouncement", htmlToText(last.text));
            pendingMovement = null;
          }
        }
        setState("morePrompt", message.more ? stringField(message, "more_text", "--more--") : null);
        if (message.more) {
          setState("lastAnnouncement", stringField(message, "more_text", "--more--"));
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
        setState("lastAnnouncement", panel.title || "Game menu opened.");
        break;
      }
      case "ui-pop":
        setState("uiStack", (stack) => stack.slice(0, -1));
        break;
      case "ui-stack":
        setState("uiStack", uiStackFromMessage(message));
        break;
      case "ui-state":
        setState("uiStack", produce((stack) => {
          const top = stack.at(-1);
          if (top) {
            top.focusedHotkey = numberField(message, "button_focus") ?? top.focusedHotkey;
          }
        }));
        break;
      case "player":
        setState("player", playerSummaryFromMessage(message, state.player));
        {
          const position = pointField(message, "pos");
          if (position) {
            setState("mapCenter", position);
            pendingMovement = position;
          }
        }
        break;
      case "map": {
        const update = mapUpdateFromMessage(message, state.mapCells, state.mapBounds);
        setState("mapCells", update.cells);
        setState("mapBounds", update.bounds);
        const center = pointField(message, "vgrdc");
        if (center) {
          setState("mapCenter", center);
        }
        setState("mapRevision", (revision) => revision + 1);
        if (pendingMovement) {
          const key = mapKey(pendingMovement.x, pendingMovement.y);
          if (key !== lastAnnouncedPosition) {
            setState("lastAnnouncement", describeMapPosition(pendingMovement, update.cells, state.player));
            lastAnnouncedPosition = key;
          }
          pendingMovement = null;
        }
        break;
      }
      case "layer":
        setState("activeLayer", stringField(message, "layer"));
        break;
      case "close":
        setStatus(message.reason ? `Closed: ${stringField(message, "reason")}` : "Closed");
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

function uiStackFromMessage(message: CrawlMessage): GameUiPanel[] {
  const items = arrayField(message, "items");
  return items
    .filter((item): item is CrawlMessage => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .filter((item) => item.msg === "ui-push")
    .map(uiPanelFromMessage);
}

function uiPanelFromMessage(message: CrawlMessage): GameUiPanel {
  return {
    generationId: numberField(message, "generation_id") ?? null,
    type: stringField(message, "type", "unknown"),
    title: htmlToText(stringField(message, "title")),
    prompt: htmlToText(stringField(message, "prompt")),
    groups: [
      uiGroupFromValue("Primary choices", message["main-items"]),
      uiGroupFromValue("Secondary choices", message["sub-items"])
    ].filter((group): group is GameUiGroup => Boolean(group && group.buttons.length > 0)),
    focusedHotkey: null
  };
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

function playerSummaryFromMessage(message: CrawlMessage, previous: PlayerSummary | null): PlayerSummary {
  const hp = pairText(message.hp, message.hp_max) || previous?.hp || "";
  const mp = pairText(message.mp, message.mp_max) || previous?.mp || "";

  return {
    name: stringField(message, "name", previous?.name ?? ""),
    species: stringField(message, "species_display_name", stringField(message, "species", previous?.species ?? "")),
    job: stringField(message, "title", previous?.job ?? ""),
    place: stringField(message, "place", previous?.place ?? ""),
    hp,
    mp,
    xl: textFromUnknown(message.xl) || previous?.xl || "",
    turn: textFromUnknown(message.turn) || previous?.turn || ""
  };
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
    cells[key] = {
      x,
      y,
      glyph: stringFromUnknown(raw.g) || previous?.glyph || " ",
      colour: numberFromUnknown(raw.col) ?? previous?.colour ?? null,
      mapFeature: numberFromUnknown(raw.mf) ?? previous?.mapFeature ?? null,
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

function describeMapPosition(
  position: MapPoint,
  cells: Record<string, TileCell>,
  player: PlayerSummary | null
): string {
  const current = cells[mapKey(position.x, position.y)];
  const here = describeCell(current);
  const nearby = describeNearby(cells, position);
  const place = player?.place ? `${player.place}. ` : "";
  const turn = player?.turn ? `Turn ${player.turn}. ` : "";
  return `${place}${turn}Position ${position.x}, ${position.y}. ${here}${nearby ? ` Nearby: ${nearby}.` : ""}`;
}

function describeNearby(cells: Record<string, TileCell>, position: MapPoint): string {
  const interesting = [
    { dx: 0, dy: -1, direction: "north" },
    { dx: 1, dy: -1, direction: "northeast" },
    { dx: 1, dy: 0, direction: "east" },
    { dx: 1, dy: 1, direction: "southeast" },
    { dx: 0, dy: 1, direction: "south" },
    { dx: -1, dy: 1, direction: "southwest" },
    { dx: -1, dy: 0, direction: "west" },
    { dx: -1, dy: -1, direction: "northwest" }
  ].map(({ dx, dy, direction }) => {
    const cell = cells[mapKey(position.x + dx, position.y + dy)];
    const feature = cell?.mapFeature;
    if (feature === undefined || feature === null || [0, 1, 2, 3, 4, 26].includes(feature)) {
      return null;
    }
    return `${mapFeatureLabel(feature)} ${direction}`;
  }).filter((item): item is string => Boolean(item));

  return [...new Set(interesting)].slice(0, 4).join(", ");
}

function describeCell(cell: TileCell | undefined): string {
  if (!cell) {
    return "Map data for this tile has not arrived yet.";
  }

  const feature = cell.mapFeature !== null ? mapFeatureLabel(cell.mapFeature) : glyphLabel(cell.glyph);
  if (cell.glyph === "@") {
    return `You are on ${feature}.`;
  }
  return `Current tile: ${feature}.`;
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
