import { describe, expect, it } from "vitest";
import {
  asBoolean,
  getProductListParam,
  getPageNumbers,
  mergeProductListFilters,
  mergeProductFacets,
  normalizeMaxProductsPerRow,
  normalizeOptionalText,
  normalizePaginationStyle,
  normalizeProductListPageSize,
  normalizeSearchPlaceholder,
  parseProductFilters,
  parseProductSortOptions,
  splitProductFilters,
  toProductListFilters,
} from "../lib/commerce/products/product-list-config";

describe("product list configuration", () => {
  it("reads both display labels and compact Sitecore parameter names", () => {
    expect(
      getProductListParam(
        { SortOptions: "Featured=!xp.Featured" },
        "Sort Options",
      ),
    ).toBe("Featured=!xp.Featured");
    expect(
      getProductListParam(
        { "Product Filters": "Active=true" },
        "Product Filters",
      ),
    ).toBe("Active=true");
    expect(
      getProductListParam({ ProductFilters: "Active=true" }, "Product Filters"),
    ).toBe("Active=true");
  });

  it("normalizes Sitecore checkbox values", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean("1")).toBe(true);
    expect(asBoolean("checked")).toBe(true);
    expect(asBoolean("false", true)).toBe(false);
    expect(asBoolean(undefined)).toBe(false);
  });

  it("normalizes pagination style labels and values", () => {
    expect(normalizePaginationStyle("Standard")).toBe("standard");
    expect(normalizePaginationStyle("Infinite Scroll")).toBe("infinite");
    expect(normalizePaginationStyle("none")).toBe("none");
    expect(normalizePaginationStyle("")).toBe("standard");
    expect(normalizePaginationStyle(undefined)).toBe("standard");
    expect(normalizePaginationStyle("First Results Only")).toBe("standard");
    expect(normalizePaginationStyle("unknown")).toBe("standard");
  });

  it("defaults and clamps the result count", () => {
    expect(normalizeProductListPageSize(undefined)).toBe(12);
    expect(normalizeProductListPageSize("24")).toBe(24);
    expect(normalizeProductListPageSize(1)).toBe(4);
    expect(normalizeProductListPageSize(200)).toBe(48);
  });

  it("defaults the search placeholder", () => {
    expect(normalizeSearchPlaceholder(" Find shoes ")).toBe("Find shoes");
    expect(normalizeSearchPlaceholder(" ")).toBe("Search products");
  });

  it("normalizes optional editor text and the product column limit", () => {
    expect(normalizeOptionalText(" catalog-one ")).toBe("catalog-one");
    expect(normalizeOptionalText(" ")).toBeUndefined();
    expect(normalizeMaxProductsPerRow(undefined)).toBe(3);
    expect(normalizeMaxProductsPerRow("5")).toBe(5);
    expect(normalizeMaxProductsPerRow(1)).toBe(2);
    expect(normalizeMaxProductsPerRow(20)).toBe(6);
  });

  it("parses authored product filters and preserves repeated-key ANDs", () => {
    expect(
      parseProductFilters(
        "xp.Facets.Brand=Nike|Jordan\nxp.Price=!<50\nxp.Price=!>150",
      ),
    ).toEqual({
      filters: {
        "xp.Facets.Brand": "Nike|Jordan",
        "xp.Price": ["!<50", "!>150"],
      },
      errors: [],
    });
    expect(parseProductFilters("bad line\nxp.Bad Key=value")).toEqual({
      filters: undefined,
      errors: [
        "Line 1 must use Field=Value.",
        "Line 2 has an invalid field path.",
      ],
    });
  });

  it("promotes simple authored facet filters but keeps complex filters baked in", () => {
    expect(
      splitProductFilters(
        {
          "xp.Facets.Brand": "Nike|Jordan",
          "xp.Facets.Activity": "!Running",
          "xp.Price": ["!<50", "!>150"],
        },
        [
          { name: "Brand", xpPath: "Facets.Brand", values: [] },
          { name: "Activity", xpPath: "Facets.Activity", values: [] },
        ],
      ),
    ).toEqual({
      hiddenFilters: {
        "xp.Facets.Activity": "!Running",
        "xp.Price": ["!<50", "!>150"],
      },
      editableFacetDefaults: {
        "Facets.Brand": ["Nike", "Jordan"],
      },
    });
  });

  it("ANDs baked-in filters with shopper facet selections", () => {
    expect(
      mergeProductListFilters(
        { "xp.Facets.Brand": "Nike", Active: true },
        { "xp.Facets.Brand": "Jordan", "xp.Facets.Activity": "Running" },
      ),
    ).toEqual({
      "xp.Facets.Brand": ["Nike", "Jordan"],
      Active: true,
      "xp.Facets.Activity": "Running",
    });
  });

  it("parses editor-defined sort labels and OrderCloud expressions in order", () => {
    expect(
      parseProductSortOptions(
        "Default product order=\nFeatured=!xp.Featured\nName: A–Z=Name\nPrice then name=!xp.Price,Name",
      ),
    ).toEqual({
      options: [
        { label: "Default product order", value: "", sortBy: undefined },
        {
          label: "Featured",
          value: "!xp.Featured",
          sortBy: ["!xp.Featured"],
        },
        { label: "Name: A–Z", value: "Name", sortBy: ["Name"] },
        {
          label: "Price then name",
          value: "!xp.Price,Name",
          sortBy: ["!xp.Price", "Name"],
        },
      ],
      errors: [],
    });
    expect(parseProductSortOptions(undefined)).toEqual({
      options: [],
      errors: [],
    });
  });

  it("reports invalid or ambiguous sort options", () => {
    const result = parseProductSortOptions(
      "Missing separator\nFeatured=!xp.Featured\nFeatured=Name\nAlso featured=!xp.Featured\nInvalid=xp.Price desc",
    );

    expect(result.options).toEqual([
      {
        label: "Featured",
        value: "!xp.Featured",
        sortBy: ["!xp.Featured"],
      },
    ]);
    expect(result.errors).toHaveLength(4);
  });

  it("ORs values within a facet while leaving different facets separate", () => {
    expect(
      toProductListFilters({
        "Facets.Brand": ["nike", "jordan"],
        "xp.Facets.Activity": ["running"],
      }),
    ).toEqual({
      "xp.Facets.Brand": "nike|jordan",
      "xp.Facets.Activity": "running",
    });
    expect(toProductListFilters({ "Facets.Brand": [] })).toBeUndefined();
  });

  it("keeps discovered facet values available when filtered metadata narrows", () => {
    expect(
      mergeProductFacets(
        [
          {
            name: "Brand",
            xpPath: "Facets.Brand",
            values: [
              { value: "nike", count: 7 },
              { value: "jordan", count: 3 },
            ],
          },
        ],
        [
          {
            name: "Brand",
            xpPath: "Facets.Brand",
            values: [{ value: "nike", count: 7 }],
          },
        ],
      ),
    ).toEqual([
      {
        name: "Brand",
        xpPath: "Facets.Brand",
        values: [
          { value: "nike", count: 7 },
          { value: "jordan", count: 3 },
        ],
      },
    ]);
  });

  it("returns a bounded set of page numbers", () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(getPageNumbers(8, 24)).toEqual([1, 7, 8, 9, 24]);
  });
});
