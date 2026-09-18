import { describe, expect, it } from "vitest";
import { toStripeCheckoutLineItems, toStripeSuccessUrl } from "../lib/commerce/checkout/session";
import type { CommerceCart } from "../lib/commerce/cart/types";

const cart: CommerceCart = {
  id: "order-1",
  status: "Unsubmitted",
  currency: "USD",
  isCalculated: true,
  items: [
    {
      id: "line-1",
      productId: "SKU-1",
      name: "Test product",
      quantity: 2,
      unitPrice: 12.5,
    },
  ],
};

describe("toStripeCheckoutLineItems", () => {
  it("maps cart lines to Stripe price_data", () => {
    expect(toStripeCheckoutLineItems(cart)).toEqual([
      {
        price_data: {
          currency: "usd",
          unit_amount: 1250,
          tax_behavior: "exclusive",
          product_data: {
            name: "Test product",
            metadata: {
              ocProductId: "SKU-1",
              ocLineItemId: "line-1",
            },
          },
        },
        quantity: 2,
      },
    ]);
  });

  it("puts Stripe's session id placeholder on the success URL", () => {
    expect(toStripeSuccessUrl("http://localhost:3000/checkout/success")).toBe(
      "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
    );
  });
});
