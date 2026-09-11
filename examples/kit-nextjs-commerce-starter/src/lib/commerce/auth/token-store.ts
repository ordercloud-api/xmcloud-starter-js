import { getOrderCloudAuthCookieName } from '../browser-config';

const EXPIRATION_SKEW_MS = 60_000;

export interface StoredOrderCloudToken {
  accessToken: string;
  expiresAt: number;
}

const getCookieValue = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;

  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.substring(name.length + 1);
};

export const clearStoredOrderCloudToken = (): void => {
  if (typeof document === 'undefined') return;

  const cookieName = getOrderCloudAuthCookieName();
  document.cookie = `${cookieName}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const readStoredOrderCloudToken = (now = Date.now()): StoredOrderCloudToken | null => {
  const value = getCookieValue(getOrderCloudAuthCookieName());
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<StoredOrderCloudToken>;
    if (
      typeof parsed.accessToken !== 'string' ||
      !parsed.accessToken.trim() ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= now + EXPIRATION_SKEW_MS
    ) {
      clearStoredOrderCloudToken();
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    clearStoredOrderCloudToken();
    return null;
  }
};

export const writeStoredOrderCloudToken = (
  accessToken: string,
  expiresInSeconds: number,
  now = Date.now()
): StoredOrderCloudToken => {
  if (typeof document === 'undefined') {
    throw new Error('OrderCloud tokens can only be stored in a browser');
  }

  if (!accessToken.trim() || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error('OrderCloud token response was invalid');
  }

  const maxAge = Math.max(1, Math.floor(expiresInSeconds));
  const storedToken = {
    accessToken,
    expiresAt: now + maxAge * 1000,
  };
  const encodedToken = encodeURIComponent(JSON.stringify(storedToken));

  document.cookie = `${getOrderCloudAuthCookieName()}=${encodedToken}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  return storedToken;
};
