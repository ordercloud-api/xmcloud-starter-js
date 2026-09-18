import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("../lib/commerce/checkout/incoming", () => ({
  completeIncomingCheckout: vi.fn(),
}));

import { orderCloudRequest } from "../lib/commerce/auth/client";
import { getStripeClientForApiKey } from "../lib/commerce/checkout/stripe-client";
import { getStripeCredentialsForClientId } from "../lib/commerce/checkout/vault";
import { completeIncomingCheckout } from "../lib/commerce/checkout/incoming";
import { syncShopperCheckoutFromStripe } from "../lib/commerce/checkout/shopper-complete";

const requestMock = vi.mocked(orderCloudRequest);
const vaultMock = vi.mocked(getStripeCredentialsForClientId);
const stripeClientMock = vi.mocked(getStripeClientForApiKey);
const incomingMock = vi.mocked(completeIncomingCheckout);

const paidSession = {
  id: "cs_test_123",
  payment_status: "paid",
  status: "complete",
} as Stripe.Checkout.Session;

const originalMiddlewareId = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
const originalMiddlewareSecret = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;

describe("syncShopperCheckoutFromStripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
    vaultMock.mockReturnValue({
      apiKey: "sk_test",
      webhookSigningSecret: "whsec",
      returnUrl: "http://localhost:3000/checkout/success",
    });
    stripeClientMock.mockReturnValue({
      checkout: { sessions: { retrieve: vi.fn().mockResolvedValue(paidSession) } },
    } as never);
  });

  afterEach(() => {
    if (originalMiddlewareId === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = originalMiddlewareId;
    if (originalMiddlewareSecret === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
    else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = originalMiddlewareSecret;
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

  it("returns terminal status when Incoming tax is already on the order", async () => {
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";
    const order = {
      ID: "order-1",
      Status: "Open",
      TaxCost: 47.04,
      xp: { CheckoutStatus: "Completed", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).resolves.toBe(
      "Completed",
    );
    expect(vaultMock).not.toHaveBeenCalled();
    expect(incomingMock).not.toHaveBeenCalled();
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
    expect(incomingMock).not.toHaveBeenCalled();
  });

  it("runs Incoming tax/pay/submit from the success poll when middleware is configured", async () => {
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";
    incomingMock.mockResolvedValue({ orderId: "order-1", idempotent: false });
    const order = {
      ID: "order-1",
      Status: "Unsubmitted",
      xp: { CheckoutStatus: "Pending", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).resolves.toBe(
      "Completed",
    );
    expect(incomingMock).toHaveBeenCalledWith(paidSession, { shopperToken: "token" });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("does not mark checkout complete without Incoming tax when fulfillment fails", async () => {
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";
    incomingMock.mockRejectedValue(new Error("Object not found."));
    const order = {
      ID: "order-1",
      Status: "Unsubmitted",
      xp: { CheckoutStatus: "Pending", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).rejects.toThrow(
      "Object not found.",
    );
    expect(incomingMock).toHaveBeenCalledWith(paidSession, { shopperToken: "token" });
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("backfills Incoming tax when xp is Completed but TaxCost is still 0", async () => {
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";
    incomingMock.mockResolvedValue({ orderId: "order-1", idempotent: true });
    const order = {
      ID: "order-1",
      Status: "Open",
      TaxCost: 0,
      xp: { CheckoutStatus: "Completed", stripeSessionId: "cs_test_123" },
    } as Order;

    await expect(syncShopperCheckoutFromStripe(order, "token", "client-id")).resolves.toBe(
      "Completed",
    );
    expect(incomingMock).toHaveBeenCalledWith(paidSession, { shopperToken: "token" });
  });
});
