'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type SessionData = {
  id: string;
  paymentStatus: string;
  customerEmail: string | null;
  amountTotal: number | null;
  currency: string | null;
  ocOrderId: string;
  connectedAccountId: string | null;
  error?: string;
};

const formatCents = (cents: number | null, currency = 'usd') => {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
};

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/commerce/checkout/connect/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const payload = (await response.json()) as SessionData;
        if (!response.ok) throw new Error(payload.error || 'Unable to load session');
        setSession(payload);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Unable to load session');
      });
  }, [sessionId]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col justify-center gap-4 px-6 py-16">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
        Stripe Connect SaaS
      </p>
      <h1 className="text-3xl font-semibold">Payment received</h1>
      <p className="text-muted-foreground text-sm">
        The charge was created on the connected merchant account. OrderCloud fulfillment runs from
        the Stripe webhook, not this page.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {session && (
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Connected account</dt>
            <dd className="font-mono text-xs">{session.connectedAccountId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">OrderCloud order</dt>
            <dd className="font-mono text-xs">{session.ocOrderId}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Amount</dt>
            <dd>{formatCents(session.amountTotal, session.currency || 'usd')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>{session.paymentStatus}</dd>
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
