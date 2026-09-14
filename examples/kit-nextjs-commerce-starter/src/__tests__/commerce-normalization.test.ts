import { describe, expect, it } from "vitest";
import {
  asFiniteNumber,
  asNonEmptyString,
  asRecord,
} from "../lib/commerce/normalization";

describe("commerce normalization", () => {
  it("rejects blank strings and only trims when requested", () => {
    expect(asNonEmptyString("  value  ")).toBe("  value  ");
    expect(asNonEmptyString("  value  ", { trim: true })).toBe("value");
    expect(asNonEmptyString("   ")).toBeUndefined();
  });

  it("keeps SDK numbers strict while allowing explicit XP coercion", () => {
    expect(asFiniteNumber(12.5)).toBe(12.5);
    expect(asFiniteNumber("12.5")).toBeUndefined();
    expect(asFiniteNumber("12.5", { allowNumericString: true })).toBe(12.5);
    expect(asFiniteNumber(Number.NaN)).toBeUndefined();
  });

  it("accepts plain records but rejects arrays and null", () => {
    expect(asRecord({ id: "P-1" })).toEqual({ id: "P-1" });
    expect(asRecord([])).toBeUndefined();
    expect(asRecord(null)).toBeUndefined();
  });
});
