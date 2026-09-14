import type { BuyerProduct, PriceSchedule } from 'ordercloud-javascript-sdk';

export type CommerceProduct = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  images: CommerceProductImage[];
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
};

export type CommerceProductImage = {
  url: string;
  alt?: string;
};

type CommerceProductXp = {
  imageUrl?: unknown;
  ImageUrl?: unknown;
  images?: unknown;
  Images?: unknown;
  brand?: unknown;
  category?: unknown;
  price?: unknown;
};

export type OrderCloudBuyerProduct = BuyerProduct<CommerceProductXp> & {
  ImageUrl?: unknown;
  DefaultPriceSchedule?: PriceSchedule;
};

export type CommerceProductList = {
  items: CommerceProduct[];
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
};

export interface ProductRequestOptions {
  signal?: AbortSignal;
}

export interface ListProductsOptions extends ProductRequestOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}
