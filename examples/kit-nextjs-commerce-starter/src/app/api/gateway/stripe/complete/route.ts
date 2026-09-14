import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClientConfig } from '@/lib/gateway/config-store';
import {
  createOrderPayment,
  getOutgoingOrder,
  listOrderPayments,
  setOrderCheckoutStatus,
  submitOutgoingOrder,
} from '@/lib/gateway/orders';
import { getStripeClientForApiKey } from '@/lib/gateway/stripe-client';

export const dynamic = 'force-dynamic';

const readClientIdFromRawEvent = (rawBody: string): string | null => {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: { object?: { metadata?: { ClientID?: unknown } } };
    };
    const clientId = parsed.data?.object?.metadata?.ClientID;
    return typeof clientId === 'string' && clientId ? clientId : null;
  } catch {
    return null;
  }
};

// PoC of the OrderCloud Checkout Gateway's `/stripe/complete` webhook (see
// storefront-checkout-gateway.contract.md). Called directly by Stripe, never via the proxy.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  // Metadata isn't trustworthy until the signature below is verified with this client's own secret.
  const clientId = readClientIdFromRawEvent(rawBody.toString('utf8'));
  if (!clientId) {
    return NextResponse.json({ error: 'Event payload is missing metadata.ClientID' }, { status: 400 });
  }

  const config = getStripeClientConfig(clientId);
  if (!config?.webhookSigningSecret || !config.apiKey) {
    return NextResponse.json(
      { error: `No Stripe webhook configuration for client_id ${clientId}` },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripeClientForApiKey(config.apiKey).webhooks.constructEvent(
      rawBody,
      signature,
      config.webhookSigningSecret
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid webhook signature';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.OrderID;
  if (!orderId) {
    return NextResponse.json({ error: 'Event session is missing metadata.OrderID' }, { status: 400 });
  }

  try {
    const order = await getOutgoingOrder(orderId);
    if (order.xp?.CheckoutStatus === 'Completed' || order.xp?.CheckoutStatus === 'Failed') {
      // Already processed by a previous delivery of this (or an equivalent) webhook - no-op.
      return NextResponse.json({ received: true, idempotent: true });
    }

    if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
      const payments = await listOrderPayments(orderId);
      const alreadyPaid = (payments.Items ?? []).some(
        (payment) => payment.xp?.stripeSessionId === session.id
      );

      if (!alreadyPaid) {
        await setOrderCheckoutStatus(orderId, 'Pending', {
          taxCost: (session.total_details?.amount_tax ?? 0) / 100,
          shippingCost: (session.total_details?.amount_shipping ?? 0) / 100,
        });
        await createOrderPayment(orderId, {
          accepted: true,
          amount: (session.amount_total ?? 0) / 100,
          stripeSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id,
        });
        await submitOutgoingOrder(orderId);
      }

      await setOrderCheckoutStatus(orderId, 'Completed');
    } else {
      await createOrderPayment(orderId, {
        accepted: false,
        amount: (session.amount_total ?? 0) / 100,
        stripeSessionId: session.id,
      });
      await setOrderCheckoutStatus(orderId, 'Failed');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment failed';
    console.error('[gateway:stripe/complete]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
