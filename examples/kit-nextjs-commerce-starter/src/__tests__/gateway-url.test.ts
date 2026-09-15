import { afterEach, describe, expect, it } from "vitest";
import { getCheckoutGatewayUrl } from "../lib/commerce/checkout/gateway-url";

const originalGateway = process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;

afterEach(() => {
  if (originalGateway === undefined) delete process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;
  else process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL = originalGateway;
});

describe("getCheckoutGatewayUrl", () => {
  it("uses same-origin contract paths when no override is set", () => {
    delete process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL;

    expect(getCheckoutGatewayUrl("/stripe/checkout")).toBe("/stripe/checkout");
    expect(getCheckoutGatewayUrl("stripe/status")).toBe("/stripe/status");
  });

  it("prefixes an explicit gateway origin", () => {
    process.env.NEXT_PUBLIC_CHECKOUT_GATEWAY_URL = "http://localhost:5001/";

    expect(getCheckoutGatewayUrl("/stripe/checkout")).toBe(
      "http://localhost:5001/stripe/checkout",
    );
  });
});
