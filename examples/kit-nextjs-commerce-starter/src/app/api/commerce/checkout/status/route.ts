import { NextRequest, NextResponse } from 'next/server';
import type { ListPage, Order } from 'ordercloud-javascript-sdk';
import { orderCloudRequest } from '@/lib/commerce/auth/client';
import { getOrderCloudAuthCookieName } from '@/lib/commerce/browser-config';

export const dynamic = 'force-dynamic';

type OrderXp = { CheckoutStatus?: 'Pending' | 'Completed' | 'Failed' };

const readTokenFromRequest = (request: NextRequest): string | null => {
  const authorization = request.headers.get('authorization');
  if (authorization) {
    const [scheme, token] = authorization.trim().split(/\s+/, 2);
    if (scheme?.toLowerCase() === 'bearer' && token?.trim()) return token.trim();
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
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
};

// Resolves the shopper's current order the same way the gateway's success_url redirect does: by
// the shopper's still-active access token, never by an Order ID carried through the redirect.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const shopperToken = readTokenFromRequest(request);
  if (!shopperToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const orders = await orderCloudRequest<ListPage<Order<OrderXp>>>(
      '/v1/orders/Outgoing?sortBy=!DateCreated&pageSize=1',
      { method: 'GET' },
      shopperToken
    );

    const order = orders.Items?.[0];
    if (!order?.ID) {
      return NextResponse.json({ error: 'No order found for this shopper' }, { status: 404 });
    }

    return NextResponse.json({
      orderId: order.ID,
      checkoutStatus: order.xp?.CheckoutStatus ?? 'Pending',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load order status';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
