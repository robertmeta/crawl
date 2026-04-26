import { describe, expect, it } from "vitest";

import { crawlAltInputData, crawlKeyCode, crawlPrintableInput, unsupportedClientShortcut } from "./keymap";

describe("crawlKeyCode", () => {
  it("maps arrow keys to Crawl control key codes", () => {
    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });

    expect(crawlKeyCode(event)).toBe(-254);
  });

  it("maps numpad keys using KeyboardEvent.code", () => {
    const event = new KeyboardEvent("keydown", { key: "1", code: "Numpad1" });

    expect(crawlKeyCode(event)).toBe(-1001);
  });

  it("maps unmodified function keys reserved for Crawl", () => {
    const event = new KeyboardEvent("keydown", { key: "F1", code: "F1" });

    expect(crawlKeyCode(event)).toBe(-265);
  });

  it("maps Delete without requiring KeyboardEvent.code", () => {
    const event = new KeyboardEvent("keydown", { key: "Delete" });

    expect(crawlKeyCode(event)).toBe(-255);
  });

  it("keeps modified special keys distinct from unmodified code mappings", () => {
    const event = new KeyboardEvent("keydown", { key: "Delete", code: "Delete", shiftKey: true });

    expect(crawlKeyCode(event)).toBe(-203);
  });

  it("maps modified numpad navigation like legacy WebTiles", () => {
    const shiftEvent = new KeyboardEvent("keydown", { key: "1", code: "Numpad1", shiftKey: true });
    const ctrlEvent = new KeyboardEvent("keydown", { key: "1", code: "Numpad1", ctrlKey: true });
    const ctrlShiftEvent = new KeyboardEvent("keydown", {
      key: "1",
      code: "Numpad1",
      ctrlKey: true,
      shiftKey: true
    });

    expect(crawlKeyCode(shiftEvent)).toBe(-237);
    expect(crawlKeyCode(ctrlEvent)).toBe(-226);
    expect(crawlKeyCode(ctrlShiftEvent)).toBe(-215);
  });

  it("maps captured Ctrl letter commands to Crawl control codes", () => {
    const event = new KeyboardEvent("keydown", { key: "o", ctrlKey: true });

    expect(crawlKeyCode(event)).toBe(15);
  });

  it("maps captured Ctrl digit commands like legacy WebTiles", () => {
    const event = new KeyboardEvent("keydown", { key: "1", ctrlKey: true });

    expect(crawlKeyCode(event)).toBe(-15);
  });

  it("maps Alt character commands to escape-prefixed input data", () => {
    const event = new KeyboardEvent("keydown", { key: "a", altKey: true });

    expect(crawlAltInputData(event)).toEqual([27, 97]);
  });

  it("maps shifted printable commands from keydown", () => {
    const event = new KeyboardEvent("keydown", { key: ">", code: "Period", shiftKey: true });

    expect(crawlPrintableInput(event)).toEqual({ text: ">" });
  });

  it("maps literal braces to raw input data like legacy WebTiles", () => {
    const event = new KeyboardEvent("keydown", { key: "{" });

    expect(crawlPrintableInput(event)).toEqual({ data: [123] });
  });

  it("does not treat control commands as printable input", () => {
    const event = new KeyboardEvent("keydown", { key: "o", ctrlKey: true });

    expect(crawlPrintableInput(event)).toBeUndefined();
  });

  it("reports unsupported client-only shortcuts", () => {
    const event = new KeyboardEvent("keydown", { key: "F12" });

    expect(unsupportedClientShortcut(event)).toBe("chat shortcut");
  });
});
