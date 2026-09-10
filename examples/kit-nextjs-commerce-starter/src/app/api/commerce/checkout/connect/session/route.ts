import { NextRequest, NextResponse } from 'next/server';
import { checkoutConfig } from '@/lib/commerce/checkout/config';
import { getConnectedAccountRequestOptions, getStripeClient } from '@/lib/commerce/checkout/stripe';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get('session_id')?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(
      sessionId,
      {
        expand: ['line_items.data.price.product', 'total_details.breakdown'],
      },
      getConnectedAccountRequestOptions()
    );

    return NextResponse.json({
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      customerName: session.customer_details?.name,
      amountTotal: session.amount_total,
      currency: session.currency,
      ocOrderId: `stripe-${session.id.slice(-8)}`,
      connectedAccountId:
        session.metadata?.connectedAccountId ?? checkoutConfig.connectedAccountId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load session';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
