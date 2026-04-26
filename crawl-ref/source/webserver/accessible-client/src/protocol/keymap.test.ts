import { describe, expect, it } from "vitest";

import { crawlKeyCode } from "./keymap";

describe("crawlKeyCode", () => {
  it("maps arrow keys to Crawl control key codes", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });

    expect(crawlKeyCode(event)).toBe(-254);
  });

  it("maps numpad keys using KeyboardEvent.code", () => {
    const event = new KeyboardEvent("keydown", { key: "1", code: "Numpad1" });

    expect(crawlKeyCode(event)).toBe(-1001);
  });
});
