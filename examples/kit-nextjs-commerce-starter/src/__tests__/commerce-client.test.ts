import { afterEach, describe, expect, it, vi } from 'vitest';
import { Auth, Configuration } from 'ordercloud-javascript-sdk';
import {
  requestAnonymousOrderCloudToken,
  runOrderCloudOperation,
} from '../lib/commerce/client';

const originalProxyUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;
const originalScope = process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
const originalClientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
const originalBaseApiUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalProxyUrl === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = originalProxyUrl;
  if (originalScope === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE = originalScope;
  if (originalClientId === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = originalClientId;
  if (originalBaseApiUrl === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = originalBaseApiUrl;
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

  it('retries sandbox when the proxy rejects a shopper token', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = 'https://proxy.example.test/oc';
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io';
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Access token is invalid or expired.'))
      .mockResolvedValueOnce({ items: [] });

    await expect(runOrderCloudOperation(operation, { accessToken: 'token' })).resolves.toEqual({
      items: [],
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('retries sandbox when the storefront proxy is unreachable', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = 'https://proxy.example.test/oc';
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io';
    const configure = vi.spyOn(Configuration, 'Set');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce({ ok: true });

    await expect(runOrderCloudOperation(operation, { accessToken: 'token' })).resolves.toEqual({
      ok: true,
    });
    expect(configure).toHaveBeenCalledWith({ baseApiUrl: 'https://proxy.example.test/oc' });
    expect(configure).toHaveBeenCalledWith({ baseApiUrl: 'https://sandboxapi.ordercloud.io' });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not retry sandbox for non-transient errors', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = 'https://proxy.example.test/oc';
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io';
    const operation = vi.fn().mockRejectedValue(new Error('NotFound'));

    await expect(runOrderCloudOperation(operation, { accessToken: 'token' })).rejects.toThrow(
      'NotFound'
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
