import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { checkoutConfig } from '@/lib/commerce/checkout/config';
import { fulfillConnectedCheckout } from '@/lib/commerce/checkout/fulfillment';
import { getConnectedAccountRequestOptions, getStripeClient } from '@/lib/commerce/checkout/stripe';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      checkoutConfig.stripeWebhookSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const connectedAccountId = event.account ?? session.metadata?.connectedAccountId;
  if (!connectedAccountId) {
    return NextResponse.json({ error: 'Missing connected account on event' }, { status: 500 });
  }

  try {
    const fullSession = await getStripeClient().checkout.sessions.retrieve(
      session.id,
      {
        expand: ['line_items.data.price.product', 'total_details.breakdown', 'discounts'],
      },
      getConnectedAccountRequestOptions(connectedAccountId)
    );
    await fulfillConnectedCheckout(fullSession);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment failed';
    console.error('[connect-webhook]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
