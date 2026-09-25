"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import type { CommerceProduct } from "@/lib/commerce/products/types";

export type AuthoringProductFieldConfig = {
  dataSource: string;
  fieldName: string;
  helpText: string;
  initialIds: string[];
  language: string;
  mode: "single" | "multiple";
  title: string;
};

type AuthoringProductFieldProps = AuthoringProductFieldConfig & {
  onSaved: (ids: string[]) => void;
};

type VisibleBounds = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const serializeIds = (ids: string[], mode: "single" | "multiple"): string =>
  mode === "single" ? (ids[0] ?? "") : ids.join("\n");

const ProductSummary = ({
  id,
  product,
  actions,
}: {
  id: string;
  product?: CommerceProduct;
  actions?: ReactNode;
}) => (
  <div className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3">
    {(product?.thumbnailUrl ?? product?.imageUrl) ? (
      <img
        src={product?.thumbnailUrl ?? product?.imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded object-cover"
      />
    ) : (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-500">
        Image
      </div>
    )}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-slate-950">
        {product?.name ?? id}
      </span>
      <span className="block truncate text-xs text-slate-600">{id}</span>
    </span>
    {actions}
  </div>
);

export default function AuthoringProductField({
  dataSource,
  fieldName,
  helpText,
  initialIds,
  language,
  mode,
  onSaved,
  title,
}: AuthoringProductFieldProps) {
  const {
    products: productsService,
    status,
    error: sessionError,
  } = useOrderCloud();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommerceProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState(initialIds);
  const [selectedProducts, setSelectedProducts] = useState<CommerceProduct[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [visibleBounds, setVisibleBounds] = useState<VisibleBounds>();

  useEffect(() => setSelectedIds(initialIds), [initialIds]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!open || !overlay || typeof IntersectionObserver === "undefined") {
      setVisibleBounds(undefined);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { height, left, top, width } = entry.intersectionRect;
        if (width > 0 && height > 0) {
          setVisibleBounds({ height, left, top, width });
        }
      },
      {
        root: null,
        threshold: Array.from({ length: 101 }, (_, index) => index / 100),
      },
    );
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (status !== "authenticated" || selectedIds.length === 0) {
      setSelectedProducts([]);
      return;
    }

    const controller = new AbortController();
    void productsService
      .listByIds(selectedIds, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setSelectedProducts(response.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSelectedProducts([]);
      });
    return () => controller.abort();
  }, [productsService, selectedIds, status]);

  useEffect(() => {
    if (!open || status !== "authenticated") return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void productsService
        .list({
          search: query.trim() || undefined,
          pageSize: 20,
          signal: controller.signal,
        })
        .then((response) => {
          if (!controller.signal.aborted) setResults(response.items);
        })
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setError(
              loadError instanceof Error
                ? loadError.message
                : "Unable to load OrderCloud products",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, productsService, query, status]);

  const productById = useMemo(
    () => new Map(selectedProducts.map((product) => [product.id, product])),
    [selectedProducts],
  );

  const toggle = (id: string) => {
    setError(null);
    if (mode === "single") {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id],
    );
  };

  const move = (index: number, offset: -1 | 1) => {
    setSelectedIds((current) => {
      const target = index + offset;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/editing/field", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sitecore-Editing-Secret":
            new URLSearchParams(window.location.search).get("secret") ?? "",
        },
        body: JSON.stringify({
          dataSource,
          fieldName,
          language,
          value: serializeIds(selectedIds, mode),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Unable to save the selected products");
      }
      onSaved(selectedIds);
      setOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the selected products",
      );
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSelectedIds([]);
    if (!open) setOpen(true);
  };

  const cancel = () => {
    setSelectedIds(initialIds);
    setError(null);
    setOpen(false);
  };

  return (
    <div className="mb-5 rounded border border-blue-300 bg-blue-50 p-4 text-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs text-slate-600">{helpText}</p>
          <p className="mt-1 text-xs font-medium text-blue-800">
            Sitecore field: {fieldName}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => void clear()}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
          >
            {selectedIds.length > 0 ? "Change product" : "Choose product"}
            {mode === "multiple" ? "s" : ""}
          </button>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {selectedIds.map((id) => (
            <ProductSummary key={id} id={id} product={productById.get(id)} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded border border-dashed border-blue-300 p-3 text-sm text-slate-600">
          No product{mode === "multiple" ? "s" : ""} selected.
        </p>
      )}

      {open && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[1000] overflow-hidden bg-slate-950/50"
        >
          <div
            className="absolute flex max-w-full -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-lg bg-white p-3 shadow-xl sm:p-5"
            style={{
              left: visibleBounds
                ? visibleBounds.left + visibleBounds.width / 2
                : "50%",
              top: visibleBounds
                ? visibleBounds.top + visibleBounds.height / 2
                : "50%",
              width: visibleBounds
                ? Math.max(0, Math.min(768, visibleBounds.width - 32))
                : "min(48rem, calc(100vw - 2rem))",
              maxHeight: visibleBounds
                ? Math.max(0, visibleBounds.height - 32)
                : "calc(100dvh - 2rem)",
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Search OrderCloud and select{" "}
                  {mode === "multiple" ? "products" : "a product"}.
                </p>
              </div>
              <button
                type="button"
                onClick={cancel}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>

            {mode === "multiple" && selectedIds.length > 0 && (
              <div className="space-y-2 rounded bg-slate-50 p-3">
                <p className="text-sm font-medium">Selected order</p>
                {selectedIds.map((id, index) => (
                  <ProductSummary
                    key={id}
                    id={id}
                    product={productById.get(id)}
                    actions={
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${id} earlier`}
                          className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === selectedIds.length - 1}
                          aria-label={`Move ${id} later`}
                          className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggle(id)}
                          className="rounded border px-2 py-1 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            )}

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

            {status === "loading" && (
              <p className="text-sm">Starting commerce session…</p>
            )}
            {status === "error" && (
              <p
                role="alert"
                className="rounded bg-red-50 p-3 text-sm text-red-700"
              >
                {sessionError?.message ??
                  "Unable to start the commerce session"}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="rounded bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            {loading && (
              <p className="text-sm text-slate-600">Loading products…</p>
            )}

            {!loading && status === "authenticated" && (
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {results.length === 0 && (
                  <p className="text-sm text-slate-600">No products found.</p>
                )}
                {results.map((product) => {
                  const selected = selectedIds.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => toggle(product.id)}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-3 rounded border p-3 text-left ${
                        selected
                          ? "border-blue-600 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      {(product.thumbnailUrl ?? product.imageUrl) && (
                        <img
                          src={product.thumbnailUrl ?? product.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {product.name}
                        </span>
                        <span className="block text-xs text-slate-600">
                          {product.id}
                        </span>
                      </span>
                      <span className="text-sm font-medium">
                        {selected ? "Selected" : "Select"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-sm text-slate-600">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save selection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
