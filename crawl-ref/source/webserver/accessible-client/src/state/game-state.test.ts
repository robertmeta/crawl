import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";

import { createAccessibleGameState, type AccessibleGameState } from "./game-state";
import type { CrawlMessage } from "../protocol/messages";

function runWithState(callback: (state: AccessibleGameState, applyMessage: (message: CrawlMessage) => void) => void) {
  createRoot((dispose) => {
    const game = createAccessibleGameState();
    try {
      callback(game.state, game.applyMessage);
    } finally {
      dispose();
    }
  });
}

describe("createAccessibleGameState", () => {
  it("does not announce ordinary movement details and calls out new hostile positions", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", turn: 42, pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 6, y: 5, g: "g", mf: 10 },
          { x: 5, y: 4, g: "<", mf: 12 }
        ]
      });

      expect(state.lastAnnouncement).toBe(
        "Enemy spotted: hostile monster 1 tile east of you."
      );
      expect(state.lastAnnouncement).not.toContain("Turn");
      expect(state.lastAnnouncement).not.toContain("Position 5, 5");
      expect(state.lastAnnouncement).not.toContain("staircase");
      expect(state.lastAnnouncement).not.toContain("floor");
    });
  });

  it("does not announce ordinary floor or non-hostile nearby creatures", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 4, y: 4, g: "q", mf: 9 }
        ]
      });

      expect(state.lastAnnouncement).toBe("");
    });
  });

  it("announces movement direction without repeating plain floor", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", f: 33, mf: 1 },
          { x: 6, y: 5, g: ".", f: 33, mf: 1 },
          { x: 7, y: 5, g: ".", f: 33, mf: 1 }
        ]
      });

      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 6, y: 5 } });
      applyMessage({
        msg: "map",
        cells: [
          { x: 5, y: 5, g: ".", f: 33, mf: 1 },
          { x: 6, y: 5, g: "@", f: 33, mf: 1 }
        ]
      });
      expect(state.lastAnnouncement).toBe("Moved east.");

      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 7, y: 5 } });
      applyMessage({
        msg: "map",
        cells: [
          { x: 6, y: 5, g: ".", f: 33, mf: 1 },
          { x: 7, y: 5, g: "@", f: 33, mf: 1 }
        ]
      });
      expect(state.lastAnnouncement).toBe("Moved east.");
    });
  });

  it("announces useful terrain and nearby features while moving", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", f: 33, mf: 1 },
          { x: 6, y: 5, g: ".", f: 40, mf: 15 },
          { x: 6, y: 4, g: "<", f: 46, mf: 12 }
        ]
      });

      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 6, y: 5 } });
      applyMessage({
        msg: "map",
        cells: [
          { x: 5, y: 5, g: ".", f: 33, mf: 1 },
          { x: 6, y: 5, g: "@", f: 40, mf: 15 }
        ]
      });

      expect(state.lastAnnouncement).toBe("Moved east. You are on shop entrance. Nearby: staircase up north.");
    });
  });

  it("announces map exploration cursor moves relative to the player", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 6, y: 4, g: "g", mf: 10, mon: { name: "a goblin" } }
        ]
      });
      applyMessage({ msg: "ui_state", state: 2 });
      applyMessage({ msg: "cursor", id: 2, loc: { x: 6, y: 4 } });

      expect(state.modeLabel).toBe("Map exploration");
      expect(state.activeCursor).toEqual({ type: "map", x: 6, y: 4 });
      expect(state.lastAnnouncement).toBe(
        "Map cursor: a goblin, 1 tile east and 1 tile north of you."
      );
    });
  });

  it("announces when a tracked hostile moves closer to the player", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 8, y: 5, g: "g", mf: 10, mon: { id: 7, name: "a goblin", threat: 1 } }
        ]
      });

      applyMessage({
        msg: "map",
        cells: [
          { x: 8, y: 5, g: ".", mf: 1, mon: null },
          { x: 7, y: 5, g: "g", mf: 10, mon: { id: 7, name: "a goblin", threat: 1 } }
        ]
      });

      expect(state.lastAnnouncement).toBe("Enemy approaching: a goblin, easy threat, now 2 tiles east of you.");
    });
  });

  it("does not announce enemy approach when only the player moved closer", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 8, y: 5, g: "g", mf: 10, mon: { id: 7, name: "a goblin" } }
        ]
      });

      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 6, y: 5 } });
      applyMessage({
        msg: "map",
        cells: [
          { x: 5, y: 5, g: ".", mf: 1 },
          { x: 6, y: 5, g: "@", mf: 1 },
          { x: 8, y: 5, g: "g", mf: 10, mon: { id: 7, name: "a goblin" } }
        ]
      });

      expect(state.lastAnnouncement).toBe("Moved east. Enemy: a goblin 2 tiles east of you.");
      expect(state.lastAnnouncement).not.toContain("approaching");
    });
  });

  it("combines Crawl sighting messages with relative enemy position", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "game_client", version: "trunk" });
      applyMessage({ msg: "player", place: "Dungeon", pos: { x: 5, y: 5 } });
      applyMessage({ msg: "msgs", messages: [{ text: "A goblin comes into view." }] });
      applyMessage({
        msg: "map",
        clear: true,
        cells: [
          { x: 5, y: 5, g: "@", mf: 1 },
          { x: 7, y: 4, g: "g", mf: 10, mon: { id: 7, name: "a goblin", threat: 1 } }
        ]
      });

      expect(state.lastAnnouncement).toBe(
        "A goblin comes into view. Enemy spotted: a goblin, easy threat, 2 tiles east and 1 tile north of you."
      );
    });
  });

  it("records handled and unhandled backend message types in state", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "layout", message_pane: { height: 10 } });
      applyMessage({ msg: "new_backend_packet", sample: "value" });

      expect(state.backendMessageCounts.layout).toBe(1);
      expect(state.backendMessageCounts.new_backend_packet).toBe(1);
      expect(state.backendMessages.at(-1)).toMatchObject({
        msg: "new_backend_packet",
        handled: false,
        keys: ["sample"]
      });
      expect(state.lastUnhandledMessage?.msg).toBe("new_backend_packet");
    });
  });

  it("merges incremental inventory updates from player messages", () => {
    runWithState((state, applyMessage) => {
      applyMessage({
        msg: "player",
        inv: {
          "0": {
            name: "a +0 short sword",
            quantity: 1,
            action_panel_order: 1,
            action_verb: "Wield",
            sub_type: 12
          },
          "27": {
            name: "3 stones",
            quantity: 3,
            qty_field: "quantity",
            action_panel_order: 2,
            action_verb: "Throw",
            sub_type: 4
          }
        },
        weapon_index: 0,
        quiver_item: 27
      });

      expect(state.inventory).toHaveLength(2);
      expect(state.inventory[0]).toMatchObject({
        slot: 0,
        letter: "a",
        name: "a +0 short sword",
        quantity: 1,
        actionVerb: "Wield"
      });
      expect(state.inventory[1]).toMatchObject({
        slot: 27,
        letter: "B",
        quantityLabel: "3",
        actionVerb: "Throw"
      });
      expect(state.player?.weaponSlot).toBe(0);
      expect(state.player?.quiverSlot).toBe(27);

      applyMessage({
        msg: "player",
        inv: {
          "27": {
            quantity: 0
          }
        }
      });

      expect(state.inventory.map((item) => item.slot)).toEqual([0]);
    });
  });

  it("opens and updates Crawl menus", () => {
    runWithState((state, applyMessage) => {
      applyMessage({
        msg: "menu",
        tag: "inventory",
        title: { text: "Inventory" },
        total_items: 3,
        chunk_start: 0,
        items: [
          { level: 1, text: "Weapons" },
          { level: 2, text: "a - a +0 short sword", hotkeys: [97] }
        ]
      });

      expect(state.activeMenu?.title).toBe("Inventory");
      expect(state.activeMenu?.items).toHaveLength(2);
      expect(state.activeMenu?.items[1]).toMatchObject({
        index: 1,
        selectable: true,
        hotkeys: [97]
      });

      applyMessage({
        msg: "update_menu_items",
        chunk_start: 2,
        items: [
          { level: 2, text: "b - 3 stones", hotkeys: [98] }
        ]
      });

      expect(state.activeMenu?.items.map((item) => item.text)).toEqual([
        "Weapons",
        "a - a +0 short sword",
        "b - 3 stones"
      ]);

      applyMessage({ msg: "close_menu" });
      expect(state.activeMenu).toBeNull();
    });
  });

  it("keeps stale-process prompts active after game_started", () => {
    runWithState((state, applyMessage) => {
      applyMessage({ msg: "stale_processes", game: "Play trunk", timeout: 10 });
      applyMessage({ msg: "game_started" });

      expect(state.staleProcess).toEqual({ game: "Play trunk", timeout: 10 });
      expect(state.lastAnnouncement).toBe("Stale Play trunk process. Press any key to keep waiting.");
    });
  });
});
