import { NextRequest, NextResponse } from 'next/server';
import { getOrderCloudAuthCookieName } from '@/lib/commerce/browser-config';
import { getCart } from '@/lib/commerce/cart/service';
import { createConnectedCheckoutSession } from '@/lib/commerce/checkout/connect';

export const dynamic = 'force-dynamic';

const isSameOriginRequest = (request: NextRequest): boolean => {
  const origin = request.headers.get('origin');
  return !!origin && origin === request.nextUrl.origin;
};

const readTokenFromRequest = (request: NextRequest): string | null => {
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const [scheme, token] = authorization.trim().split(/\s+/, 2);
    if (scheme?.toLowerCase() === 'bearer' && token?.trim()) {
      return token.trim();
    }
  }

  const rawCookie = request.cookies.get(getOrderCloudAuthCookieName())?.value;
  if (!rawCookie) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie)) as {
      accessToken?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof parsed.accessToken !== 'string' ||
      !parsed.accessToken.trim() ||
      typeof parsed.expiresAt !== 'number' ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now() + 60_000
    ) {
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const shopperToken = readTokenFromRequest(request);
  if (!shopperToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const cart = await getCart(shopperToken);
    const checkout = await createConnectedCheckoutSession(cart);
    return NextResponse.json(
      {
        attemptId: checkout.sessionId,
        redirectUrl: checkout.url,
        connectedAccountId: checkout.connectedAccountId,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start Connect checkout';
    const status = message.startsWith('Missing required checkout configuration') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
