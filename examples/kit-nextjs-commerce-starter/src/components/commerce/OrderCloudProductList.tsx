'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useOrderCloud } from '@/contexts/OrderCloudContext';
import { useRoutePath } from '@/contexts/RoutePathContext';
import {
  buildProductDetailHref,
  resolveProductListDetailPageHref,
} from '@/lib/commerce/products/href';
import type { ProductListSource } from '@/lib/commerce/products/list-source';
import type { CommerceProduct } from '@/lib/commerce/products/types';
import OrderCloudProductCard from './OrderCloudProductCard';

type OrderCloudProductListProps = {
  title?: string;
  compact?: boolean;
  source?: ProductListSource;
  productIds?: string[];
  detailPageHref?: string;
  isAuthoring?: boolean;
};

const REQUEST_TIMEOUT_MS = 10_000;

export default function OrderCloudProductList({
  title = 'OrderCloud products',
  compact = false,
  source = 'ordercloud-catalog',
  productIds = [],
  detailPageHref,
  isAuthoring = false,
}: OrderCloudProductListProps) {
  const { products: productsService, status, error: sessionError } = useOrderCloud();
  const routePath = useRoutePath();
  const pathname = usePathname();
  const resolvedDetailPageHref = resolveProductListDetailPageHref({
    configuredHref: detailPageHref,
    routePath,
    pathname,
    isAuthoring,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const selectedIds = productIds.map((productId) => productId.trim()).filter(Boolean);
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
          : await productsService.list({ signal: controller.signal });
        if (!active) return;
        setProducts(payload.items);
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
  }, [hasPickerSelection, isPickerList, productsService, refreshSeed, selectedIdsKey, sessionError, status]);

  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
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

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {products.map((product, index) => (
            <OrderCloudProductCard
              key={product.id ? `${product.id}-${index}` : `product-${index}`}
              product={product}
              compact={compact}
              href={buildProductDetailHref(resolvedDetailPageHref, product.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
