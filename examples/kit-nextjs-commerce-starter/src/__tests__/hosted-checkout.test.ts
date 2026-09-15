import { afterEach, describe, expect, it, vi } from "vitest";
import { startHostedCheckout } from "../lib/commerce/checkout/hosted";

const originalGateway = process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalGateway === undefined) delete process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;
  else process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL = originalGateway;
});

describe("startHostedCheckout", () => {
  it("posts the shopper Bearer token to the gateway checkout contract", async () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: "order-1", redirectUrl: "https://checkout.stripe.com/c/pay/cs_test" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(startHostedCheckout("shopper-token")).resolves.toEqual({
      orderId: "order-1",
      redirectUrl: "https://checkout.stripe.com/c/pay/cs_test",
    });

    expect(fetchMock).toHaveBeenCalledWith("/stripe/checkout", {
      method: "POST",
      headers: { Authorization: "Bearer shopper-token" },
    });
  });

  it("throws when checkout does not return a redirect URL", async () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: "Cart is empty" }),
      }),
    );

    await expect(startHostedCheckout("shopper-token")).rejects.toThrow("Cart is empty");
  });
});
