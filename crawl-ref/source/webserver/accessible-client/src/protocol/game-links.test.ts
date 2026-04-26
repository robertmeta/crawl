import { describe, expect, it } from "vitest";

import { parseGameLinks } from "./game-links";

describe("parseGameLinks", () => {
  it("extracts playable games and rc edit support from legacy lobby html", () => {
    const links = parseGameLinks(`
      Play now:
      <br>
      <a href="#play-dcss-web-trunk">Play trunk</a>
      <a href="javascript:" class="edit_rc_link" data-game_id="dcss-web-trunk">(edit rc)</a>
      |
      <a href="#play-seeded-web-trunk">Seeded</a>
    `);

    expect(links).toEqual([
      { id: "dcss-web-trunk", label: "Play trunk", rcEditable: true },
      { id: "seeded-web-trunk", label: "Seeded", rcEditable: false }
    ]);
  });
});
