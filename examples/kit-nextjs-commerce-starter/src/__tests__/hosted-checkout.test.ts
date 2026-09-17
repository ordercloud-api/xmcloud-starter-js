import { afterEach, describe, expect, it, vi } from "vitest";
import { startHostedCheckout } from "../lib/commerce/checkout/hosted";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startHostedCheckout", () => {
  it("posts the shopper Bearer token to /stripe/checkout", async () => {
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
