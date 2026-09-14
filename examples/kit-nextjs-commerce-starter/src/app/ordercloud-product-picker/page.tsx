'use client';

import { useEffect, useState } from 'react';
import { useMarketplaceClient } from '@/hooks/useMarketplaceClient';
import type {
  CommerceProduct,
  CommerceProductList,
} from '@/lib/commerce/products/types';
import {
  parseProductReference,
  serializeProductReference,
  type ProductReference,
} from '@/lib/commerce/products/reference';

const asErrorMessage = (value: unknown): string => {
  if (value && typeof value === 'object' && 'error' in value) {
    const error = (value as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return 'Unable to load OrderCloud products';
};

export default function OrderCloudProductPickerPage() {
  const {
    client,
    error: marketplaceError,
    isLoading: isMarketplaceLoading,
  } = useMarketplaceClient();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [selected, setSelected] = useState<ProductReference | undefined>();
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!client) return;
    void client
      .getValue()
      .then((value: unknown) => setSelected(parseProductReference(value)));
  }, [client]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      const searchParams = new URLSearchParams({ pageSize: '20' });
      if (query.trim()) searchParams.set('search', query.trim());

      setLoadingProducts(true);
      setProductError(null);
      void fetch(`/api/commerce/products?${searchParams.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const body = (await response.json()) as
            CommerceProductList | { error: string };
          if (!response.ok || !('items' in body))
            throw new Error(asErrorMessage(body));
          setProducts(body.items);
        })
        .catch((loadError: unknown) => {
          if (
            loadError instanceof DOMException &&
            loadError.name === 'AbortError'
          )
            return;
          setProducts([]);
          setProductError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load OrderCloud products',
          );
        })
        .finally(() => setLoadingProducts(false));
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query]);

  const save = async () => {
    if (!client || !selected) return;
    setSaving(true);
    try {
      await client.setValue(serializeProductReference(selected), true);
      await client.closeApp();
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!client) return;
    setSaving(true);
    try {
      await client.setValue('', true);
      await client.closeApp();
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-5 bg-white p-6 text-slate-950">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Select an OrderCloud product</h1>
        <p className="text-sm text-slate-600">
          Search the buyer catalog, select a product, and save its stable
          OrderCloud ID.
        </p>
      </header>

      <label className="block space-y-2">
        <span className="text-sm font-medium">Search products</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search by product name or ID"
          className="w-full rounded border border-slate-300 px-3 py-2"
          autoFocus
        />
      </label>

      {marketplaceError && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          Open this picker from its SitecoreAI custom field to enable Save.{' '}
          {marketplaceError.message}
        </p>
      )}
      {productError && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">
          {productError}
        </p>
      )}
      {loadingProducts && (
        <p className="text-sm text-slate-600">Loading products…</p>
      )}

      {!loadingProducts && !productError && (
        <fieldset className="space-y-2">
          <legend className="sr-only">OrderCloud products</legend>
          {products.length === 0 && (
            <p className="text-sm text-slate-600">No products found.</p>
          )}
          {products.map((product) => {
            const isSelected = selected?.id === product.id;
            return (
              <label
                key={product.id}
                className={`flex cursor-pointer gap-3 rounded border p-3 ${
                  isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="product"
                  checked={isSelected}
                  onChange={() =>
                    setSelected({ id: product.id, name: product.name })
                  }
                  className="mt-1"
                />
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="h-14 w-14 rounded object-cover"
                  />
                )}
                <span className="min-w-0">
                  <span className="block font-medium">{product.name}</span>
                  <span className="block text-xs text-slate-600">
                    {product.id}
                  </span>
                  {(product.brand || product.category) && (
                    <span className="block text-xs text-slate-500">
                      {[product.brand, product.category]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      <footer className="sticky bottom-0 flex items-center justify-between gap-3 border-t bg-white py-4">
        <button
          type="button"
          onClick={() => void clear()}
          disabled={!client || saving}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Clear
        </button>
        <div className="flex items-center gap-3">
          {selected && (
            <span className="max-w-64 truncate text-sm text-slate-600">
              {selected.name ?? selected.id}
            </span>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={!client || !selected || saving || isMarketplaceLoading}
            className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </footer>
    </main>
  );
}
