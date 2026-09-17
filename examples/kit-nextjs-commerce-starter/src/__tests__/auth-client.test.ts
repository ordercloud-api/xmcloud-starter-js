import { afterEach, describe, expect, it, vi } from 'vitest';
import { Auth, Configuration } from 'ordercloud-javascript-sdk';
import { requestMiddlewareOrderCloudToken } from '../lib/commerce/auth/client';

const originalBaseApiUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;
const originalMiddlewareId = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
const originalMiddlewareSecret = process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
const originalMiddlewareScope = process.env.ORDERCLOUD_MIDDLEWARE_SCOPE;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalBaseApiUrl === undefined) delete process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = originalBaseApiUrl;
  if (originalMiddlewareId === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID;
  else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = originalMiddlewareId;
  if (originalMiddlewareSecret === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET;
  else process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = originalMiddlewareSecret;
  if (originalMiddlewareScope === undefined) delete process.env.ORDERCLOUD_MIDDLEWARE_SCOPE;
  else process.env.ORDERCLOUD_MIDDLEWARE_SCOPE = originalMiddlewareScope;
});

describe('requestMiddlewareOrderCloudToken', () => {
  it('requests a client-credentials token through the SDK', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL = 'https://sandboxapi.ordercloud.io/';
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_ID = 'middleware-id';
    process.env.ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET = 'middleware-secret';
    process.env.ORDERCLOUD_MIDDLEWARE_SCOPE = 'OrderAdmin';
    const configure = vi.spyOn(Configuration, 'Set');
    const authenticate = vi.spyOn(Auth, 'ClientCredentials').mockResolvedValue({
      access_token: 'mw-token',
      expires_in: 3600,
      token_type: 'bearer',
      refresh_token: '',
    });

    await expect(requestMiddlewareOrderCloudToken()).resolves.toEqual({
      accessToken: 'mw-token',
      expiresIn: 3600,
    });
    expect(configure).toHaveBeenCalledWith({
      baseApiUrl: 'https://sandboxapi.ordercloud.io',
    });
    expect(authenticate).toHaveBeenCalledWith('middleware-secret', 'middleware-id', ['OrderAdmin']);
  });
});
