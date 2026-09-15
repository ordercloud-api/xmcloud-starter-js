import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("../lib/commerce/auth/client", () => ({
  orderCloudRequest: vi.fn(),
  orderCloudTokenRequest: vi.fn(),
}));

vi.mock("../lib/commerce/auth/config", () => ({
  commerceAuthConfig: {
    middlewareClientId: "middleware-id",
    middlewareClientSecret: "middleware-secret",
    middlewareScope: "OrderAdmin",
  },
}));

import { orderCloudRequest, orderCloudTokenRequest } from "../lib/commerce/auth/client";
import { completeIncomingCheckout } from "../lib/commerce/checkout/incoming";

const requestMock = vi.mocked(orderCloudRequest);
const tokenMock = vi.mocked(orderCloudTokenRequest);

const session = {
  id: "cs_test_123",
  payment_status: "paid",
  status: "complete",
  amount_total: 2500,
  payment_intent: "pi_123",
  total_details: { amount_tax: 200, amount_shipping: 0 },
  metadata: { OrderID: "order-1", ClientID: "buyer-client-id" },
} as unknown as Stripe.Checkout.Session;

describe("completeIncomingCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenMock.mockResolvedValue({ access_token: "mw-token", expires_in: 3600 });
  });

  it("no-ops when Incoming xp.CheckoutStatus is already terminal", async () => {
    requestMock.mockResolvedValueOnce({
      ID: "order-1",
      Status: "Open",
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
  });
});
