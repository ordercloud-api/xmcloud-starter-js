import { describe, expect, it } from "vitest";
import { buildProductDetailHref } from "../lib/commerce/products/href";
import { resolveProductId } from "../lib/commerce/products/reference";

describe("buildProductDetailHref", () => {
  it("returns undefined when the detail page or product ID is missing", () => {
    expect(buildProductDetailHref(undefined, "SKU-1")).toBeUndefined();
    expect(buildProductDetailHref("/products", undefined)).toBeUndefined();
    expect(buildProductDetailHref("  ", "SKU-1")).toBeUndefined();
    expect(buildProductDetailHref("/products", "  ")).toBeUndefined();
  });

  it("appends the product ID under the configured page", () => {
    expect(buildProductDetailHref("/products", "aj1-love-letter-201")).toBe(
      "/products/aj1-love-letter-201",
    );
  });

  it("strips trailing slashes before appending the product ID", () => {
    expect(buildProductDetailHref("/products/", "SKU-1")).toBe("/products/SKU-1");
    expect(buildProductDetailHref("/products///", "SKU-1")).toBe(
      "/products/SKU-1",
    );
  });

  it.each(["*", ",-w-,"])(
    "strips the Sitecore wildcard segment %s",
    (wildcard) => {
      expect(buildProductDetailHref(`/products/${wildcard}`, "SKU-1")).toBe(
        "/products/SKU-1",
      );
      expect(buildProductDetailHref(`/products/${wildcard}/`, "SKU-1")).toBe(
        "/products/SKU-1",
      );
    },
  );

  it("encodes product IDs so slashes survive as a single route segment", () => {
    expect(buildProductDetailHref("/products", "SKU/123")).toBe(
      "/products/SKU%2F123",
    );
  });

  it("preserves query strings and hashes on relative paths", () => {
    expect(buildProductDetailHref("/products?ref=list#gallery", "SKU-1")).toBe(
      "/products/SKU-1?ref=list#gallery",
    );
  });

  it("keeps origin, query, and hash on absolute http(s) URLs", () => {
    expect(
      buildProductDetailHref(
        "https://shop.example/en/products/*?ref=list#top",
        "SKU/123",
      ),
    ).toBe("https://shop.example/en/products/SKU%2F123?ref=list#top");
  });

  it("treats a site-root wildcard as /{productId}", () => {
    expect(buildProductDetailHref("/*", "SKU-1")).toBe("/SKU-1");
    expect(buildProductDetailHref("/", "SKU-1")).toBe("/SKU-1");
  });

  it("round-trips with last-url-segment product resolution", () => {
    const href = buildProductDetailHref("/shop/products/*", "SKU/123");
    expect(href).toBe("/shop/products/SKU%2F123");

    const routePath = href!.split("/").filter(Boolean);
    expect(
      resolveProductId({
        source: "last-url-segment",
        routePath,
        isAuthoring: false,
      }),
    ).toBe("SKU/123");
  });
});
