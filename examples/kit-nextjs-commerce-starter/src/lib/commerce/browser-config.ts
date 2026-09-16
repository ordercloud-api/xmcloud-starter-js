export interface CommerceBrowserConfig {
  baseApiUrl: string;
  authCookieName: string;
  clientId: string;
  anonymousScope?: string;
  catalogId?: string;
}

export const DEFAULT_ORDERCLOUD_AUTH_COOKIE_NAME = 'oc_anonymous_token';
export const DEFAULT_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io';

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const isPlaceholder = (value: string): boolean => value.includes('<') || value.includes('>');

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
  const baseApiUrl =
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL?.trim() || DEFAULT_ORDERCLOUD_BASE_API_URL;

  try {
    new URL(baseApiUrl);
  } catch {
    throw new Error('Invalid NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL: expected an absolute URL');
  }

  const clientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID?.trim();
  if (!clientId || isPlaceholder(clientId)) {
    throw new Error(
      'Missing required OrderCloud environment variable: NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID'
    );
  }

  return {
    baseApiUrl: normalizeBaseUrl(baseApiUrl),
    authCookieName: getOrderCloudAuthCookieName(),
    clientId,
    anonymousScope: process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE?.trim() || undefined,
    catalogId: process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID?.trim() || undefined,
  };
};
