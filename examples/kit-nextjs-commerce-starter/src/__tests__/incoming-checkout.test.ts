import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("../lib/commerce/auth/client", () => ({
  orderCloudRequest: vi.fn(),
  requestMiddlewareOrderCloudToken: vi.fn(),
}));

import { orderCloudRequest, requestMiddlewareOrderCloudToken } from "../lib/commerce/auth/client";
import { completeIncomingCheckout } from "../lib/commerce/checkout/incoming";

const requestMock = vi.mocked(orderCloudRequest);
const tokenMock = vi.mocked(requestMiddlewareOrderCloudToken);

const session = {
  id: "cs_test_123",
  payment_status: "paid",
  status: "complete",
  amount_total: 2500,
  payment_intent: "pi_123",
  total_details: { amount_tax: 200, amount_shipping: 0 },
  metadata: { OrderID: "order-1", ClientID: "buyer-client-id" },
} as unknown as Stripe.Checkout.Session;

const originalMiddlewareId = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
const originalMiddlewareSecret = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;

describe("completeIncomingCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";
    tokenMock.mockResolvedValue({ accessToken: "mw-token", expiresIn: 3600 });
  });

  afterEach(() => {
    if (originalMiddlewareId === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = originalMiddlewareId;
    if (originalMiddlewareSecret === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
    else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = originalMiddlewareSecret;
  });

  it("skips Incoming pay/submit when middleware credentials are not configured", async () => {
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;

    await expect(completeIncomingCheckout(session)).resolves.toEqual({
      orderId: "order-1",
      idempotent: false,
      skipped: true,
    });
    expect(tokenMock).not.toHaveBeenCalled();
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("backfills TaxCost when Incoming is already Completed with $0 tax", async () => {
    requestMock
      .mockResolvedValueOnce({
        ID: "order-1",
        Status: "Open",
        TaxCost: 0,
        xp: { CheckoutStatus: "Completed" },
      })
      .mockResolvedValueOnce({});

    await expect(completeIncomingCheckout(session)).resolves.toEqual({
      orderId: "order-1",
      idempotent: true,
    });
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(requestMock.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
    expect(String(requestMock.mock.calls[1]?.[1]?.body)).toContain('"TaxCost":2');
  });

  it("does not re-patch costs when Incoming already has Stripe tax", async () => {
    requestMock.mockResolvedValueOnce({
      ID: "order-1",
      Status: "Open",
      TaxCost: 2,
      xp: { CheckoutStatus: "Completed" },
    });

    await expect(completeIncomingCheckout(session)).resolves.toEqual({
      orderId: "order-1",
      idempotent: true,
    });
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("records tax, payment, and submits the Incoming order", async () => {
    requestMock
      .mockResolvedValueOnce({ ID: "order-1", Status: "Unsubmitted", xp: { CheckoutStatus: "Pending" } })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValue({})
      .mockResolvedValue({})
      .mockResolvedValue({})
      .mockResolvedValue({});

    await expect(completeIncomingCheckout(session)).resolves.toEqual({
      orderId: "order-1",
      idempotent: false,
    });

    const paths = requestMock.mock.calls.map(([path]) => path);
    expect(paths).toContain("/v1/orders/Incoming/order-1");
    expect(paths).toContain("/v1/orders/Incoming/order-1/payments");
    expect(paths).toContain("/v1/orders/Incoming/order-1/submit");

    const paymentCall = requestMock.mock.calls.find(([, options]) => options.method === "POST" && (options.body as string)?.includes("CreditCard"));
    expect(paymentCall?.[1].body).toContain('"Accepted":true');
    expect(paymentCall?.[1].body).toContain("cs_test_123");

    const taxPatches = requestMock.mock.calls.filter(
      ([, options]) => options.method === "PATCH" && String(options.body).includes('"TaxCost":2'),
    );
    expect(taxPatches.length).toBeGreaterThan(0);
  });

  it("does not submit Outgoing when Incoming is missing and there is no shopper token", async () => {
    requestMock.mockRejectedValueOnce(new Error("Object not found."));

    await expect(completeIncomingCheckout(session)).rejects.toThrow("Object not found");
    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(requestMock.mock.calls.map(([path]) => path)).not.toContain(
      "/v1/orders/Outgoing/order-1/submit",
    );
  });

  it("submits Outgoing as the shopper when Incoming is not visible, then writes TaxCost", async () => {
    requestMock
      .mockRejectedValueOnce(new Error("Object not found."))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ ID: "order-1", Status: "Open", TaxCost: 0, xp: { CheckoutStatus: "Pending" } })
      .mockResolvedValueOnce({ Items: [] })
      .mockResolvedValue({});

    await expect(
      completeIncomingCheckout(session, { shopperToken: "shopper-token" }),
    ).resolves.toEqual({
      orderId: "order-1",
      idempotent: false,
    });

    expect(requestMock.mock.calls[0]?.[0]).toBe("/v1/orders/Incoming/order-1");
    expect(requestMock.mock.calls[1]?.[0]).toBe("/v1/orders/Outgoing/order-1/submit");
    expect(requestMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
    expect(requestMock.mock.calls[1]?.[2]).toBe("shopper-token");
    expect(requestMock.mock.calls[2]?.[0]).toBe("/v1/orders/Incoming/order-1");

    const taxPatches = requestMock.mock.calls.filter(
      ([, options]) => options.method === "PATCH" && String(options.body).includes('"TaxCost":2'),
    );
    expect(taxPatches.length).toBeGreaterThan(0);
    expect(requestMock.mock.calls.map(([path]) => path)).not.toContain(
      "/v1/orders/Incoming/order-1/submit",
    );
  });

  it("does not swallow TaxCost PATCH failures when Stripe charged tax", async () => {
    requestMock
      .mockResolvedValueOnce({ ID: "order-1", Status: "Unsubmitted", xp: { CheckoutStatus: "Pending" } })
      .mockResolvedValueOnce({ Items: [] })
      .mockRejectedValueOnce(new Error("Insufficient roles: OverrideTax"));

    await expect(completeIncomingCheckout(session)).rejects.toThrow("OverrideTax");

    const patches = requestMock.mock.calls.filter(([, options]) => options.method === "PATCH");
    expect(patches).toHaveLength(1);
    expect(String(patches[0]?.[1]?.body)).toContain('"TaxCost":2');
  });
});
