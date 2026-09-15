import type { CommerceCart } from "@/lib/commerce/cart/types";
import { getStripeClientForApiKey } from "./stripe-client";
import type { StripeClientCredentials } from "./vault";
import type Stripe from "stripe";

export const toStripeCheckoutLineItems = (
  cart: CommerceCart,
): Stripe.Checkout.SessionCreateParams["line_items"] =>
  cart.items.map((item) => ({
    price_data: {
      currency: (cart.currency || "usd").toLowerCase(),
      unit_amount: Math.round((item.unitPrice ?? 0) * 100),
      product_data: {
        name: item.name,
        metadata: {
          ocProductId: item.productId,
          ocLineItemId: item.id,
        },
      },
    },
    quantity: item.quantity,
  }));

const toCancelUrl = (returnUrl: string): string =>
  new URL("/checkout/cancel", returnUrl).toString();

export const createHostedCheckoutSession = async (
  cart: CommerceCart,
  credentials: StripeClientCredentials,
  clientId: string,
): Promise<{ sessionId: string; url: string; orderId: string }> => {
  if (!cart.items.length) {
    throw new Error("Cart is empty");
  }

  const orderId = cart.id?.trim();
  if (!orderId) {
    throw new Error("Cart is missing an OrderCloud order id");
  }

  const stripe = getStripeClientForApiKey(credentials.apiKey);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: toStripeCheckoutLineItems(cart),
    automatic_tax: { enabled: true },
    success_url: credentials.returnUrl,
    cancel_url: toCancelUrl(credentials.returnUrl),
    metadata: {
      OrderID: orderId,
      ClientID: clientId,
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL");
  }

  return {
    sessionId: session.id,
    url: session.url,
    orderId,
  };
};
