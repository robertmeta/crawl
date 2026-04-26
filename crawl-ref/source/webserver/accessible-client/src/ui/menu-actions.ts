import type { OutgoingMessage } from "../protocol/messages";
import type { GameMenu, GameMenuItem } from "../state/game-state";

const MENU_SINGLESELECT = 0x0002;
const MENU_MULTISELECT = 0x0004;
const MENU_ARROWS_SELECT = 0x40000;
const CK_MOUSE_B1 = -9997;

export function menuActivationMessages(menu: GameMenu, item: GameMenuItem): OutgoingMessage[] {
  const messages: OutgoingMessage[] = [
    { msg: "menu_hover", hover: item.index, mouse: false }
  ];

  if (menu.flags & MENU_ARROWS_SELECT) {
    if (menu.flags & MENU_SINGLESELECT) {
      messages.push({ msg: "key", keycode: menu.tag === "stash" ? CK_MOUSE_B1 : 13 });
    } else if (menu.flags & MENU_MULTISELECT) {
      messages.push({ msg: "key", keycode: 32 });
    }
    return messages;
  }

  if (item.hotkeys.length > 0) {
    messages.push({ msg: "key", keycode: item.hotkeys[0] });
  } else {
    messages.push({ msg: "key", keycode: 13 });
  }
  return messages;
}
