import type { BuyerProduct, PriceSchedule } from "ordercloud-javascript-sdk";

export type CommerceProduct = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  images: CommerceProductImage[];
  brand?: string;
  category?: string;
  price?: number;
  currency?: string;
};

export type CommerceProductImage = {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
};

type CommerceProductXp = {
  Images?: unknown;
  Brand?: unknown;
  Category?: unknown;
  Price?: unknown;
};

export type OrderCloudBuyerProduct = BuyerProduct<CommerceProductXp> & {
  DefaultPriceSchedule?: PriceSchedule;
};

export type CommerceProductList = {
  items: CommerceProduct[];
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
    facets?: CommerceProductFacet[];
  };
};

export type CommerceProductFacet = {
  name: string;
  xpPath: string;
  values: CommerceProductFacetValue[];
};

export type CommerceProductFacetValue = {
  value: string;
  count: number;
};

export type CommerceProductFilters = Record<
  string,
  string | string[] | number | boolean | undefined
>;

export interface ProductRequestOptions {
  signal?: AbortSignal;
}

export interface ListProductsOptions extends ProductRequestOptions {
  catalogId?: string;
  categoryId?: string;
  search?: string;
  sortBy?: string[];
  page?: number;
  pageSize?: number;
  filters?: CommerceProductFilters;
}
