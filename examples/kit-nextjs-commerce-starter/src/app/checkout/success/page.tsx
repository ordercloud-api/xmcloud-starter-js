'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type CheckoutStatusPayload = {
  orderId: string;
  checkoutStatus: 'Pending' | 'Completed' | 'Failed';
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
        const response = await fetch('/api/commerce/checkout/status', { cache: 'no-store' });
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
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
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
        Fulfillment runs from the gateway&apos;s Stripe webhook, not this page. This page polls the
        order until the webhook has finished processing it.
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
      <Link href="/" className="text-sm underline">
        Back to catalog
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
