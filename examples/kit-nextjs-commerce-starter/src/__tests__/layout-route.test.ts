import { describe, expect, it } from "vitest";
import { isHomeRoute } from "../lib/layout-route";

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
