import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ProxyDiagnostics = {
  ok: boolean;
  url: string | null;
  status?: number;
  error?: string;
};

const proxyHealthUrl = (): string | null => {
  const proxyUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL?.trim();
  if (!proxyUrl) return null;

  try {
    return `${new URL(proxyUrl).origin}/health`;
  } catch {
    return null;
  }
};

export async function GET(): Promise<NextResponse<ProxyDiagnostics>> {
  const url = proxyHealthUrl();
  if (!url) {
    return NextResponse.json(
      { ok: false, url: null, error: 'NEXT_PUBLIC_ORDERCLOUD_PROXY_URL is not set' },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json(
        { ok: false, url, status: response.status, error: `Proxy health returned ${response.status}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, url, status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        url,
        error: error instanceof Error ? error.message : 'Proxy is not reachable',
      },
      { status: 502 }
    );
  }
}
