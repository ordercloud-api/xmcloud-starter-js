'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { readStoredOrderCloudToken } from '@/lib/commerce/auth/token-store';
import {
  CHECKOUT_ORDER_ID_STORAGE_KEY,
  isTerminalCheckoutStatus,
  type GatewayCheckoutStatus,
} from '@/lib/commerce/checkout/status';

type CheckoutStatusPayload = {
  orderId: string;
  checkoutStatus: GatewayCheckoutStatus;
  taxCost?: number;
  error?: string;
};

const pollDelayMs = (attempt: number): number => {
  if (attempt <= 0) return 0;
  if (attempt === 1) return 400;
  if (attempt === 2) return 800;
  if (attempt < 8) return 2000;
  return 5000;
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get('session_id')?.trim() || '';
  const [status, setStatus] = useState<CheckoutStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);

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

        const params = new URLSearchParams({
          orderId,
          t: String(Date.now()),
        });
        if (stripeSessionId) params.set('sessionId', stripeSessionId);

        const response = await fetch(`/stripe/status?${params.toString()}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json()) as CheckoutStatusPayload;
        if (!response.ok) throw new Error(payload.error || 'Unable to load order status');
        if (!active) return;

        setStatus(payload);
        setError(null);

        const taxOnOrder = (payload.taxCost ?? 0) > 0;
        const finished =
          isTerminalCheckoutStatus(payload.checkoutStatus) &&
          (taxOnOrder || attemptRef.current >= 8);
        if (!finished) {
          attemptRef.current += 1;
          timeoutId = setTimeout(poll, pollDelayMs(attemptRef.current));
        }
      } catch (err: unknown) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load order status');
        attemptRef.current += 1;
        timeoutId = setTimeout(poll, pollDelayMs(attemptRef.current));
      }
    };

    void poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [stripeSessionId]);

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
        Confirming payment with Stripe and submitting the OrderCloud order.
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
      <Link href="/cart" className="text-sm underline">
        Back to cart
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
