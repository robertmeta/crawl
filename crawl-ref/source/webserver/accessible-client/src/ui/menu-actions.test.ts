import { describe, expect, it } from "vitest";

import { menuActivationMessages } from "./menu-actions";
import type { GameMenu, GameMenuItem } from "../state/game-state";

const baseMenu: GameMenu = {
  tag: "inventory",
  type: "menu",
  title: "Inventory",
  flags: 0,
  totalItems: 1,
  lastHovered: -1,
  firstVisible: 0,
  lastVisible: 0,
  more: "",
  altMore: "",
  items: []
};

const baseItem: GameMenuItem = {
  index: 3,
  level: 2,
  text: "d - a wand of flame",
  hotkeys: [100],
  selectable: true,
  colour: null
};

describe("menuActivationMessages", () => {
  it("routes stash search results by hovering then sending mouse select", () => {
    expect(menuActivationMessages({
      ...baseMenu,
      tag: "stash",
      flags: 0x40000 | 0x0002
    }, baseItem)).toEqual([
      { msg: "menu_hover", hover: 3, mouse: false },
      { msg: "key", keycode: -9997 }
    ]);
  });

  it("routes other arrows-select menus by hovering then pressing Enter", () => {
    expect(menuActivationMessages({
      ...baseMenu,
      tag: "travel",
      flags: 0x40000 | 0x0002
    }, baseItem)).toEqual([
      { msg: "menu_hover", hover: 3, mouse: false },
      { msg: "key", keycode: 13 }
    ]);
  });

  it("uses the item hotkey for ordinary hotkey menus", () => {
    expect(menuActivationMessages(baseMenu, baseItem)).toEqual([
      { msg: "menu_hover", hover: 3, mouse: false },
      { msg: "key", keycode: 100 }
    ]);
  });
});
