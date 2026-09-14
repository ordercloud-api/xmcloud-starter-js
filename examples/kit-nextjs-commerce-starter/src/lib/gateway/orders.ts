import 'server-only';
import type { AccessToken, ListPage, Order, Payment } from 'ordercloud-javascript-sdk';
import { orderCloudRequest, orderCloudTokenRequest } from '@/lib/commerce/auth/client';
import { commerceAuthConfig } from '@/lib/commerce/auth/config';

export type GatewayCheckoutStatus = 'Pending' | 'Completed' | 'Failed';

export interface GatewayOrderXp {
  CheckoutStatus?: GatewayCheckoutStatus;
}

export interface GatewayPaymentXp {
  stripeSessionId?: string;
  stripePaymentIntentId?: string | null;
}

let cachedMiddlewareToken: { token: string; expiresAt: number } | null = null;

export const getMiddlewareToken = async (): Promise<string> => {
  if (cachedMiddlewareToken && cachedMiddlewareToken.expiresAt > Date.now() + 30_000) {
    return cachedMiddlewareToken.token;
  }

  if (!commerceAuthConfig.middlewareClientId || !commerceAuthConfig.middlewareClientSecret) {
    throw new Error(
      'Missing ORDERCLOUD_MIDDLEWARE_CLIENT_ID / ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET for gateway order fulfillment'
    );
  }

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', commerceAuthConfig.middlewareClientId);
  params.set('client_secret', commerceAuthConfig.middlewareClientSecret);
  params.set('scope', commerceAuthConfig.middlewareScope);

  const token = await orderCloudTokenRequest<AccessToken>(params);
  if (!token.access_token || !token.expires_in) {
    throw new Error('OrderCloud token response did not include an access token');
  }

  cachedMiddlewareToken = {
    token: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return cachedMiddlewareToken.token;
};

export const getOutgoingOrder = async (orderId: string): Promise<Order<GatewayOrderXp>> => {
  const token = await getMiddlewareToken();
  return orderCloudRequest<Order<GatewayOrderXp>>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}`,
    { method: 'GET' },
    token
  );
};

export const setOrderCheckoutStatus = async (
  orderId: string,
  status: GatewayCheckoutStatus,
  costs?: { taxCost?: number; shippingCost?: number }
): Promise<void> => {
  const token = await getMiddlewareToken();
  await orderCloudRequest(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...(costs?.taxCost != null ? { TaxCost: costs.taxCost } : {}),
        ...(costs?.shippingCost != null ? { ShippingCost: costs.shippingCost } : {}),
        xp: { CheckoutStatus: status },
      }),
    },
    token
  );
};

export const submitOutgoingOrder = async (orderId: string): Promise<void> => {
  const token = await getMiddlewareToken();
  await orderCloudRequest(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/submit`,
    { method: 'POST' },
    token
  );
};

export const listOrderPayments = async (orderId: string): Promise<ListPage<Payment<GatewayPaymentXp>>> => {
  const token = await getMiddlewareToken();
  return orderCloudRequest<ListPage<Payment<GatewayPaymentXp>>>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/payments`,
    { method: 'GET' },
    token
  );
};

export const createOrderPayment = async (
  orderId: string,
  input: {
    accepted: boolean;
    amount: number;
    stripeSessionId: string;
    stripePaymentIntentId?: string | null;
  }
): Promise<Payment<GatewayPaymentXp>> => {
  const token = await getMiddlewareToken();
  return orderCloudRequest<Payment<GatewayPaymentXp>>(
    `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/payments`,
    {
      method: 'POST',
      body: JSON.stringify({
        Type: 'CreditCard',
        Accepted: input.accepted,
        Amount: input.amount,
        xp: {
          stripeSessionId: input.stripeSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        },
      }),
    },
    token
  );
};
