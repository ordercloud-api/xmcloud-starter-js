import { afterEach, describe, expect, it } from "vitest";
import {
  getStripeCredentialsForClientId,
  parseStripeVault,
} from "../lib/commerce/checkout/vault";

const originalVault = process.env.CHECKOUT_STRIPE_VAULT_JSON;

const sampleVault = JSON.stringify({
  "buyer-client-id": {
    api_key: "sk_test_123",
    webhook_signing_secret: "whsec_123",
    return_url: "http://localhost:3000/checkout/success",
  },
});

afterEach(() => {
  if (originalVault === undefined) delete process.env.CHECKOUT_STRIPE_VAULT_JSON;
  else process.env.CHECKOUT_STRIPE_VAULT_JSON = originalVault;
});

describe("checkout Stripe vault", () => {
  it("parses per-client Stripe credentials from JSON", () => {
    expect(parseStripeVault(sampleVault)).toEqual({
      "buyer-client-id": {
        apiKey: "sk_test_123",
        webhookSigningSecret: "whsec_123",
        returnUrl: "http://localhost:3000/checkout/success",
      },
    });
  });

  it("looks up credentials by OrderCloud API client id", () => {
    process.env.CHECKOUT_STRIPE_VAULT_JSON = sampleVault;

    expect(getStripeCredentialsForClientId(" buyer-client-id ")).toEqual({
      apiKey: "sk_test_123",
      webhookSigningSecret: "whsec_123",
      returnUrl: "http://localhost:3000/checkout/success",
    });
  });

  it("rejects missing env, invalid JSON, and unknown client ids", () => {
    delete process.env.CHECKOUT_STRIPE_VAULT_JSON;
    expect(() => getStripeCredentialsForClientId("buyer-client-id")).toThrow(
      "Missing required checkout configuration: CHECKOUT_STRIPE_VAULT_JSON",
    );

    expect(() => parseStripeVault("{")).toThrow(
      "Invalid CHECKOUT_STRIPE_VAULT_JSON: expected a JSON object",
    );

    process.env.CHECKOUT_STRIPE_VAULT_JSON = sampleVault;
    expect(() => getStripeCredentialsForClientId("other-client")).toThrow(
      'Missing required checkout configuration: CHECKOUT_STRIPE_VAULT_JSON["other-client"]',
    );
  });
});
