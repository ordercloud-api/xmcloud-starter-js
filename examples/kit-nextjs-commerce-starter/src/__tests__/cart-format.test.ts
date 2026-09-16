import { describe, expect, it } from "vitest";
import {
  formatMoney,
  lineTotal,
  toCartItemSpecLabels,
} from "../lib/commerce/cart/format";

describe("toCartItemSpecLabels", () => {
  it("formats name and value, prefers Value, and omits blanks", () => {
    expect(
      toCartItemSpecLabels([
        { specId: "SIZE", name: "Size", value: "Small" },
        { specId: "COLOR", name: "Color", value: "Red" },
        { specId: "BLANK" },
        { specId: "NOTE", name: "  ", value: "  " },
        { specId: "ENGRAVING", value: "Codex" },
      ]),
    ).toEqual(["Size: Small", "Color: Red", "Codex"]);
  });
});

describe("formatMoney", () => {
  it("formats a finite amount and falls back when missing", () => {
    const formatted = formatMoney(12.5, "USD");
    expect(formatted).not.toBe("—");
    expect(formatted).toMatch(/12/);
    expect(formatMoney(undefined, "USD")).toBe("—");
  });
});

describe("lineTotal", () => {
  it("multiplies quantity by unit price when both are usable", () => {
    expect(lineTotal(2, 12.5)).toBe(25);
    expect(lineTotal(2, undefined)).toBeUndefined();
  });
});
