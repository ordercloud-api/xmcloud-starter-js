import { describe, expect, it } from "vitest";
import { toCommerceCart } from "../lib/commerce/cart/mapper";

const order = {
  ID: "cart-1",
  Status: "Unsubmitted" as const,
  Currency: "USD",
  Subtotal: 25,
  Total: 27,
  IsCalculated: true,
};

describe("toCommerceCart line items", () => {
  it("maps the primary image Thumbnailurl from Product.xp.Images", () => {
    const cart = toCommerceCart(order, {
      Items: [
        {
          ID: "line-1",
          ProductID: "SKU-1",
          Product: {
            Name: "Configured product",
            xp: {
              Images: [
                { Url: "https://images.example.test/detail.jpg" },
                {
                  Url: "https://images.example.test/primary.jpg",
                  Thumbnailurl: "https://images.example.test/primary-thumb.jpg",
                  Primary: true,
                },
              ],
            },
          },
          Quantity: 1,
          UnitPrice: 10,
        },
      ],
    });

    expect(cart.items[0]).toMatchObject({
      id: "line-1",
      productId: "SKU-1",
      name: "Configured product",
      imageUrl: "https://images.example.test/primary.jpg",
      thumbnailUrl: "https://images.example.test/primary-thumb.jpg",
    });
  });

  it("falls back to Url when Thumbnailurl is missing", () => {
    const cart = toCommerceCart(order, {
      Items: [
        {
          ID: "line-1",
          ProductID: "SKU-1",
          Product: {
            Name: "Configured product",
            xp: {
              Images: [{ Url: "https://images.example.test/first.jpg" }],
            },
          },
          Quantity: 1,
        },
      ],
    });

    expect(cart.items[0]).toMatchObject({
      imageUrl: "https://images.example.test/first.jpg",
      thumbnailUrl: "https://images.example.test/first.jpg",
    });
  });

  it("omits image fields when xp.Images is missing", () => {
    const cart = toCommerceCart(order, {
      Items: [
        {
          ID: "line-1",
          ProductID: "SKU-1",
          Product: { Name: "Configured product" },
          Quantity: 2,
          UnitPrice: 12.5,
        },
      ],
    });

    expect(cart.items[0]).toEqual({
      id: "line-1",
      productId: "SKU-1",
      name: "Configured product",
      quantity: 2,
      unitPrice: 12.5,
    });
  });

  it("maps selected specs and omits entries without a SpecID", () => {
    const cart = toCommerceCart(order, {
      Items: [
        {
          ID: "line-1",
          ProductID: "SKU-1",
          Product: { Name: "Configured product" },
          Quantity: 1,
          Specs: [
            {
              SpecID: "SIZE",
              Name: "Size",
              OptionID: "SMALL",
              Value: "Small",
            },
            {
              SpecID: "COLOR",
              Name: "Color",
              OptionID: "RED",
              OptionValue: "Red",
            },
            { Name: "Orphan option" },
            { SpecID: "   " },
          ],
        },
      ],
    });

    expect(cart.items[0].specs).toEqual([
      {
        specId: "SIZE",
        name: "Size",
        optionId: "SMALL",
        value: "Small",
      },
      {
        specId: "COLOR",
        name: "Color",
        optionId: "RED",
        value: "Red",
      },
    ]);
  });
});
