import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken } from '@/lib/commerce/auth/bearer-token';
import { getCheckoutStatus } from '@/lib/commerce/checkout/service';
import { CheckoutServiceError } from '@/lib/commerce/checkout/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { attemptId } = await context.params;
  const normalizedAttemptId = attemptId.trim();

  if (!normalizedAttemptId) {
    return NextResponse.json({ error: 'attemptId is required' }, { status: 400 });
  }

  const shopperToken = readBearerToken(request);

  if (!shopperToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const checkout = await getCheckoutStatus(normalizedAttemptId, shopperToken);
    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof CheckoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : 'Unable to load checkout status';
    const status = message.startsWith('Missing required checkout configuration') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
