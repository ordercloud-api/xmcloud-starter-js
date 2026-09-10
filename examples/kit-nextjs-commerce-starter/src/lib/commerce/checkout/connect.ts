import 'server-only';
import type Stripe from 'stripe';
import { checkoutConfig } from './config';
import { getConnectedAccountRequestOptions, getStripeClient } from './stripe';
import type { CommerceCart } from '@/lib/commerce/cart/types';

export const createConnectedCheckoutSession = async (
  cart: CommerceCart
): Promise<{ sessionId: string; url: string; connectedAccountId: string }> => {
  if (!cart.items.length) {
    throw new Error('Cart is empty');
  }

  const connectedAccountId = checkoutConfig.connectedAccountId;
  const line_items: Stripe.Checkout.SessionCreateParams['line_items'] = cart.items.map((item) => {
    const unitAmount = Math.round((item.unitPrice ?? 0) * 100);
    return {
      price_data: {
        currency: (cart.currency || 'usd').toLowerCase(),
        unit_amount: unitAmount,
        product_data: {
          name: item.name,
          metadata: {
            ocProductId: item.productId,
            ocLineItemId: item.id,
          },
        },
      },
      quantity: item.quantity,
    };
  });

  const session = await getStripeClient().checkout.sessions.create(
    {
      mode: 'payment',
      line_items,
      allow_promotion_codes: true,
      success_url: `${checkoutConfig.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutConfig.appUrl}/checkout/cancel`,
      metadata: {
        ocOrderId: cart.id ?? '',
        connectedAccountId,
        chargeType: 'direct',
      },
    },
    getConnectedAccountRequestOptions(connectedAccountId)
  );

  if (!session.url) {
    throw new Error('Stripe did not return a Checkout URL');
  }

  return {
    sessionId: session.id,
    url: session.url,
    connectedAccountId,
  };
};
