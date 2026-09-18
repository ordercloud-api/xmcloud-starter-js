import { asNonEmptyString, asRecord } from "../normalization";

export type StripeClientCredentials = {
  apiKey: string;
  webhookSigningSecret: string;
  returnUrl: string;
};

const VAULT_ENV_NAME = "CHECKOUT_STRIPE_VAULT_JSON";

const unwrapEnvJson = (raw: string): string => {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseVaultJson = (raw: string): unknown => {
  const text = unwrapEnvJson(raw);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    try {
      return JSON.parse(Buffer.from(text, "base64").toString("utf8")) as unknown;
    } catch {
      throw new Error(`Invalid ${VAULT_ENV_NAME}: expected a JSON object`);
    }
  }
};

const requireField = (
  entry: Record<string, unknown>,
  field: string,
  clientId: string,
): string => {
  const value = asNonEmptyString(entry[field], { trim: true });
  if (!value) {
    throw new Error(
      `Missing required checkout configuration: ${VAULT_ENV_NAME}["${clientId}"].${field}`,
    );
  }
  return value;
};

const toCredentials = (
  clientId: string,
  value: unknown,
): StripeClientCredentials => {
  const entry = asRecord(value);
  if (!entry) {
    throw new Error(
      `Missing required checkout configuration: ${VAULT_ENV_NAME}["${clientId}"]`,
    );
  }

  return {
    apiKey: requireField(entry, "api_key", clientId),
    webhookSigningSecret: requireField(entry, "webhook_signing_secret", clientId),
    returnUrl: requireField(entry, "return_url", clientId),
  };
};

export const parseStripeVault = (
  raw: string,
): Record<string, StripeClientCredentials> => {
  const parsed = parseVaultJson(raw);

  const vault = asRecord(parsed);
  if (!vault) {
    throw new Error(`Invalid ${VAULT_ENV_NAME}: expected a JSON object`);
  }

  return Object.fromEntries(
    Object.entries(vault).map(([clientId, value]) => {
      const trimmedClientId = clientId.trim();
      if (!trimmedClientId) {
        throw new Error(`Invalid ${VAULT_ENV_NAME}: client id keys must be non-empty`);
      }
      return [trimmedClientId.toLowerCase(), toCredentials(trimmedClientId, value)];
    }),
  );
};

export const getStripeCredentialsForClientId = (
  clientId: string,
): StripeClientCredentials => {
  const normalizedClientId = clientId.trim().toLowerCase();
  if (!normalizedClientId) {
    throw new Error("OrderCloud API client id is required");
  }

  const raw = process.env[VAULT_ENV_NAME]?.trim();
  if (!raw) {
    throw new Error(`Missing required checkout configuration: ${VAULT_ENV_NAME}`);
  }

  const credentials = parseStripeVault(raw)[normalizedClientId];
  if (!credentials) {
    throw new Error(
      `Missing required checkout configuration: ${VAULT_ENV_NAME}["${normalizedClientId}"]`,
    );
  }

  return credentials;
};
