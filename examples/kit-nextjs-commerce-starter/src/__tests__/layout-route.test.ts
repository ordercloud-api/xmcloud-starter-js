import { describe, expect, it } from "vitest";
import {
  isCartRoute,
  isHomeRoute,
  isPlaceholderEmpty,
} from "../lib/layout-route";

describe("isHomeRoute", () => {
  it("matches home by name or display name", () => {
    expect(isHomeRoute({ name: "home" })).toBe(true);
    expect(isHomeRoute({ displayName: "Home" })).toBe(true);
    expect(isHomeRoute({ name: "products" })).toBe(false);
  });

  it("matches Sitecore item paths that end in Home", () => {
    expect(isHomeRoute({ itemPath: "/" })).toBe(true);
    expect(
      isHomeRoute({
        itemPath: "/sitecore/content/commerce/Home",
      }),
    ).toBe(true);
    expect(
      isHomeRoute({
        itemPath: "/sitecore/content/commerce/Products",
      }),
    ).toBe(false);
  });
});

describe("isCartRoute", () => {
  it("matches cart by name, display name, or path", () => {
    expect(isCartRoute({ name: "cart" })).toBe(true);
    expect(isCartRoute({ displayName: "Shopping Cart" })).toBe(true);
    expect(isCartRoute({ itemPath: "/sitecore/content/commerce/Cart" })).toBe(
      true,
    );
    expect(isCartRoute({ name: "products" })).toBe(false);
    expect(
      isCartRoute(
        { name: "checkout", itemPath: "/sitecore/content/commerce/Checkout" },
        { href: "/cart" },
      ),
    ).toBe(false);
  });
});

describe("isPlaceholderEmpty", () => {
  it("treats missing or empty placeholder arrays as empty", () => {
    expect(isPlaceholderEmpty({ placeholders: { "headless-main": [] } }, "headless-main")).toBe(
      true,
    );
    expect(isPlaceholderEmpty({}, "headless-main")).toBe(true);
    expect(
      isPlaceholderEmpty(
        { placeholders: { "headless-main": [{ componentName: "ShoppingCart" }] } },
        "headless-main",
      ),
    ).toBe(false);
  });
});
