import 'server-only';

const read = (key: string): string => process.env[key]?.trim() || '';

const normalize = (url: string): string => url.replace(/\/$/, '');

export const commerceAuthConfig = {
  get baseApiUrl(): string {
    return normalize(read('NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL') || 'https://sandboxapi.ordercloud.io');
  },
  get middlewareClientId(): string {
    return read('ORDERCLOUD_MIDDLEWARE_CLIENT_ID');
  },
  get middlewareClientSecret(): string {
    return read('ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET');
  },
  get middlewareScope(): string {
    return read('ORDERCLOUD_MIDDLEWARE_SCOPE') || 'OrderAdmin OverrideTax OverrideShipping';
  },
};

export const isMiddlewareConfigured = (): boolean =>
  Boolean(commerceAuthConfig.middlewareClientId && commerceAuthConfig.middlewareClientSecret);
