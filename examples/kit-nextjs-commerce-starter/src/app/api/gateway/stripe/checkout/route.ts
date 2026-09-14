import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { readBearerToken } from '@/lib/commerce/auth/bearer-token';
import { getCart } from '@/lib/commerce/cart/service';
import { getStripeClientConfig } from '@/lib/gateway/config-store';
import { JwtVerificationError, verifyOrderCloudJwt } from '@/lib/gateway/jwt';
import { getStripeClientForApiKey } from '@/lib/gateway/stripe-client';

export const dynamic = 'force-dynamic';

// PoC of the OrderCloud Checkout Gateway's `/stripe/checkout` endpoint (see
// storefront-checkout-gateway.contract.md). In production this sits behind the storefront proxy;
// here it's called directly by the storefront with the shopper's OrderCloud JWT.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const shopperToken = readBearerToken(request);
  if (!shopperToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let clientId: string;
  try {
    const payload = await verifyOrderCloudJwt(shopperToken);
    if (typeof payload.cid !== 'string' || !payload.cid) {
      return NextResponse.json(
        { error: 'Token is missing a cid (ApiClient ID) claim' },
        { status: 401 }
      );
    }
    clientId = payload.cid;
  } catch (error) {
    const message = error instanceof JwtVerificationError ? error.message : 'Token verification failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const config = getStripeClientConfig(clientId);
  if (!config?.apiKey || !config.returnUrl) {
    return NextResponse.json(
      { error: `No Stripe checkout configuration for client_id ${clientId}` },
      { status: 503 }
    );
  }

  const cart = await getCart(shopperToken);
  if (!cart.id) {
    return NextResponse.json({ error: 'No active order for this shopper' }, { status: 404 });
  }
  if (!cart.items.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const line_items: Stripe.Checkout.SessionCreateParams['line_items'] = cart.items.map((item) => ({
    price_data: {
      currency: (cart.currency || 'usd').toLowerCase(),
      unit_amount: Math.round((item.unitPrice ?? 0) * 100),
      product_data: {
        name: item.name,
        metadata: { ocProductId: item.productId, ocLineItemId: item.id },
      },
    },
    quantity: item.quantity,
  }));

  try {
    const stripe = getStripeClientForApiKey(config.apiKey);
    const separator = config.returnUrl.includes('?') ? '&' : '?';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      automatic_tax: { enabled: true },
      success_url: `${config.returnUrl}${separator}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: config.returnUrl,
      metadata: { OrderID: cart.id, ClientID: clientId },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create checkout session';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
