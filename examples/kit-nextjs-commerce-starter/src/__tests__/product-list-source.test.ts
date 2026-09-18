import { describe, expect, it } from "vitest";
import {
  parseProductReferenceList,
  serializeProductReferenceList,
} from "../lib/commerce/products/list-source";

describe("product list source", () => {
  it("parses picker JSON, arrays, and comma-separated IDs", () => {
    expect(
      parseProductReferenceList(
        serializeProductReferenceList([
          { id: "SKU-1", name: "One" },
          { id: "SKU/2", name: "Two" },
        ]),
      ),
    ).toEqual([
      { id: "SKU-1", name: "One" },
      { id: "SKU/2", name: "Two" },
    ]);
    expect(parseProductReferenceList({ id: "SKU-1", name: "One" })).toEqual([
      { id: "SKU-1", name: "One" },
    ]);
    expect(parseProductReferenceList("SKU-1, SKU-2")).toEqual([
      { id: "SKU-1" },
      { id: "SKU-2" },
    ]);
    expect(parseProductReferenceList(undefined)).toEqual([]);
    expect(
      parseProductReferenceList({
        targetItems: [{ ID: "SKU-3", Name: "Three" }],
      }),
    ).toEqual([{ id: "SKU-3", name: "Three" }]);
  });
});
