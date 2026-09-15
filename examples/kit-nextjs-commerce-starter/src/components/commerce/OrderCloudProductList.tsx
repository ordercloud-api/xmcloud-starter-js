'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useOrderCloud } from '@/contexts/OrderCloudContext';
import { useRoutePath } from '@/contexts/RoutePathContext';
import {
  buildProductDetailHref,
  resolveProductListDetailPageHref,
} from '@/lib/commerce/products/href';
import {
  CATALOG_LIST_HREF,
  FEATURED_PRODUCT_LIMIT,
  limitItems,
  type ProductListPresentation,
  type ProductListSource,
} from '@/lib/commerce/products/list-source';
import type { CommerceProduct } from '@/lib/commerce/products/types';
import OrderCloudProductCard from './OrderCloudProductCard';

type OrderCloudProductListProps = {
  title?: string;
  compact?: boolean;
  source?: ProductListSource;
  productIds?: string[];
  detailPageHref?: string;
  isAuthoring?: boolean;
  presentation?: ProductListPresentation;
  limit?: number;
  viewAllHref?: string;
  viewAllLabel?: string;
  hideHeading?: boolean;
};

const REQUEST_TIMEOUT_MS = 10_000;

export default function OrderCloudProductList({
  title,
  compact,
  source = 'ordercloud-catalog',
  productIds = [],
  detailPageHref,
  isAuthoring = false,
  presentation = 'catalog',
  limit,
  viewAllHref,
  viewAllLabel = 'Shop all products',
  hideHeading = false,
}: OrderCloudProductListProps) {
  const { products: productsService, status, error: sessionError } = useOrderCloud();
  const routePath = useRoutePath();
  const pathname = usePathname();
  const isFeatured = presentation === 'featured';
  const resolvedLimit = limit ?? (isFeatured ? FEATURED_PRODUCT_LIMIT : undefined);
  const resolvedTitle = title ?? (isFeatured ? 'Featured' : 'OrderCloud products');
  const resolvedViewAllHref = viewAllHref ?? (isFeatured ? CATALOG_LIST_HREF : undefined);
  const resolvedCompact = compact ?? !isFeatured;
  const resolvedDetailPageHref = resolveProductListDetailPageHref({
    configuredHref: detailPageHref ?? (isFeatured ? CATALOG_LIST_HREF : undefined),
    routePath,
    pathname,
    isAuthoring,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const selectedIds = limitItems(
    productIds.map((productId) => productId.trim()).filter(Boolean),
    resolvedLimit,
  );
  const selectedIdsKey = selectedIds.join('\0');
  const isPickerList = source === 'ordercloud-picker';
  const hasPickerSelection = selectedIds.length > 0;

  useEffect(() => {
    if (isPickerList && !hasPickerSelection) {
      setProducts([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (status !== 'authenticated') {
      setProducts([]);
      setError(status === 'error' ? sessionError?.message ?? 'Unable to start commerce session' : null);
      setLoading(status === 'loading');
      return;
    }

    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const loadProducts = async () => {
      setLoading(true);
      try {
        const ids = selectedIdsKey ? selectedIdsKey.split('\0') : [];
        const payload = isPickerList
          ? await productsService.listByIds(ids, { signal: controller.signal })
          : await productsService.list({
              signal: controller.signal,
              pageSize: resolvedLimit,
            });
        if (!active) return;
        setProducts(limitItems(payload.items, resolvedLimit));
        setError(null);
      } catch (loadError) {
        if (!active) return;
        if (controller.signal.aborted && timedOut) {
          setProducts([]);
          setError(
            `Product request timed out after ${Math.floor(REQUEST_TIMEOUT_MS / 1000)}s. Check proxy/auth and try again.`
          );
          return;
        }

        if (controller.signal.aborted) return;

        setProducts([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load products');
      } finally {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    };

    void loadProducts();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    hasPickerSelection,
    isPickerList,
    productsService,
    refreshSeed,
    resolvedLimit,
    selectedIdsKey,
    sessionError,
    status,
  ]);

  const productGrid = (
    <div
      className={
        isFeatured
          ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid grid-cols-2 gap-3 md:grid-cols-3'
      }
    >
      {products.map((product, index) => (
        <OrderCloudProductCard
          key={product.id ? `${product.id}-${index}` : `product-${index}`}
          product={product}
          compact={resolvedCompact}
          presentation={presentation}
          href={buildProductDetailHref(resolvedDetailPageHref, product.id)}
        />
      ))}
    </div>
  );

  if (isFeatured) {
    return (
      <section className="space-y-6" data-component="OrderCloudProductList" data-presentation="featured">
        {!hideHeading && (
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shop</p>
              <h2 className="text-3xl font-semibold tracking-tight">{resolvedTitle}</h2>
            </div>
            {resolvedViewAllHref && (
              <NextLink href={resolvedViewAllHref} className="text-sm font-semibold underline">
                {viewAllLabel}
              </NextLink>
            )}
          </header>
        )}
        {hideHeading && resolvedViewAllHref && (
          <div className="flex justify-end">
            <NextLink href={resolvedViewAllHref} className="text-sm font-semibold underline">
              {viewAllLabel}
            </NextLink>
          </div>
        )}

        {loading && (
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            aria-live="polite"
          >
            {Array.from({ length: resolvedLimit ?? FEATURED_PRODUCT_LIMIT }, (_, index) => (
              <div key={`featured-skeleton-${index}`} className="space-y-3">
                <div className="aspect-square animate-pulse rounded-lg bg-slate-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
            <span className="sr-only">Loading featured products…</span>
          </div>
        )}
        {!loading && error && (
          <div className="space-y-3">
            <p className="text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshSeed((value) => value + 1)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-2 py-1 text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}
        {isAuthoring && !resolvedDetailPageHref && (
          <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
            Configure Detail Page so product cards can link to the product detail page.
          </p>
        )}
        {isPickerList && !hasPickerSelection && (
          <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
            {isAuthoring
              ? 'Select OrderCloud products on this listing, or switch Product List Source to catalog.'
              : 'No OrderCloud products selected for this listing.'}
          </p>
        )}
        {!loading && !error && products.length === 0 && !(isPickerList && !hasPickerSelection) && (
          <p className="text-amber-700">No products returned from OrderCloud.</p>
        )}
        {!loading && !error && products.length > 0 && productGrid}
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm" data-component="OrderCloudProductList">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{resolvedTitle}</h2>
        <div className="flex items-center gap-3">
          {!loading && !error && <span className="text-muted-foreground text-xs">{products.length} items</span>}
          <button
            type="button"
            onClick={() => setRefreshSeed((value) => value + 1)}
            disabled={loading || (isPickerList && !hasPickerSelection)}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Retry'}
          </button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading product data...</p>}
      {!loading && error && <p className="text-red-700">{error}</p>}
      {isAuthoring && !resolvedDetailPageHref && (
        <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          Configure Detail Page so product cards can link to the product detail page.
        </p>
      )}
      {isPickerList && !hasPickerSelection && (
        <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          {isAuthoring
            ? 'Select OrderCloud products on this listing, or switch Product List Source to catalog.'
            : 'No OrderCloud products selected for this listing.'}
        </p>
      )}

      {!loading && !error && products.length === 0 && !(isPickerList && !hasPickerSelection) && (
        <p className="text-amber-700">No products returned from OrderCloud.</p>
      )}

      {!loading && !error && products.length > 0 && productGrid}
    </section>
  );
}
