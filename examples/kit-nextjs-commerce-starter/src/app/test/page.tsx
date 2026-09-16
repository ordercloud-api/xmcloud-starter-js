'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type CheckStatus = 'idle' | 'running' | 'ok' | 'warn' | 'error';

type ConnectReadinessPayload = {
  ready: boolean;
  webhookReady?: boolean;
  checks: Record<string, boolean>;
  notes: string[];
};

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

const proxyUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL?.trim() || 'not set';
const sandboxUrl =
  process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL?.trim() || 'https://sandboxapi.ordercloud.io';
const catalogId = process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID?.trim() || 'not set';

const CHECKS: EndpointCheck[] = [
  {
    key: 'proxy',
    label: 'OrderCloud proxy',
    method: 'GET',
    path: '/api/commerce/diagnostics',
  },
  {
    key: 'readiness',
    label: 'Checkout configuration',
    method: 'GET',
    path: '/api/commerce/checkout/connect/readiness',
  },
  {
    key: 'anonymous',
    label: 'Anonymous shopper token',
    method: 'POST',
    path: '/api/commerce/auth/anonymous',
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
  if (typeof body === 'string' && body.trim()) return body;
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
    if (notes.length > 0) return notes.join(' | ');
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

const parseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }
  const text = await response.text().catch(() => '');
  return text.trim() || null;
};

const statusClassName = (status: CheckStatus | undefined): string => {
  if (status === 'ok') return 'text-emerald-700';
  if (status === 'warn') return 'text-amber-700';
  if (status === 'error') return 'text-red-700';
  if (status === 'running') return 'text-amber-700';
  return 'text-muted-foreground';
};

export default function CommerceDiagnosticsPage() {
  const [runningChecks, setRunningChecks] = useState(false);
  const [results, setResults] = useState<Record<string, EndpointCheckResult>>(initialResults());
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [connectReadiness, setConnectReadiness] = useState<ConnectReadinessPayload | null>(null);
  const [origin, setOrigin] = useState('n/a');
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const runChecks = useCallback(async (signal: AbortSignal) => {
    setRunningChecks(true);
    setResults(initialResults());
    setConnectReadiness(null);

    const runEndpointCheck = async (check: EndpointCheck): Promise<void> => {
      const startedAt = performance.now();
      setResults((current) => ({ ...current, [check.key]: { status: 'running' } }));

      try {
        const response = await fetch(check.path, {
          method: check.method,
          signal,
          cache: 'no-store',
          headers: check.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
          body: check.method === 'POST' ? JSON.stringify({}) : undefined,
        });
        const body = await parseBody(response);
        const durationMs = Math.round(performance.now() - startedAt);
        const isReadiness = check.key === 'readiness';
        const readinessPayload =
          isReadiness && body && typeof body === 'object'
            ? (body as ConnectReadinessPayload)
            : null;

        if (isReadiness && readinessPayload?.checks) {
          setConnectReadiness(readinessPayload);
        }

        if (response.ok) {
          setResults((current) => ({
            ...current,
            [check.key]: { status: 'ok', statusCode: response.status, durationMs },
          }));
          return;
        }

        if (isReadiness && response.status === 503 && readinessPayload?.checks) {
          setResults((current) => ({
            ...current,
            [check.key]: {
              status: 'warn',
              statusCode: response.status,
              durationMs,
              message: readErrorMessage(body, 'Checkout is not fully configured'),
            },
          }));
          return;
        }

        setResults((current) => ({
          ...current,
          [check.key]: {
            status: 'error',
            statusCode: response.status,
            durationMs,
            message: readErrorMessage(body, `${check.label} failed with ${response.status}`),
          },
        }));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setResults((current) => ({
          ...current,
          [check.key]: {
            status: 'error',
            durationMs: Math.round(performance.now() - startedAt),
            message: error instanceof Error ? error.message : `${check.label} failed`,
          },
        }));
      }
    };

    try {
      for (const check of CHECKS) {
        if (signal.aborted) return;
        await runEndpointCheck(check);
      }
    } finally {
      if (!signal.aborted) {
        setRunningChecks(false);
        setLastRunAt(new Date().toLocaleTimeString());
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void runChecks(controller.signal);
    return () => controller.abort();
  }, [runChecks, runId]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-[0.16em]">
        Local commerce diagnostics
      </p>
      <h1 className="text-4xl font-semibold">Diagnostics</h1>
      <p className="text-muted-foreground text-sm">
        Checks environment, proxy reachability, shopper auth, and checkout configuration. Use{' '}
        <Link className="underline" href="/products">
          /products
        </Link>{' '}
        and{' '}
        <Link className="underline" href="/cart">
          /cart
        </Link>{' '}
        for storefront behavior.
      </p>

      <div className="grid gap-2 rounded-lg border p-4 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          Origin: <span className="text-foreground">{origin}</span>
        </p>
        <p>
          Catalog: <span className="text-foreground">{catalogId}</span>
        </p>
        <p className="sm:col-span-2">
          Proxy: <span className="text-foreground break-all">{proxyUrl}</span>
        </p>
        <p className="sm:col-span-2">
          OrderCloud API: <span className="text-foreground break-all">{sandboxUrl}</span>
        </p>
        <p>
          Last run: <span className="text-foreground">{lastRunAt || 'running…'}</span>
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">Live checks</p>
          <button
            type="button"
            onClick={() => setRunId((current) => current + 1)}
            disabled={runningChecks}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {runningChecks ? 'Running…' : 'Run again'}
          </button>
        </div>

        <div className="space-y-2">
          {CHECKS.map((check) => {
            const result = results[check.key];
            return (
              <div key={check.key} className="rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{check.label}</p>
                  <p className={statusClassName(result?.status)}>
                    {result?.status === 'ok' && `OK ${result.statusCode} in ${result.durationMs}ms`}
                    {result?.status === 'warn' &&
                      `WARN ${result.statusCode || ''} in ${result.durationMs}ms`}
                    {result?.status === 'error' &&
                      `ERROR ${result.statusCode || ''} in ${result.durationMs}ms`}
                    {result?.status === 'running' && 'Running…'}
                    {(!result || result.status === 'idle') && 'Idle'}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs">
                  {check.method} {check.path}
                </p>
                {result?.message && (
                  <p className={`pt-1 text-xs ${statusClassName(result.status)}`}>{result.message}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Checkout configuration</p>
        {!connectReadiness && (
          <p className="text-muted-foreground">Waiting for configuration check…</p>
        )}
        {connectReadiness && (
          <>
            <p className={connectReadiness.ready ? 'text-emerald-700' : 'text-amber-700'}>
              {connectReadiness.ready
                ? 'Checkout start is configured.'
                : 'Checkout start is missing required configuration.'}
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

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/60" href="/products">
          Open /products
        </Link>
        <Link className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/60" href="/cart">
          Open /cart
        </Link>
        <Link className="rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/60" href="/">
          Open storefront home
        </Link>
      </div>
    </main>
  );
}
