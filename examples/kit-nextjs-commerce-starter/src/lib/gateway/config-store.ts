import 'server-only';

export type StripeConfigKey = 'api_key' | 'webhook_signing_secret' | 'return_url';

export interface StripeClientConfig {
  marketplaceId?: string;
  apiKey?: string;
  webhookSigningSecret?: string;
  returnUrl?: string;
}

// PoC stand-in for the real gateway's Key Vault-backed, per-ApiClient secret store: an in-memory
// map seeded from local env vars. Not persisted across process restarts and not multi-instance safe.
const store = new Map<string, StripeClientConfig>();
let seeded = false;

const seedFromEnv = (): void => {
  if (seeded) return;
  seeded = true;

  const clientId = process.env.CHECKOUT_GATEWAY_DEFAULT_CLIENT_ID?.trim();
  if (!clientId) return;

  store.set(clientId, {
    marketplaceId: process.env.CHECKOUT_GATEWAY_DEFAULT_MARKETPLACE_ID?.trim() || undefined,
    apiKey: process.env.CHECKOUT_GATEWAY_DEFAULT_STRIPE_API_KEY?.trim() || undefined,
    webhookSigningSecret: process.env.CHECKOUT_GATEWAY_DEFAULT_STRIPE_WEBHOOK_SECRET?.trim() || undefined,
    returnUrl: process.env.CHECKOUT_GATEWAY_DEFAULT_RETURN_URL?.trim() || undefined,
  });
};

const configKeyToField: Record<StripeConfigKey, keyof StripeClientConfig> = {
  api_key: 'apiKey',
  webhook_signing_secret: 'webhookSigningSecret',
  return_url: 'returnUrl',
};

export const getStripeClientConfig = (clientId: string): StripeClientConfig | undefined => {
  seedFromEnv();
  return store.get(clientId);
};

export const setStripeConfigValue = (clientId: string, key: StripeConfigKey, value: string): void => {
  seedFromEnv();
  const existing = store.get(clientId) ?? {};
  store.set(clientId, { ...existing, [configKeyToField[key]]: value });
};

export const setMarketplaceOwner = (clientId: string, marketplaceId: string): void => {
  seedFromEnv();
  const existing = store.get(clientId) ?? {};
  store.set(clientId, { ...existing, marketplaceId });
};
