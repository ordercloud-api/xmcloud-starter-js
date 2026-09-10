import { getCommerceBrowserConfig } from './browser-config';
import type { CommerceRequest } from './client';

export type CommerceProduct = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
};

export type CommerceProductList = {
  items: CommerceProduct[];
};

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
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  if (!id || !name) return undefined;

  const xp = asRecord(product.xp);
  const price = getPrice(product.PriceSchedule ?? product.DefaultPriceSchedule);

  return {
    id,
    name,
    description: asString(product.Description),
    imageUrl: asString(product.ImageUrl) ?? asString(xp?.imageUrl) ?? asString(xp?.ImageUrl),
    brand: asString(xp?.brand),
    category: asString(xp?.category),
    price: price.price ?? asNumber(xp?.price),
    currency: price.currency,
  };
};

export interface ListProductsOptions {
  signal?: AbortSignal;
}

export class ProductsService {
  constructor(private readonly request: CommerceRequest) {}

  async list(options: ListProductsOptions = {}): Promise<CommerceProductList> {
    const catalogId = getCommerceBrowserConfig().catalogId;
    const query = catalogId ? `?catalogID=${encodeURIComponent(catalogId)}` : '';
    const response = await this.request<OrderCloudProductList>(`/v1/me/products${query}`, {
      signal: options.signal,
    });

    return {
      items: Array.isArray(response.Items)
        ? response.Items.map(toCommerceProduct).filter(
            (product): product is CommerceProduct => !!product
          )
        : [],
    };
  }
}
