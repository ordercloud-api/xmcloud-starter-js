import { afterEach, describe, expect, it } from "vitest";
import { getCheckoutReadiness } from "../lib/commerce/checkout/readiness";

const originalVault = process.env.CHECKOUT_STRIPE_VAULT_JSON;
const originalPublicClientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
const originalMiddlewareId = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
const originalMiddlewareSecret = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
const originalStripeKey = process.env.STRIPE_SECRET_KEY;
const originalStripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;
const originalConnectedAccount = process.env.STRIPE_CONNECTED_ACCOUNT_ID;

const sampleVault = JSON.stringify({
  "buyer-client-id": {
    api_key: "sk_test_123",
    webhook_signing_secret: "whsec_123",
    return_url: "http://localhost:3000/checkout/success",
  },
});

const restore = (name: string, value: string | undefined): void => {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
};

afterEach(() => {
  restore("CHECKOUT_STRIPE_VAULT_JSON", originalVault);
  restore("NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID", originalPublicClientId);
  restore("ORDERCLOUD_MIDDLEWARE_CLIENT_ID", originalMiddlewareId);
  restore("ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET", originalMiddlewareSecret);
  restore("STRIPE_SECRET_KEY", originalStripeKey);
  restore("STRIPE_WEBHOOK_SECRET", originalStripeWebhook);
  restore("STRIPE_CONNECTED_ACCOUNT_ID", originalConnectedAccount);
});

describe("getCheckoutReadiness", () => {
  it("is ready when the vault has credentials for the buyer client", () => {
    process.env.CHECKOUT_STRIPE_VAULT_JSON = sampleVault;
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "buyer-client-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = "middleware-id";
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = "middleware-secret";

    expect(getCheckoutReadiness()).toMatchObject({
      ready: true,
      webhookReady: true,
      checks: {
        stripeVault: true,
        stripeVaultBuyerClient: true,
        middlewareClientId: true,
        middlewareClientSecret: true,
        orderCloudBuyerClientId: true,
      },
      notes: [],
    });
  });

  it("warns when the vault is missing the buyer client", () => {
    process.env.CHECKOUT_STRIPE_VAULT_JSON = sampleVault;
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "other-client";
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;

    const report = getCheckoutReadiness();
    expect(report.ready).toBe(false);
    expect(report.webhookReady).toBe(false);
    expect(report.checks.stripeVault).toBe(true);
    expect(report.checks.stripeVaultBuyerClient).toBe(false);
    expect(report.notes).toEqual(
      expect.arrayContaining([
        "Hosted checkout cannot start until CHECKOUT_STRIPE_VAULT_JSON has an entry for the buyer API client.",
        "Incoming webhook pay/submit is optional until OrderCloud middleware exists.",
      ]),
    );
  });

  it("is still ready without middleware credentials", () => {
    process.env.CHECKOUT_STRIPE_VAULT_JSON = sampleVault;
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "buyer-client-id";
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
    delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;

    const report = getCheckoutReadiness();
    expect(report.ready).toBe(true);
    expect(report.webhookReady).toBe(false);
    expect(report.notes).toEqual([
      "Incoming webhook pay/submit is optional until OrderCloud middleware exists.",
    ]);
  });

  it("does not treat Connect Stripe env as checkout readiness", () => {
    delete process.env.CHECKOUT_STRIPE_VAULT_JSON;
    process.env.STRIPE_SECRET_KEY = "sk_test_connect";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_connect";
    process.env.STRIPE_CONNECTED_ACCOUNT_ID = "acct_connect";
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "buyer-client-id";

    const report = getCheckoutReadiness();
    expect(report.ready).toBe(false);
    expect(report.checks.stripeVault).toBe(false);
  });
});
