import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken } from '@/lib/commerce/auth/bearer-token';
import { startCheckout } from '@/lib/commerce/checkout/service';
import { CheckoutServiceError } from '@/lib/commerce/checkout/types';

export const dynamic = 'force-dynamic';

const getErrorResponse = (error: unknown): NextResponse<{ error: string }> => {
  if (error instanceof CheckoutServiceError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : 'Unable to start checkout';
  const status = message.startsWith('Missing required checkout configuration') ? 503 : 502;
  return NextResponse.json({ error: message }, { status });
};

const isSameOriginRequest = (request: NextRequest): boolean => {
  const origin = request.headers.get('origin');
  return !!origin && origin === request.nextUrl.origin;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const shopperToken = readBearerToken(request);

  if (!shopperToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const checkout = await startCheckout({ orderId }, shopperToken);
    return NextResponse.json(checkout, { status: 201 });
  } catch (error) {
    return getErrorResponse(error);
  }
}
