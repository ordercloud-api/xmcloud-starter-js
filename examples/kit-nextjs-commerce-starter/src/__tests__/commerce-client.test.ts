import { afterEach, describe, expect, it, vi } from 'vitest';
import { Auth, Configuration } from 'ordercloud-javascript-sdk';
import {
  requestAnonymousOrderCloudToken,
  runOrderCloudOperation,
} from '../lib/commerce/client';

const originalScope = process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
const originalClientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
const originalBaseApiUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalScope === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE = originalScope;
  if (originalClientId === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = originalClientId;
  if (originalBaseApiUrl === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = originalBaseApiUrl;
});

describe('OrderCloud SDK client', () => {
  it('targets the configured OrderCloud API and requests an anonymous token through the SDK', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io/';
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = 'buyer-client-id';
    process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE = 'Shopper';
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
      baseApiUrl: 'https://sandboxapi.ordercloud.io',
    });
    expect(authenticate).toHaveBeenCalledWith('buyer-client-id', ['Shopper']);
  });

  it('defaults to sandbox when no OrderCloud base URL is set', async () => {
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = 'buyer-client-id';
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_ANONYMOUS_SCOPE;
    const configure = vi.spyOn(Configuration, 'Set');
    vi.spyOn(Auth, 'Anonymous').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 3600,
      token_type: 'bearer',
      refresh_token: '',
    });

    await requestAnonymousOrderCloudToken();

    expect(configure).toHaveBeenCalledWith({
      baseApiUrl: 'https://sandboxapi.ordercloud.io',
    });
    expect(Auth.Anonymous).toHaveBeenCalledWith('buyer-client-id', undefined);
  });

  it('requires a buyer client id', async () => {
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;

    await expect(requestAnonymousOrderCloudToken()).rejects.toThrow(
      'Missing required OrderCloud environment variable: NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID'
    );
  });

  it('runs OrderCloud operations against the configured API without a proxy fallback', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io';
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = 'buyer-client-id';
    const configure = vi.spyOn(Configuration, 'Set');
    const operation = vi.fn().mockResolvedValue({ items: [] });

    await expect(runOrderCloudOperation(operation, { accessToken: 'token' })).resolves.toEqual({
      items: [],
    });
    expect(configure).toHaveBeenCalledWith({
      baseApiUrl: 'https://sandboxapi.ordercloud.io',
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failed OrderCloud operation', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = 'buyer-client-id';
    const operation = vi.fn().mockRejectedValue(new Error('NotFound'));

    await expect(runOrderCloudOperation(operation, { accessToken: 'token' })).rejects.toThrow(
      'NotFound'
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
