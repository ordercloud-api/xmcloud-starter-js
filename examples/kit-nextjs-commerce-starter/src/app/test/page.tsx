'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import OrderCloudProductList from '@/components/commerce/OrderCloudProductList';
import { OrderCloudProvider } from '@/contexts/OrderCloudContext';

type ProductsPayload = {
  items?: Array<{ id?: string; name?: string }>;
  error?: string;
};

type AnonymousPayload = {
  ok?: boolean;
  error?: string;
};

type ConnectReadinessPayload = {
  ready: boolean;
  checks: {
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
    stripeConnectedAccountId: boolean;
    appUrl: boolean;
    middlewareClientId: boolean;
    middlewareClientSecret: boolean;
    orderCloudBuyerClientId: boolean;
    orderCloudBuyerId: boolean;
  };
  notes: string[];
};

type CheckStatus = 'idle' | 'running' | 'ok' | 'error';

type EndpointCheck = {
  key: string;
  label: string;
  method: 'GET' | 'POST';
  path: string;
};

type EndpointCheckResult = {
  status: CheckStatus;
  statusCode?: number;
  durationMs?: number;
  message?: string;
};

const CHECKS: EndpointCheck[] = [
  {
    key: 'readiness',
    label: 'Stripe connect readiness',
    method: 'GET',
    path: '/api/commerce/checkout/connect/readiness',
  },
  {
    key: 'products',
    label: 'Products list',
    method: 'GET',
    path: '/api/commerce/products',
  },
  {
    key: 'anonymous',
    label: 'Anonymous auth',
    method: 'POST',
    path: '/api/commerce/auth/anonymous',
  },
  {
    key: 'cart',
    label: 'Cart lookup',
    method: 'GET',
    path: '/api/commerce/cart',
  },
];

const initialResults = (): Record<string, EndpointCheckResult> =>
  CHECKS.reduce<Record<string, EndpointCheckResult>>((acc, check) => {
    acc[check.key] = { status: 'idle' };
    return acc;
  }, {});

const asMessage = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
};

const readErrorMessage = (body: unknown, fallback: string): string => {
  if (body && typeof body === 'object') {
    const payload = body as {
      error?: unknown;
      message?: unknown;
      Message?: unknown;
      error_description?: unknown;
      notes?: unknown;
    };

    const notes = Array.isArray(payload.notes)
      ? payload.notes.filter((item): item is string => typeof item === 'string' && !!item.trim())
      : [];

    if (notes.length > 0) {
      return notes.join(' | ');
    }

    return (
      asMessage(payload.error_description, '') ||
      asMessage(payload.error, '') ||
      asMessage(payload.message, '') ||
      asMessage(payload.Message, '') ||
      fallback
    );
  }

  return fallback;
};

export default function CommerceTestPage() {
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [runningChecks, setRunningChecks] = useState(false);
  const [results, setResults] = useState<Record<string, EndpointCheckResult>>(initialResults());
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionResult, setSessionResult] = useState<string | null>(null);
  const [connectReadiness, setConnectReadiness] = useState<ConnectReadinessPayload | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const runEndpointCheck = async (check: EndpointCheck): Promise<{ response: Response; body: unknown }> => {
      const startedAt = performance.now();
      setResults((current) => ({ ...current, [check.key]: { status: 'running' } }));

      try {
        const response = await fetch(check.path, {
          method: check.method,
          signal: controller.signal,
          cache: 'no-store',
          headers: check.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
          body: check.method === 'POST' ? JSON.stringify({}) : undefined,
        });

        const body = (await response.json().catch(() => null)) as unknown;
        const durationMs = Math.round(performance.now() - startedAt);

        if (!response.ok) {
          const message = readErrorMessage(body, `${check.label} failed with ${response.status}`);
          setResults((current) => ({
            ...current,
            [check.key]: {
              status: 'error',
              statusCode: response.status,
              durationMs,
              message,
            },
          }));
        } else {
          setResults((current) => ({
            ...current,
            [check.key]: {
              status: 'ok',
              statusCode: response.status,
              durationMs,
            },
          }));
        }

        return { response, body };
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }

        const durationMs = Math.round(performance.now() - startedAt);
        setResults((current) => ({
          ...current,
          [check.key]: {
            status: 'error',
            durationMs,
            message: error instanceof Error ? error.message : `${check.label} failed`,
          },
        }));
        throw error;
      }
    };

    const runAllChecks = async () => {
      setRunningChecks(true);
      setLoadingProducts(true);
      setResults(initialResults());
      setProductsError(null);
      setSessionResult(null);

      try {
        const readiness = await runEndpointCheck(CHECKS[0]);
        if (readiness.response.ok) {
          setConnectReadiness((readiness.body ?? null) as ConnectReadinessPayload | null);
        }

        const products = await runEndpointCheck(CHECKS[1]);
        if (products.response.ok) {
          const payload = products.body as ProductsPayload | null;
          setProductCount(Array.isArray(payload?.items) ? payload.items.length : 0);
          setProductsError(null);
        } else {
          const payload = products.body as ProductsPayload | null;
          setProductsError(payload?.error || 'Product API request failed');
        }

        const anonymous = await runEndpointCheck(CHECKS[2]);
        if (anonymous.response.ok) {
          const payload = anonymous.body as AnonymousPayload | null;
          setSessionResult(payload?.ok ? 'Anonymous shopper session created.' : 'Anonymous session returned non-ok payload.');
        }

        await runEndpointCheck(CHECKS[3]);
      } catch {
        // Per-endpoint errors are already captured in result state.
      } finally {
        setLoadingProducts(false);
        setRunningChecks(false);
        setLastRunAt(new Date().toLocaleTimeString());
      }
    };

    void runAllChecks();
    return () => controller.abort();
  }, []);

  const createAnonymousSession = async () => {
    setCreatingSession(true);
    setSessionResult(null);

    try {
      const response = await fetch('/api/commerce/auth/anonymous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as AnonymousPayload;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Anonymous session request failed');
      }

      setSessionResult('Anonymous shopper session created.');
    } catch (error) {
      setSessionResult(error instanceof Error ? error.message : 'Anonymous session request failed');
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
        Local Commerce Diagnostics
      </p>
      <h1 className="text-4xl font-semibold">Basic Next.js Commerce Debug Panel</h1>
      <p className="text-muted-foreground text-sm">
        Live checks for local commerce APIs. This page validates auth, products, cart, and Stripe connect readiness.
      </p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>Origin: {typeof window !== 'undefined' ? window.location.origin : 'n/a'}</span>
        <span>Proxy: {process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL || 'not set'}</span>
        <span>Last run: {lastRunAt || 'running initial checks...'}</span>
      </div>

      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-medium">Endpoint checks</p>
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            disabled={runningChecks}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningChecks ? 'Running...' : 'Run again'}
          </button>
        </div>

        <div className="space-y-2">
          {CHECKS.map((check) => {
            const result = results[check.key];
            const statusClass =
              result?.status === 'ok'
                ? 'text-emerald-700'
                : result?.status === 'error'
                  ? 'text-red-700'
                  : result?.status === 'running'
                    ? 'text-amber-700'
                    : 'text-muted-foreground';

            return (
              <div key={check.key} className="rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{check.label}</p>
                  <p className={statusClass}>
                    {result?.status === 'ok' && `OK ${result.statusCode} in ${result.durationMs}ms`}
                    {result?.status === 'error' && `ERROR ${result.statusCode || ''} in ${result.durationMs}ms`}
                    {result?.status === 'running' && 'Running...'}
                    {(!result || result.status === 'idle') && 'Idle'}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {check.method} {check.path}
                </p>
                {result?.message && <p className="pt-1 text-xs text-red-700">{result.message}</p>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Product API</p>
        {loadingProducts && <p className="text-muted-foreground">Loading products...</p>}
        {!loadingProducts && productsError && <p className="text-red-600">{productsError}</p>}
        {!loadingProducts && !productsError && (
          <p className="text-emerald-700">Products loaded: {productCount}</p>
        )}
      </div>

      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Anonymous shopper session</p>
        <button
          type="button"
          onClick={createAnonymousSession}
          disabled={creatingSession}
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creatingSession ? 'Creating session...' : 'Create anonymous session'}
        </button>
        {sessionResult && <p className="text-muted-foreground">{sessionResult}</p>}
      </div>

      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Stripe Connect readiness</p>
        {!connectReadiness && <p className="text-muted-foreground">Unable to load readiness.</p>}
        {connectReadiness && (
          <>
            <p className={connectReadiness.ready ? 'text-emerald-700' : 'text-amber-700'}>
              {connectReadiness.ready
                ? 'Ready: checkout + webhook fulfillment can be proved.'
                : 'Not ready yet: one or more required checks failed.'}
            </p>
            <div className="grid gap-1 text-xs sm:grid-cols-2">
              {Object.entries(connectReadiness.checks).map(([key, value]) => (
                <p key={key} className={value ? 'text-emerald-700' : 'text-amber-700'}>
                  {value ? 'PASS' : 'FAIL'} {key}
                </p>
              ))}
            </div>
            {connectReadiness.notes.map((note, index) => (
              <p key={`readiness-note-${index}`} className="text-muted-foreground">
                {note}
              </p>
            ))}
          </>
        )}
      </div>

      <OrderCloudProvider>
        <OrderCloudProductList title="OrderCloud products (component view)" compact />
      </OrderCloudProvider>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/60" href="/">
          Back to diagnostics home
        </Link>
        <Link className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/60" href="/oc-test">
          Open /oc-test alias
        </Link>
      </div>
    </main>
  );
}
