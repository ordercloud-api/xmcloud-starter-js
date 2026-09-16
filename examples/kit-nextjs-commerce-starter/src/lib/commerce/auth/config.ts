import 'server-only';

const read = (key: string): string => process.env[key]?.trim() || '';

const normalize = (url: string): string => url.replace(/\/$/, '');

const resolvedClientId = (): string => {
  const clientId = read('ORDERCLOUD_BUYER_CLIENT_ID');
  if (clientId && !clientId.includes('<') && !clientId.includes('>')) {
    return clientId;
  }

  const publicClientId = read('NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID');
  if (publicClientId && !publicClientId.includes('<') && !publicClientId.includes('>')) {
    return publicClientId;
  }

  throw new Error(
    'Missing required OrderCloud configuration: ORDERCLOUD_BUYER_CLIENT_ID or NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID'
  );
};

export const commerceAuthConfig = {
  get baseApiUrl(): string {
    return normalize(read('NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL') || 'https://sandboxapi.ordercloud.io');
  },
  get buyerClientId(): string {
    return resolvedClientId();
  },
  get middlewareClientId(): string {
    return read('ORDERCLOUD_MIDDLEWARE_CLIENT_ID');
  },
  get middlewareClientSecret(): string {
    return read('ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET');
  },
  get middlewareScope(): string {
    return read('ORDERCLOUD_MIDDLEWARE_SCOPE') || 'OrderAdmin';
  },
  get anonymousScope(): string {
    return read('NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE') || 'Shopper';
  },
};
