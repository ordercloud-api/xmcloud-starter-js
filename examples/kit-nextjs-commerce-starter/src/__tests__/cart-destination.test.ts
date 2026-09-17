import { describe, expect, it } from "vitest";
import {
  CART_HREF_DEFAULT,
  getCartDestination,
  getCartDestinationFromRoute,
  isCartHref,
  isCartNavItem,
  isCartRoute,
  isShowCartLinkEnabled,
  normalizeCartPath,
  partitionNavigationItems,
  resolveCartButtonDestination,
} from "../lib/commerce/cart/destination";

describe("getCartDestination", () => {
  it("defaults to /cart when the param is missing", () => {
    expect(getCartDestination()).toEqual({ href: CART_HREF_DEFAULT });
    expect(getCartDestination({})).toEqual({ href: CART_HREF_DEFAULT });
  });

  it("reads CartPage from component params", () => {
    expect(getCartDestination({ CartPage: "/basket" })).toEqual({
      href: "/basket",
    });
  });

  it("parses the Sitecore Parameters string", () => {
    expect(getCartDestination({ Parameters: "CartPage=/basket" })).toEqual({
      href: "/basket",
    });
  });

  it("treats a GUID as an item id and keeps the default href", () => {
    expect(
      getCartDestination({
        CartPage: "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}",
      }),
    ).toEqual({
      href: CART_HREF_DEFAULT,
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
  });
});

describe("normalizeCartPath", () => {
  it("strips query, hash, trailing slash, and locale prefix", () => {
    expect(normalizeCartPath("/en/basket/?x=1#y")).toBe("/basket");
  });
});

describe("isCartHref / isCartNavItem", () => {
  it("matches a nav href to the authored destination", () => {
    const destination = { href: "/basket" };
    expect(isCartHref("/basket", destination)).toBe(true);
    expect(isCartHref("/en/basket/", destination)).toBe(true);
    expect(isCartHref("/checkout", destination)).toBe(false);
  });

  it("matches a nav item by id when the param is a GUID", () => {
    const destination = {
      href: CART_HREF_DEFAULT,
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    };
    expect(
      isCartNavItem(
        { Id: "{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}", Href: "/basket" },
        destination,
      ),
    ).toBe(true);
    expect(
      isCartNavItem({ Id: "other", Href: "/basket" }, destination),
    ).toBe(false);
  });
});

describe("partitionNavigationItems", () => {
  it("does not treat the last link as cart", () => {
    const items = [
      { Id: "1", Href: "/" },
      { Id: "2", Href: "/products" },
      { Id: "3", Href: "/about" },
    ];
    expect(
      partitionNavigationItems(items, { href: "/cart" }).primary,
    ).toEqual(items);
  });

  it("pulls the matching cart item out wherever it sits", () => {
    const cart = { Id: "2", Href: "/cart" };
    const items = [
      { Id: "1", Href: "/" },
      cart,
      { Id: "3", Href: "/about" },
    ];
    const { primary, cart: partitioned } = partitionNavigationItems(items, {
      href: "/cart",
    });
    expect(partitioned).toBe(cart);
    expect(primary.map((item) => item.Href)).toEqual(["/", "/about"]);
  });
});

describe("getCartDestinationFromRoute", () => {
  it("reads Navigation params from the header placeholder", () => {
    expect(
      getCartDestinationFromRoute({
        placeholders: {
          "headless-header": [
            {
              componentName: "Navigation",
              params: { CartPage: "/basket" },
            },
          ],
        },
      }),
    ).toEqual({ href: "/basket" });
  });
});

describe("isCartRoute", () => {
  it("matches the authored destination path segment", () => {
    expect(
      isCartRoute(
        { itemPath: "/sitecore/content/commerce/Basket" },
        { href: "/basket" },
      ),
    ).toBe(true);
    expect(
      isCartRoute(
        { name: "checkout", itemPath: "/sitecore/content/commerce/Checkout" },
        { href: "/cart" },
      ),
    ).toBe(false);
  });
});

describe("isShowCartLinkEnabled", () => {
  it("defaults to showing the cart label", () => {
    expect(isShowCartLinkEnabled()).toBe(true);
    expect(isShowCartLinkEnabled({})).toBe(true);
  });

  it("hides the label for Sitecore and HeaderST false values", () => {
    expect(isShowCartLinkEnabled({ ShowCartLink: "0" })).toBe(false);
    expect(isShowCartLinkEnabled({ ShowCartLink: "false" })).toBe(false);
    expect(isShowCartLinkEnabled({ Parameters: "ShowCartLink=0" })).toBe(false);
  });

  it("shows the label for 1 and true", () => {
    expect(isShowCartLinkEnabled({ ShowCartLink: "1" })).toBe(true);
    expect(isShowCartLinkEnabled({ "Show cart link": "true" })).toBe(true);
  });
});

describe("resolveCartButtonDestination", () => {
  it("prefers CartPage on the button over Navigation", () => {
    expect(
      resolveCartButtonDestination(
        { CartPage: "/basket" },
        {
          placeholders: {
            "headless-header": [
              { componentName: "Navigation", params: { CartPage: "/cart" } },
            ],
          },
        },
      ),
    ).toEqual({ href: "/basket" });
  });

  it("inherits Navigation CartPage when the button has none", () => {
    expect(
      resolveCartButtonDestination(
        {},
        {
          placeholders: {
            "headless-header": [
              { componentName: "Navigation", params: { CartPage: "/basket" } },
            ],
          },
        },
      ),
    ).toEqual({ href: "/basket" });
  });
});
