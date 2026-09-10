import 'server-only';
import type Stripe from 'stripe';
import { orderCloudRequest, orderCloudTokenRequest } from '@/lib/commerce/auth/client';
import { commerceAuthConfig } from '@/lib/commerce/auth/config';

type FulfillmentResult = {
  orderId: string;
  paymentId: string;
  resumed: boolean;
};

type OrderCloudList<T> = { Items?: T[] };
type OrderCloudOrder = { ID?: string; Status?: string };
type OrderCloudLineItem = { ID?: string; ProductID?: string };
type OrderCloudPayment = { ID?: string; xp?: { stripeSessionId?: string } };
type TokenResponse = { access_token: string };

const resolveProductId = (item: Stripe.LineItem): string => {
  const stripeProduct = item.price?.product;
  if (typeof stripeProduct === 'object' && stripeProduct && 'metadata' in stripeProduct) {
    return stripeProduct.metadata?.ocProductId || stripeProduct.id || 'unknown-product';
  }
  if (typeof stripeProduct === 'string') return stripeProduct;
  return 'unknown-product';
};

const getMiddlewareToken = async (): Promise<string> => {
  if (!commerceAuthConfig.middlewareClientId || !commerceAuthConfig.middlewareClientSecret) {
    throw new Error(
      'Missing ORDERCLOUD_MIDDLEWARE_CLIENT_ID / ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET for webhook fulfillment'
    );
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', commerceAuthConfig.middlewareClientId);
  params.set('client_secret', commerceAuthConfig.middlewareClientSecret);
  params.set('scope', commerceAuthConfig.middlewareScope);

  const token = await orderCloudTokenRequest<TokenResponse>(params);
  return token.access_token;
};

export const fulfillConnectedCheckout = async (
  session: Stripe.Checkout.Session
): Promise<FulfillmentResult> => {
  const token = await getMiddlewareToken();
  const expectedOrderId = `stripe-${session.id.slice(-8)}`;
  const existing = await orderCloudRequest<OrderCloudList<OrderCloudOrder>>(
    `/v1/orders/Outgoing?xp.stripeSessionId=${encodeURIComponent(session.id)}`,
    { method: 'GET' },
    token
  );

  let resumed = false;
  let order = existing.Items?.[0];

  if (order?.ID) {
    resumed = true;
  } else {
    order = await orderCloudRequest<OrderCloudOrder>(
      '/v1/orders/Outgoing',
      {
        method: 'POST',
        body: JSON.stringify({
          ID: expectedOrderId,
          xp: {
            stripeSessionId: session.id,
            stripePaymentIntent: session.payment_intent,
            stripeConnectedAccountId: session.metadata?.connectedAccountId ?? null,
            stripeChargeType: session.metadata?.chargeType ?? 'direct',
            sourceCartId: session.metadata?.ocOrderId ?? null,
          },
        }),
      },
      token
    );
  }

  const orderId = order.ID;
  if (!orderId) {
    throw new Error('OrderCloud fulfillment did not return an order ID');
  }

  const existingLineItems = await orderCloudRequest<OrderCloudList<OrderCloudLineItem>>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/lineitems`,
    { method: 'GET' },
    token
  );
  const existingProductIds = new Set(
    (existingLineItems.Items ?? []).map((item) => item.ProductID).filter(Boolean)
  );

  for (const item of session.line_items?.data ?? []) {
    const productId = resolveProductId(item);
    if (existingProductIds.has(productId)) continue;

    await orderCloudRequest(
      `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/lineitems`,
      {
        method: 'POST',
        body: JSON.stringify({
          ProductID: productId,
          Quantity: item.quantity || 1,
          xp: {
            stripePriceId: item.price?.id,
            description: item.description,
          },
        }),
      },
      token
    );
  }

  if (order.Status === 'Unsubmitted' || !order.Status) {
    await orderCloudRequest(
      `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/submit`,
      { method: 'POST' },
      token
    );
  }

  const payments = await orderCloudRequest<OrderCloudList<OrderCloudPayment>>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/payments`,
    { method: 'GET' },
    token
  );
  const alreadyPaid = (payments.Items ?? []).some(
    (payment) => payment.xp?.stripeSessionId === session.id
  );
  if (alreadyPaid) {
    return { orderId, paymentId: payments.Items?.[0]?.ID || 'existing', resumed: true };
  }

  const payment = await orderCloudRequest<OrderCloudPayment>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/payments`,
    {
      method: 'POST',
      body: JSON.stringify({
        Type: 'CreditCard',
        Accepted: true,
        Amount: (session.amount_total || 0) / 100,
        xp: {
          stripePaymentIntentId: session.payment_intent,
          stripeSessionId: session.id,
          method: 'stripe_hosted_checkout',
        },
      }),
    },
    token
  );

  return { orderId, paymentId: payment.ID || 'created', resumed };
};
