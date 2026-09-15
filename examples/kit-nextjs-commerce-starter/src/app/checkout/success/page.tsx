'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { readStoredOrderCloudToken } from '@/lib/commerce/auth/token-store';
import { getCheckoutGatewayUrl } from '@/lib/commerce/checkout/gateway-url';
import {
  CHECKOUT_ORDER_ID_STORAGE_KEY,
  type GatewayCheckoutStatus,
} from '@/lib/commerce/checkout/status';

type CheckoutStatusPayload = {
  orderId: string;
  checkoutStatus: GatewayCheckoutStatus;
  error?: string;
};

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 60_000;

function CheckoutSuccessContent() {
  const [status, setStatus] = useState<CheckoutStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const token = readStoredOrderCloudToken()?.accessToken;
        const orderId =
          typeof window !== 'undefined'
            ? sessionStorage.getItem(CHECKOUT_ORDER_ID_STORAGE_KEY)
            : null;

        if (!token) throw new Error('Shopper session expired. Return to the cart and try again.');
        if (!orderId) throw new Error('Missing checkout order id. Start checkout from the cart again.');

        const response = await fetch(
          getCheckoutGatewayUrl(`/stripe/status?orderId=${encodeURIComponent(orderId)}`),
          {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const payload = (await response.json()) as CheckoutStatusPayload;
        if (!response.ok) throw new Error(payload.error || 'Unable to load order status');
        if (!active) return;

        setStatus(payload);
        setError(null);

        if (payload.checkoutStatus === 'Pending' && Date.now() - startedAtRef.current < POLL_TIMEOUT_MS) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load order status');
        if (Date.now() - startedAtRef.current < POLL_TIMEOUT_MS) {
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    void poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const checkoutStatus = status?.checkoutStatus ?? 'Pending';

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
        OrderCloud Checkout Gateway
      </p>
      <h1 className="text-3xl font-semibold">
        {checkoutStatus === 'Completed' && 'Payment received'}
        {checkoutStatus === 'Failed' && 'Payment failed'}
        {checkoutStatus === 'Pending' && 'Confirming your payment…'}
      </h1>
      <p className="text-muted-foreground text-sm">
        Fulfillment runs from the Stripe webhook, not this page. This page polls the order until
        that webhook has finished.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">OrderCloud order</dt>
            <dd className="font-mono text-xs">{status.orderId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{checkoutStatus}</dd>
          </div>
        </dl>
      )}
      <Link href="/test" className="text-sm underline">
        Back to diagnostics
      </Link>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="px-6 py-16">Loading confirmation…</main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
