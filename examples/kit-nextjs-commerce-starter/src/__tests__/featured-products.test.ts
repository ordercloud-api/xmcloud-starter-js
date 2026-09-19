import { describe, expect, it } from "vitest";
import {
  getFeaturedProductIds,
  getFeaturedProductsCallToAction,
  getFeaturedProductsHeading,
  getFeaturedProductsSettings,
  hasFeaturedProductsCallToAction,
} from "../lib/commerce/products/featured-products";

describe("featured products configuration", () => {
  it("reads layout-service fields and preserves picker order", () => {
    const fields = {
      Heading: { value: "Staff picks" },
      Products: {
        value: JSON.stringify([
          { id: "P-2", name: "Second" },
          { id: "P-1", name: "First" },
        ]),
      },
      "Call To Action": {
        value: { href: "/products", text: "Shop all" },
      },
    };

    expect(getFeaturedProductIds(fields)).toEqual(["P-2", "P-1"]);
    expect(getFeaturedProductsHeading(fields)).toEqual({
      value: "Staff picks",
    });
    expect(getFeaturedProductsCallToAction(fields)).toEqual({
      value: { href: "/products", text: "Shop all" },
    });
  });

  it("reads GraphQL datasource fields and normalizes rendering parameters", () => {
    const fields = {
      data: {
        datasource: {
          heading: { jsonValue: { value: "New arrivals" } },
          products: {
            jsonValue: { value: '[{"id":"P-3"},{"id":"P-4"}]' },
          },
          callToAction: {
            jsonValue: {
              value: { href: "/catalog", text: "Browse catalog" },
            },
          },
        },
      },
    };

    expect(getFeaturedProductIds(fields)).toEqual(["P-3", "P-4"]);
    expect(getFeaturedProductsHeading(fields)?.value).toBe("New arrivals");
    expect(getFeaturedProductsCallToAction(fields)?.value.href).toBe(
      "/catalog",
    );
    expect(
      getFeaturedProductsSettings({
        maximumProductsPerRow: "6",
        productDetailPagePath: "/shop/products",
      }),
    ).toEqual({
      detailPageHref: "/shop/products",
      maxProductsPerRow: 6,
    });
  });

  it("uses featured-product defaults", () => {
    expect(getFeaturedProductsSettings({})).toEqual({
      detailPageHref: "/products",
      maxProductsPerRow: 4,
    });
  });

  it("requires both CTA text and a CTA destination", () => {
    expect(
      hasFeaturedProductsCallToAction({
        value: { href: "/products", text: "View all" },
      }),
    ).toBe(true);
    expect(
      hasFeaturedProductsCallToAction({
        value: { href: "/products", text: "" },
      }),
    ).toBe(false);
    expect(
      hasFeaturedProductsCallToAction({
        value: { href: "", text: "View all" },
      }),
    ).toBe(false);
  });
});
