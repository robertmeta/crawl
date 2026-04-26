const CK_DELETE = -255;
const CK_UP = -254;
const CK_DOWN = -253;
const CK_LEFT = -252;
const CK_RIGHT = -251;
const CK_INSERT = -250;
const CK_HOME = -249;
const CK_END = -248;
const CK_CLEAR = -247;
const CK_PGUP = -246;
const CK_PGDN = -245;

const CK_SHIFT_UP = -243;
const CK_SHIFT_DOWN = -242;
const CK_SHIFT_LEFT = -241;
const CK_SHIFT_RIGHT = -240;
const CK_SHIFT_INSERT = -239;
const CK_SHIFT_HOME = -238;
const CK_SHIFT_END = -237;
const CK_SHIFT_CLEAR = -236;
const CK_SHIFT_PGUP = -235;
const CK_SHIFT_PGDN = -234;
const CK_SHIFT_TAB = -233;

const CK_CTRL_UP = -232;
const CK_CTRL_DOWN = -231;
const CK_CTRL_LEFT = -230;
const CK_CTRL_RIGHT = -229;
const CK_CTRL_INSERT = -228;
const CK_CTRL_HOME = -227;
const CK_CTRL_END = -226;
const CK_CTRL_CLEAR = -225;
const CK_CTRL_PGUP = -224;
const CK_CTRL_PGDN = -223;

const CK_CTRL_SHIFT_UP = -221;
const CK_CTRL_SHIFT_DOWN = -220;
const CK_CTRL_SHIFT_LEFT = -219;
const CK_CTRL_SHIFT_RIGHT = -218;
const CK_CTRL_SHIFT_INSERT = -217;
const CK_CTRL_SHIFT_HOME = -216;
const CK_CTRL_SHIFT_END = -215;
const CK_CTRL_SHIFT_CLEAR = -214;
const CK_CTRL_SHIFT_PGUP = -213;
const CK_CTRL_SHIFT_PGDN = -212;

const CK_SHIFT_ENTER = -206;
const CK_SHIFT_BKSP = -205;
const CK_SHIFT_ESCAPE = -204;
const CK_SHIFT_DELETE = -203;
const CK_SHIFT_SPACE = -202;
const CK_CTRL_ENTER = -201;
const CK_CTRL_BKSP = -200;
const CK_CTRL_ESCAPE = -199;
const CK_CTRL_DELETE = -198;
const CK_CTRL_SPACE = -197;
const CK_CTRL_SHIFT_ENTER = -196;
const CK_CTRL_SHIFT_BKSP = -195;
const CK_CTRL_SHIFT_ESCAPE = -194;
const CK_CTRL_SHIFT_DELETE = -193;
const CK_CTRL_SHIFT_SPACE = -192;

const codeConversion: Record<string, number> = {
  Delete: CK_DELETE,
  Numpad0: -1000,
  Numpad1: -1001,
  Numpad2: -1002,
  Numpad3: -1003,
  Numpad4: -1004,
  Numpad5: -1005,
  Numpad6: -1006,
  Numpad7: -1007,
  Numpad8: -1008,
  Numpad9: -1009,
  NumpadEnter: -1010,
  NumpadDivide: -1012,
  NumpadMultiply: -1015,
  NumpadAdd: -1016,
  NumpadSubtract: -1018,
  NumpadDecimal: -1019,
  NumpadEqual: -1021,
  F1: -265,
  F2: -266,
  F3: -267,
  F4: -268,
  F5: -269,
  F6: -270,
  F7: -271,
  F8: -272,
  F9: -273,
  F10: -274,
  F13: -277,
  F14: -278,
  F15: -279,
  F16: -280,
  F17: -281,
  F18: -282,
  F19: -283
};

const baseKeys: Record<string, number> = {
  Enter: 13,
  Escape: 27,
  Backspace: 8,
  Tab: 9,
  Delete: CK_DELETE,
  Insert: CK_INSERT,
  End: CK_END,
  ArrowDown: CK_DOWN,
  PageDown: CK_PGDN,
  ArrowLeft: CK_LEFT,
  Clear: CK_CLEAR,
  ArrowRight: CK_RIGHT,
  Home: CK_HOME,
  ArrowUp: CK_UP,
  PageUp: CK_PGUP
};

const shiftKeys: Record<string, number> = {
  Tab: CK_SHIFT_TAB,
  Insert: CK_SHIFT_INSERT,
  End: CK_SHIFT_END,
  ArrowDown: CK_SHIFT_DOWN,
  PageDown: CK_SHIFT_PGDN,
  ArrowLeft: CK_SHIFT_LEFT,
  Clear: CK_SHIFT_CLEAR,
  ArrowRight: CK_SHIFT_RIGHT,
  Home: CK_SHIFT_HOME,
  ArrowUp: CK_SHIFT_UP,
  PageUp: CK_SHIFT_PGUP,
  Enter: CK_SHIFT_ENTER,
  Backspace: CK_SHIFT_BKSP,
  Escape: CK_SHIFT_ESCAPE,
  Delete: CK_SHIFT_DELETE,
  " ": CK_SHIFT_SPACE
};

const ctrlKeys: Record<string, number> = {
  Insert: CK_CTRL_INSERT,
  End: CK_CTRL_END,
  ArrowDown: CK_CTRL_DOWN,
  PageDown: CK_CTRL_PGDN,
  ArrowLeft: CK_CTRL_LEFT,
  Clear: CK_CTRL_CLEAR,
  ArrowRight: CK_CTRL_RIGHT,
  Home: CK_CTRL_HOME,
  ArrowUp: CK_CTRL_UP,
  PageUp: CK_CTRL_PGUP,
  Enter: CK_CTRL_ENTER,
  Backspace: CK_CTRL_BKSP,
  Escape: CK_CTRL_ESCAPE,
  Delete: CK_CTRL_DELETE,
  " ": CK_CTRL_SPACE
};

const ctrlShiftKeys: Record<string, number> = {
  Insert: CK_CTRL_SHIFT_INSERT,
  End: CK_CTRL_SHIFT_END,
  ArrowDown: CK_CTRL_SHIFT_DOWN,
  PageDown: CK_CTRL_SHIFT_PGDN,
  ArrowLeft: CK_CTRL_SHIFT_LEFT,
  Clear: CK_CTRL_SHIFT_CLEAR,
  ArrowRight: CK_CTRL_SHIFT_RIGHT,
  Home: CK_CTRL_SHIFT_HOME,
  ArrowUp: CK_CTRL_SHIFT_UP,
  PageUp: CK_CTRL_SHIFT_PGUP,
  Enter: CK_CTRL_SHIFT_ENTER,
  Backspace: CK_CTRL_SHIFT_BKSP,
  Escape: CK_CTRL_SHIFT_ESCAPE,
  Delete: CK_CTRL_SHIFT_DELETE,
  " ": CK_CTRL_SHIFT_SPACE
};

const capturedControlKeys = new Set([
  "O", "Q", "F", "P", "W", "A", "T", "X", "S", "G", "I", "D", "E",
  "H", "J", "K", "L", "Y", "U", "B", "N", "C", "M",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"
]);

const numpadNavigationKeys: Record<string, string> = {
  Numpad1: "End",
  Numpad2: "ArrowDown",
  Numpad3: "PageDown",
  Numpad4: "ArrowLeft",
  Numpad6: "ArrowRight",
  Numpad7: "Home",
  Numpad8: "ArrowUp",
  Numpad9: "PageUp"
};

export type CrawlPrintableInput = { text: string } | { data: number[] };

export function crawlKeyCode(event: KeyboardEvent): number | undefined {
  const key = modifiedNavigationKey(event) ?? event.key;

  if (event.ctrlKey && event.shiftKey && !event.altKey && ctrlShiftKeys[key] !== undefined) {
    return ctrlShiftKeys[key];
  }
  if (event.ctrlKey && !event.shiftKey && !event.altKey) {
    if (ctrlKeys[key] !== undefined) {
      return ctrlKeys[key];
    }
    return crawlControlKeyCode(event.key);
  }
  if (!event.ctrlKey && event.shiftKey && !event.altKey && shiftKeys[key] !== undefined) {
    return shiftKeys[key];
  }
  if (!event.ctrlKey && !event.shiftKey && !event.altKey) {
    if (event.code && codeConversion[event.code] !== undefined) {
      return codeConversion[event.code];
    }
    return baseKeys[event.key];
  }
  return undefined;
}

export function crawlControlKeyCode(key: string): number | undefined {
  const normalized = key.toUpperCase();
  if (!capturedControlKeys.has(normalized)) {
    return undefined;
  }
  return normalized.charCodeAt(0) - "A".charCodeAt(0) + 1;
}

export function crawlAltInputData(event: KeyboardEvent): number[] | undefined {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.key.length !== 1) {
    return undefined;
  }
  return [27, event.key.charCodeAt(0)];
}

export function crawlPrintableInput(event: KeyboardEvent): CrawlPrintableInput | undefined {
  if (event.key.length !== 1 || shouldIgnorePrintableInput(event)) {
    return undefined;
  }
  if (event.key === "{") {
    return { data: [event.key.charCodeAt(0)] };
  }
  return { text: event.key };
}

export function unsupportedClientShortcut(event: KeyboardEvent): string | null {
  if (!event.ctrlKey && !event.shiftKey && !event.altKey && event.key === "F12") {
    return "chat shortcut";
  }
  return null;
}

function modifiedNavigationKey(event: KeyboardEvent): string | null {
  if (!event.shiftKey && !event.ctrlKey) {
    return null;
  }
  return event.code ? numpadNavigationKeys[event.code] ?? null : null;
}

function shouldIgnorePrintableInput(event: KeyboardEvent): boolean {
  if (event.metaKey) {
    return true;
  }
  if (isAltGraphInput(event)) {
    return false;
  }
  return event.ctrlKey || event.altKey;
}

function isAltGraphInput(event: KeyboardEvent): boolean {
  return event.key.length === 1
    && (event.getModifierState?.("AltGraph") || (event.ctrlKey && event.altKey));
}
