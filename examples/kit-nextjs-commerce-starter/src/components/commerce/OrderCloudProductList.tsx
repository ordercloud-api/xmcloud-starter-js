'use client';

import { useEffect, useState } from 'react';
import OrderCloudProductCard, { type OrderCloudProduct } from './OrderCloudProductCard';

type ProductsPayload = {
  items?: OrderCloudProduct[];
  error?: string;
};

type OrderCloudProductListProps = {
  title?: string;
  compact?: boolean;
};

const REQUEST_TIMEOUT_MS = 10_000;

export default function OrderCloudProductList({
  title = 'OrderCloud products',
  compact = false,
}: OrderCloudProductListProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<OrderCloudProduct[]>([]);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/commerce/products', {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = (await response.json().catch(() => ({}))) as ProductsPayload;

        if (!response.ok) {
          throw new Error(payload.error || `Products request failed (${response.status})`);
        }

        setProducts(Array.isArray(payload.items) ? payload.items : []);
        setError(null);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') {
          setProducts([]);
          setError(
            `Product request timed out after ${Math.floor(REQUEST_TIMEOUT_MS / 1000)}s. Check proxy/auth and try again.`
          );
          return;
        }

        setProducts([]);
        setError(loadError instanceof Error ? loadError.message : 'Failed to load products');
      } finally {
        window.clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    void loadProducts();
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [refreshSeed]);

  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        <div className="flex items-center gap-3">
          {!loading && !error && <span className="text-muted-foreground text-xs">{products.length} items</span>}
          <button
            type="button"
            onClick={() => setRefreshSeed((value) => value + 1)}
            disabled={loading}
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md border px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading...' : 'Retry'}
          </button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading product data...</p>}
      {!loading && error && <p className="text-red-700">{error}</p>}
      {!loading && !error && products.length === 0 && (
        <p className="text-amber-700">No products returned from OrderCloud.</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className={compact ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2'}>
          {products.map((product, index) => (
            <OrderCloudProductCard
              key={product.id ? `${product.id}-${index}` : `product-${index}`}
              product={product}
              compact={compact}
            />
          ))}
        </div>
      )}
    </section>
  );
}
