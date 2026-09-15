import { describe, expect, it } from "vitest";
import {
  FEATURED_PRODUCT_LIMIT,
  limitItems,
  normalizeProductListSource,
  parseProductReferenceList,
  resolveProductListSource,
  serializeProductReferenceList,
} from "../lib/commerce/products/list-source";

describe("product list source", () => {
  it("normalizes catalog, picker, and Sitecore sources", () => {
    expect(normalizeProductListSource("OrderCloud Catalog")).toBe(
      "ordercloud-catalog",
    );
    expect(normalizeProductListSource("ordercloud-picker")).toBe(
      "ordercloud-picker",
    );
    expect(normalizeProductListSource("Sitecore treelist")).toBe("sitecore");
    expect(normalizeProductListSource("")).toBeUndefined();
    expect(normalizeProductListSource("something else")).toBeUndefined();
  });

  it("defaults to Sitecore items when present, otherwise the live catalog", () => {
    expect(
      resolveProductListSource({ hasSitecoreProducts: true }),
    ).toBe("sitecore");
    expect(
      resolveProductListSource({ hasSitecoreProducts: false }),
    ).toBe("ordercloud-catalog");
    expect(
      resolveProductListSource({
        configured: "ordercloud-picker",
        hasSitecoreProducts: true,
      }),
    ).toBe("ordercloud-picker");
    expect(
      resolveProductListSource({
        configured: "sitecore",
        hasSitecoreProducts: false,
      }),
    ).toBe("sitecore");
  });

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

  it("limits featured lists without mutating the source array", () => {
    const items = ["a", "b", "c", "d"];
    expect(limitItems(items, FEATURED_PRODUCT_LIMIT)).toEqual(["a", "b", "c"]);
    expect(items).toEqual(["a", "b", "c", "d"]);
    expect(limitItems(items, undefined)).toEqual(items);
    expect(limitItems(items, 0)).toEqual(items);
  });
});
