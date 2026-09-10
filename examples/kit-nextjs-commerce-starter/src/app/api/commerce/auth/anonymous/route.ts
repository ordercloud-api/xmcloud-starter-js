import { NextRequest, NextResponse } from 'next/server';
import {
  getCommerceBrowserConfig,
  getOrderCloudAuthCookieName,
} from '@/lib/commerce/browser-config';

export const dynamic = 'force-dynamic';

const getBaseApiUrl = (): string =>
  (process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL?.trim() || 'https://sandboxapi.ordercloud.io').replace(
    /\/$/,
    ''
  );

const requestToken = async (url: string, params: URLSearchParams): Promise<Response> => {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await request.json().catch(() => ({}));

    const config = getCommerceBrowserConfig();
    const params = new URLSearchParams();
    params.set('grant_type', 'client_credentials');
    if (config.anonymousScope) {
      params.set('scope', config.anonymousScope);
    }

    let tokenResponse = await requestToken(`${config.proxyBaseUrl}/oauth/token`, params);
    let body = (await tokenResponse.json().catch(() => ({}))) as {
      access_token?: unknown;
      expires_in?: unknown;
      error?: unknown;
      error_description?: unknown;
    };

    if (!tokenResponse.ok) {
      const clientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID?.trim();
      if (clientId) {
        const directParams = new URLSearchParams();
        directParams.set('grant_type', 'client_credentials');
        directParams.set('client_id', clientId);
        if (config.anonymousScope) {
          directParams.set('scope', config.anonymousScope);
        }
        tokenResponse = await requestToken(`${getBaseApiUrl()}/oauth/token`, directParams);
        body = (await tokenResponse.json().catch(() => ({}))) as {
          access_token?: unknown;
          expires_in?: unknown;
          error?: unknown;
          error_description?: unknown;
        };
      }
    }

    const accessToken =
      typeof body.access_token === 'string' && body.access_token.trim()
        ? body.access_token
        : undefined;
    const expiresIn =
      typeof body.expires_in === 'number' && Number.isFinite(body.expires_in) && body.expires_in > 0
        ? body.expires_in
        : undefined;

    if (!tokenResponse.ok || !accessToken || !expiresIn) {
      const message =
        (typeof body.error_description === 'string' && body.error_description) ||
        (typeof body.error === 'string' && body.error) ||
        `OrderCloud token request failed with status ${tokenResponse.status}`;
      throw new Error(message);
    }

    const maxAge = Math.max(1, Math.floor(expiresIn));
    const tokenCookie = encodeURIComponent(
      JSON.stringify({ accessToken, expiresAt: Date.now() + maxAge * 1000 })
    );

    const response = NextResponse.json({ ok: true, accessToken, expiresIn: maxAge });
    response.cookies.set({
      name: getOrderCloudAuthCookieName(),
      value: tokenCookie,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create anonymous token';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
