import { describe, expect, it } from "vitest";
import type { NavigationLinkFields } from "../components/navigation/navigation.props";
import {
  flattenNavigationItems,
  getNavigationItems,
  isFlatNavigation,
  navigationIncludesCart,
  splitPrimaryAndUtilityItems,
} from "../components/navigation/navigation.utils";

const link = (
  id: string,
  name: string,
  href: string,
): NavigationLinkFields => ({
  Id: id,
  DisplayName: name,
  Href: href,
});

describe("getNavigationItems", () => {
  it("returns an empty list when fields are missing", () => {
    expect(getNavigationItems()).toEqual([]);
    expect(getNavigationItems({})).toEqual([]);
  });

  it("reads Sitecore navigation fields in authored order", () => {
    expect(
      getNavigationItems({
        home: link("1", "Home", "/"),
        products: link("2", "Products", "/products"),
      }).map((item) => item.DisplayName),
    ).toEqual(["Home", "Products"]);
  });
});

describe("flattenNavigationItems", () => {
  it("promotes descendants into the authored order without leaving dropdown children", () => {
    const products = link("2", "Products", "/products");
    const cart = link("3", "Cart", "/cart");
    const home = { ...link("1", "Home", "/"), Children: [products, cart] };

    const items = flattenNavigationItems([home]);

    expect(items.map((item) => item.DisplayName)).toEqual([
      "Home",
      "Products",
      "Cart",
    ]);
    expect(items.every((item) => item.Children === undefined)).toBe(true);
  });
});

describe("isFlatNavigation", () => {
  it("uses Sitecore checkbox string semantics", () => {
    expect(isFlatNavigation("1")).toBe(true);
    expect(isFlatNavigation("")).toBe(false);
    expect(isFlatNavigation(undefined)).toBe(false);
  });
});

describe("splitPrimaryAndUtilityItems", () => {
  it("keeps a single link in the primary group", () => {
    const items = [link("1", "Home", "/")];
    expect(splitPrimaryAndUtilityItems(items)).toEqual({ primary: items });
  });

  it("places the last authored link on the right as utility chrome", () => {
    const items = [
      link("1", "Home", "/"),
      link("2", "Products", "/products"),
      link("3", "Cart", "/cart"),
    ];
    const { primary, utility } = splitPrimaryAndUtilityItems(items);

    expect(primary.map((item) => item.DisplayName)).toEqual([
      "Home",
      "Products",
    ]);
    expect(utility?.DisplayName).toBe("Cart");
  });
});

describe("navigationIncludesCart", () => {
  it("finds a Cart href on a top-level or nested link", () => {
    expect(navigationIncludesCart([link("1", "Home", "/")])).toBe(false);
    expect(navigationIncludesCart([link("3", "Cart", "/cart")])).toBe(true);
    expect(
      navigationIncludesCart([
        { ...link("1", "Home", "/"), Children: [link("3", "Bag", "/cart")] },
      ]),
    ).toBe(true);
  });
});
