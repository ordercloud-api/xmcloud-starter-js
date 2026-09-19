"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import { buildProductDetailHref } from "@/lib/commerce/products/href";
import type { CommerceProduct } from "@/lib/commerce/products/types";
import OrderCloudProductCard from "./OrderCloudProductCard";

type FeaturedProductsRailProps = {
  detailPageHref: string;
  header?: ReactNode;
  isAuthoring: boolean;
  maxProductsPerRow: number;
  productIds: string[];
};

type ScrollState = {
  hasOverflow: boolean;
  canScrollBackward: boolean;
  canScrollForward: boolean;
};

const EMPTY_SCROLL_STATE: ScrollState = {
  hasOverflow: false,
  canScrollBackward: false,
  canScrollForward: false,
};

const ProductSkeleton = () => (
  <div className="w-full space-y-2" aria-hidden="true">
    <div className="aspect-square animate-pulse rounded bg-slate-100" />
    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
  </div>
);

export default function FeaturedProductsRail({
  detailPageHref,
  header,
  isAuthoring,
  maxProductsPerRow,
  productIds,
}: FeaturedProductsRailProps) {
  const { products: productsService, status } = useOrderCloud();
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [loading, setLoading] = useState(productIds.length > 0);
  const [error, setError] = useState(false);
  const [scrollState, setScrollState] =
    useState<ScrollState>(EMPTY_SCROLL_STATE);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([]);
      setLoading(false);
      setError(false);
      return;
    }

    if (status !== "authenticated") {
      setProducts([]);
      setLoading(status === "loading");
      setError(status === "error");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(false);

    void productsService
      .listByIds(productIds, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setProducts(response.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProducts([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productIds, productsService, status]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) {
      setScrollState(EMPTY_SCROLL_STATE);
      return;
    }

    const maximumScrollLeft = rail.scrollWidth - rail.clientWidth;
    const hasOverflow = maximumScrollLeft > 1;
    setScrollState({
      hasOverflow,
      canScrollBackward: hasOverflow && rail.scrollLeft > 1,
      canScrollForward:
        hasOverflow && rail.scrollLeft < maximumScrollLeft - 1,
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(rail);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [products, loading, updateScrollState]);

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    rail.scrollBy({
      left: direction * rail.clientWidth * 0.85,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  if (productIds.length === 0) {
    return isAuthoring ? (
      <>
        {header}
        <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          Choose products in the component properties.
        </p>
      </>
    ) : null;
  }

  if (!loading && error) {
    return (
      <>
        {header}
        <p
          role="alert"
          className="rounded border border-slate-200 bg-slate-50 p-4 text-sm"
        >
          Products are temporarily unavailable.
        </p>
      </>
    );
  }

  if (!loading && products.length === 0) {
    return isAuthoring ? (
      <>
        {header}
        <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600">
          The selected products are not visible to the current shopper.
        </p>
      </>
    ) : null;
  }

  const visibleItemCount = Math.min(
    maxProductsPerRow,
    loading ? productIds.length : products.length,
  );
  const cardBasis = `calc((100% - ${(maxProductsPerRow - 1) * 16}px) / ${maxProductsPerRow})`;
  const railStyle = {
    "--featured-product-basis": cardBasis,
  } as CSSProperties;

  return (
    <>
      {header}
      <div className="space-y-3">
        {scrollState.hasOverflow && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              disabled={!scrollState.canScrollBackward}
              aria-label="Previous featured products"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              disabled={!scrollState.canScrollForward}
              aria-label="Next featured products"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-lg disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}

        <div
          ref={railRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={railStyle}
          aria-busy={loading}
        >
          {loading
            ? Array.from({ length: visibleItemCount }, (_, index) => (
                <div
                  key={`featured-product-skeleton-${index}`}
                  className={`${
                    productIds.length === 1
                      ? "w-full"
                      : "w-[82%] sm:w-[calc((100%_-_1rem)/2)] lg:w-[var(--featured-product-basis)]"
                  } shrink-0 snap-start`}
                >
                  <ProductSkeleton />
                </div>
              ))
            : products.map((product) => (
                <div
                  key={product.id}
                  className={`${
                    products.length === 1
                      ? "w-full"
                      : "w-[82%] sm:w-[calc((100%_-_1rem)/2)] lg:w-[var(--featured-product-basis)]"
                  } shrink-0 snap-start`}
                >
                  <OrderCloudProductCard
                    product={product}
                    href={buildProductDetailHref(detailPageHref, product.id)}
                  />
                </div>
              ))}
          {loading && (
            <span className="sr-only">Loading featured products…</span>
          )}
        </div>
      </div>
    </>
  );
}
