import { describe, expect, it } from "vitest";

import { scrollChildIntoView } from "./dom-scroll";

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 100,
    x: 0,
    y: top,
    width: 100,
    height: bottom - top,
    toJSON: () => ({})
  };
}

describe("scrollChildIntoView", () => {
  it("scrolls down when the child is below the container", () => {
    const container = document.createElement("div");
    const child = document.createElement("button");
    container.scrollTop = 10;
    container.getBoundingClientRect = () => rect(0, 40);
    child.getBoundingClientRect = () => rect(38, 58);

    scrollChildIntoView(container, child);

    expect(container.scrollTop).toBe(30);
  });

  it("scrolls up when the child is above the container", () => {
    const container = document.createElement("div");
    const child = document.createElement("button");
    container.scrollTop = 30;
    container.getBoundingClientRect = () => rect(20, 60);
    child.getBoundingClientRect = () => rect(10, 30);

    scrollChildIntoView(container, child);

    expect(container.scrollTop).toBe(18);
  });
});
