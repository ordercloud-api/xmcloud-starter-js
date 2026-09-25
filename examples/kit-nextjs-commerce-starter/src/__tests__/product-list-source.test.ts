import { describe, expect, it } from "vitest";
import {
  parseProductReferenceList,
  serializeProductReferenceList,
} from "../lib/commerce/products/list-source";

describe("product list source", () => {
  it("reads and writes newline-delimited IDs", () => {
    expect(
      parseProductReferenceList(
        serializeProductReferenceList([{ id: "SKU-1" }, { id: "SKU/2" }]),
      ),
    ).toEqual([{ id: "SKU-1" }, { id: "SKU/2" }]);
    expect(parseProductReferenceList("SKU-1\nSKU-2")).toEqual([
      { id: "SKU-1" },
      { id: "SKU-2" },
    ]);
    expect(parseProductReferenceList(undefined)).toEqual([]);
    expect(parseProductReferenceList('[{"id":"SKU-3"}]')).toEqual([]);
    expect(parseProductReferenceList({ id: "SKU-1" })).toEqual([]);
  });

  it("serializes multiple products as one ID per line", () => {
    expect(
      serializeProductReferenceList([{ id: "SKU-1" }, { id: "SKU-2" }]),
    ).toBe("SKU-1\nSKU-2");
  });
});
