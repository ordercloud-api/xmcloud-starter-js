import { NextResponse } from 'next/server';
import {
  getCommerceBrowserConfig,
  type CommerceBrowserConfig,
} from '@/lib/commerce/browser-config';
import type { CommerceProduct, CommerceProductList } from '@/lib/commerce/products';

export const dynamic = 'force-dynamic';

type OrderCloudProduct = {
  ID?: unknown;
  Name?: unknown;
  Description?: unknown;
  ImageUrl?: unknown;
  PriceSchedule?: unknown;
  DefaultPriceSchedule?: unknown;
  xp?: unknown;
};

type OrderCloudProductList = {
  Items?: unknown;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const getPrice = (value: unknown): { price?: number; currency?: string } => {
  const priceSchedule = asRecord(value);
  const priceBreaks = Array.isArray(priceSchedule?.PriceBreaks) ? priceSchedule.PriceBreaks : [];
  const firstPriceBreak = asRecord(priceBreaks[0]);

  return {
    price: asNumber(firstPriceBreak?.Price),
    currency: asString(firstPriceBreak?.Currency),
  };
};

const toCommerceProduct = (value: unknown): CommerceProduct | undefined => {
  const product = value as OrderCloudProduct;
  const id = asString(product?.ID);
  const name = asString(product?.Name);

  if (!id || !name) {
    return undefined;
  }

  const xp = asRecord(product.xp);
  const price = getPrice(product.PriceSchedule ?? product.DefaultPriceSchedule);
  const xpPrice = asNumber(xp?.price);

  return {
    id,
    name,
    description: asString(product.Description),
    imageUrl: asString(product.ImageUrl) ?? asString(xp?.imageUrl) ?? asString(xp?.ImageUrl),
    brand: asString(xp?.brand),
    category: asString(xp?.category),
    price: price.price ?? xpPrice,
    currency: price.currency,
  };
};

const getProxyErrorMessage = (body: string, status: number): string => {
  try {
    const payload = JSON.parse(body) as {
      Message?: unknown;
      Errors?: Array<{ Message?: unknown }>;
      error?: unknown;
      error_description?: unknown;
    };
    const message =
      asString(payload.Message) ??
      asString(payload.Errors?.[0]?.Message) ??
      asString(payload.error_description) ??
      asString(payload.error);

    if (message) {
      return `OrderCloud request failed with status ${status}: ${message}`;
    }
  } catch {
    // The proxy may return an empty or non-JSON error body.
  }

  return `OrderCloud request failed with status ${status}`;
};

const getBaseApiUrl = (): string =>
  (process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL?.trim() || 'https://sandboxapi.ordercloud.io').replace(
    /\/$/,
    ''
  );

const getAccessToken = async (config: CommerceBrowserConfig): Promise<string> => {
  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');

  if (config.anonymousScope) {
    params.set('scope', config.anonymousScope);
  }

  let response = await fetch(`${config.proxyBaseUrl}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });
  let bodyText = await response.text();

  if (!response.ok) {
    const clientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID?.trim();
    if (clientId) {
      const directParams = new URLSearchParams();
      directParams.set('grant_type', 'client_credentials');
      directParams.set('client_id', clientId);
      if (config.anonymousScope) {
        directParams.set('scope', config.anonymousScope);
      }

      response = await fetch(`${getBaseApiUrl()}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: directParams.toString(),
        cache: 'no-store',
      });
      bodyText = await response.text();
    }
  }

  if (!response.ok) {
    throw new Error(getProxyErrorMessage(bodyText, response.status));
  }

  const body = JSON.parse(bodyText) as { access_token?: unknown };
  const accessToken = asString(body.access_token);

  if (!accessToken) {
    throw new Error('OrderCloud token response did not include an access token');
  }

  return accessToken;
};

export async function GET(): Promise<NextResponse<CommerceProductList | { error: string }>> {
  try {
    const config = getCommerceBrowserConfig();
    const accessToken = await getAccessToken(config);
    const catalogId = config.catalogId;
    const meEndpoint = `${config.proxyBaseUrl}/v1/me/products`;
    const catalogScopedEndpoint = catalogId
      ? `${meEndpoint}?catalogID=${encodeURIComponent(catalogId)}`
      : meEndpoint;

    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };

    let response = await fetch(catalogScopedEndpoint, {
      method: 'GET',
      headers: requestHeaders,
      cache: 'no-store',
    });
    let bodyText = await response.text();

    if (!response.ok) {
      const baseApiUrl = getBaseApiUrl();
      const directEndpoint = catalogId
        ? `${baseApiUrl}/v1/me/products?catalogID=${encodeURIComponent(catalogId)}`
        : `${baseApiUrl}/v1/me/products`;
      response = await fetch(directEndpoint, {
        method: 'GET',
        headers: requestHeaders,
        cache: 'no-store',
      });
      bodyText = await response.text();
    }

    if (!response.ok) {
      throw new Error(getProxyErrorMessage(bodyText, response.status));
    }

    const body = JSON.parse(bodyText) as OrderCloudProductList;
    const items = Array.isArray(body.Items)
      ? body.Items.map(toCommerceProduct).filter((product): product is CommerceProduct => !!product)
      : [];

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load OrderCloud products';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}