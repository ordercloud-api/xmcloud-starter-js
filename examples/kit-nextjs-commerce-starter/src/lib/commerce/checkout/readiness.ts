import { parseStripeVault } from "./vault";

export type CheckoutReadinessReport = {
  ready: boolean;
  webhookReady: boolean;
  checks: {
    stripeVault: boolean;
    stripeVaultBuyerClient: boolean;
    middlewareClientId: boolean;
    middlewareClientSecret: boolean;
    orderCloudBuyerClientId: boolean;
  };
  notes: string[];
};

const read = (name: string): string => process.env[name]?.trim() || "";

const isUsable = (value: string): boolean =>
  Boolean(value) && !value.includes("<") && !value.includes(">");

const resolvedBuyerClientId = (): string => {
  const serverClientId = read("ORDERCLOUD_BUYER_CLIENT_ID");
  if (isUsable(serverClientId)) return serverClientId;
  const publicClientId = read("NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID");
  if (isUsable(publicClientId)) return publicClientId;
  return "";
};

const readVaultState = (
  buyerClientId: string,
): { stripeVault: boolean; stripeVaultBuyerClient: boolean } => {
  const raw = read("CHECKOUT_STRIPE_VAULT_JSON");
  if (!raw) {
    return { stripeVault: false, stripeVaultBuyerClient: false };
  }

  try {
    const vault = parseStripeVault(raw);
    return {
      stripeVault: true,
      stripeVaultBuyerClient: Boolean(buyerClientId && vault[buyerClientId.toLowerCase()]),
    };
  } catch {
    return { stripeVault: false, stripeVaultBuyerClient: false };
  }
};

export const getCheckoutReadiness = (): CheckoutReadinessReport => {
  const buyerClientId = resolvedBuyerClientId();
  const vault = readVaultState(buyerClientId);
  const checks = {
    stripeVault: vault.stripeVault,
    stripeVaultBuyerClient: vault.stripeVaultBuyerClient,
    middlewareClientId: isUsable(read("ORDERCLOUD_MIDDLEWARE_CLIENT_ID")),
    middlewareClientSecret: isUsable(read("ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET")),
    orderCloudBuyerClientId: Boolean(buyerClientId),
  };

  const notes: string[] = [];
  if (!checks.stripeVault || !checks.stripeVaultBuyerClient) {
    notes.push(
      "Hosted checkout cannot start until CHECKOUT_STRIPE_VAULT_JSON has an entry for the buyer API client.",
    );
  }
  if (!checks.middlewareClientId || !checks.middlewareClientSecret) {
    notes.push(
      "Incoming webhook pay/submit is optional until OrderCloud middleware exists.",
    );
  }
  if (!checks.orderCloudBuyerClientId) {
    notes.push(
      "Shopper auth needs ORDERCLOUD_BUYER_CLIENT_ID or NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID.",
    );
  }

  return {
    ready: checks.stripeVault && checks.stripeVaultBuyerClient,
    webhookReady: checks.middlewareClientId && checks.middlewareClientSecret,
    checks,
    notes,
  };
};
