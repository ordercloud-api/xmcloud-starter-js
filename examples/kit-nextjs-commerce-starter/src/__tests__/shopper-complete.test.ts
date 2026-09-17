import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "ordercloud-javascript-sdk";
import type Stripe from "stripe";

vi.mock("../lib/commerce/auth/client", () => ({
  orderCloudRequest: vi.fn(),
}));

vi.mock("../lib/commerce/checkout/stripe-client", () => ({
  getStripeClientForApiKey: vi.fn(),
}));

vi.mock("../lib/commerce/checkout/vault", () => ({
  getStripeCredentialsForClientId: vi.fn(),
}));

import { orderCloudRequest } from "../lib/commerce/auth/client";
import { getStripeClientForApiKey } from "../lib/commerce/checkout/stripe-client";
import { getStripeCredentialsForClientId } from "../lib/commerce/checkout/vault";
import { syncShopperCheckoutFromStripe } from "../lib/commerce/checkout/shopper-complete";

const requestMock = vi.mocked(orderCloudRequest);
const vaultMock = vi.mocked(getStripeCredentialsForClientId);
const stripeClientMock = vi.mocked(getStripeClientForApiKey);

const paidSession = {
  id: "cs_test_123",
  payment_status: "paid",
  status: "complete",
} as Stripe.Checkout.Session;

describe("syncShopperCheckoutFromStripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultMock.mockReturnValue({
      apiKey: "sk_test",
      webhookSigningSecret: "whsec",
      returnUrl: "http://localhost:3000/checkout/success",
    });
    stripeClientMock.mockReturnValue({
      checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(paidSession) } },
    } as never);
  });

  it("returns the existing terminal status without calling Stripe", async () => {
    const order = {
      ID: "order-1",
      Status: "Open",
      xp: { CheckoutStatus: "Completed", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).resolves.toBe(
      "Completed",
    );
    expect(vaultMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("submits the Outgoing order and marks xp Completed when Stripe is paid", async () => {
    requestMock.mockResolvedValue({});
    const order = {
      ID: "order-1",
      Status: "Unsubmitted",
      xp: { CheckoutStatus: "Pending", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).resolves.toBe(
      "Completed",
    );

    expect(requestMock.mock.calls.map(([path]) => path)).toEqual([
      "/v1/orders/Outgoing/order-1/submit",
      "/v1/orders/Outgoing/order-1",
    ]);
    expect(requestMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
  });
});
