export interface CommerceBrowserConfig {
  proxyBaseUrl: string;
  authCookieName: string;
  anonymousScope?: string;
  catalogId?: string;
}

export const DEFAULT_ORDERCLOUD_AUTH_COOKIE_NAME = 'oc_anonymous_token';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

export const getOrderCloudAuthCookieName = (): string => {
  const cookieName =
    process.env.NEXT_PUBLIC_ORDERCLOUD_AUTH_COOKIE_NAME?.trim() ||
    DEFAULT_ORDERCLOUD_AUTH_COOKIE_NAME;

  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(cookieName)) {
    throw new Error(
      'Invalid NEXT_PUBLIC_ORDERCLOUD_AUTH_COOKIE_NAME: expected a valid cookie name'
    );
  }

  return cookieName;
};

export const getCommerceBrowserConfig = (): CommerceBrowserConfig => {
  const proxyBaseUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL?.trim();
  if (!proxyBaseUrl) {
    throw new Error(
      'Missing required OrderCloud environment variable: NEXT_PUBLIC_ORDERCLOUD_PROXY_URL'
    );
  }

  try {
    new URL(proxyBaseUrl);
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_ORDERCLOUD_PROXY_URL: expected an absolute URL');
  }

  return {
    proxyBaseUrl: normalizeBaseUrl(proxyBaseUrl),
    authCookieName: getOrderCloudAuthCookieName(),
    anonymousScope: process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE?.trim() || undefined,
    catalogId: process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID?.trim() || undefined,
  };
};
