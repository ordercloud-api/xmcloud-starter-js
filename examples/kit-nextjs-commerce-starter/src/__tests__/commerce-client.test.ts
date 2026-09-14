import { afterEach, describe, expect, it, vi } from 'vitest';
import { Auth, Configuration } from 'ordercloud-javascript-sdk';
import { requestAnonymousOrderCloudToken } from '../lib/commerce/client';

const originalProxyUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;
const originalScope = process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
const originalClientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalProxyUrl === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = originalProxyUrl;
  if (originalScope === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE = originalScope;
  if (originalClientId === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = originalClientId;
});

describe('OrderCloud SDK client', () => {
  it('targets the storefront proxy and requests an anonymous token through the SDK', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = 'https://proxy.example.test/oc/';
    process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE = 'Shopper';
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
    const configure = vi.spyOn(Configuration, 'Set');
    const authenticate = vi.spyOn(Auth, 'Anonymous').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 3600,
      token_type: 'bearer',
      refresh_token: '',
    });

    await expect(requestAnonymousOrderCloudToken()).resolves.toEqual({
      accessToken: 'access-token',
      expiresIn: 3600,
    });
    expect(configure).toHaveBeenCalledWith({
      baseApiUrl: 'https://proxy.example.test/oc',
    });
    expect(authenticate).toHaveBeenCalledWith('', ['Shopper']);
  });

  it('sends the public buyer client id when configured', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = 'https://proxy.example.test/oc';
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = 'buyer-client-id';
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
    vi.spyOn(Auth, 'Anonymous').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 3600,
      token_type: 'bearer',
      refresh_token: '',
    });

    await requestAnonymousOrderCloudToken();

    expect(Auth.Anonymous).toHaveBeenCalledWith('buyer-client-id', undefined);
  });
});
