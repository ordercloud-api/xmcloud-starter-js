"use client";

import type React from "react";
import type { ComponentProps } from "@/lib/component-props";
import { useProductContext } from "@/contexts/ProductDataContext";
import { ProductGallery } from "./ProductGallery";

const formatPrice = (price?: number, currency?: string): string => {
  if (price === undefined) return "Price unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency || "USD"}`;
  }
};

export const Default: React.FC<ComponentProps> = ({ params, page }) => {
  const productData = useProductContext();
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!productData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        ProductInfo must be placed inside a ProductContainer.
      </div>
    ) : null;
  }

  if (
    productData.status === "loading-session" ||
    productData.status === "loading-product"
  ) {
    return (
      <div
        className={`grid animate-pulse gap-6 md:grid-cols-2 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        aria-live="polite"
      >
        <div className="aspect-square rounded bg-slate-100" />
        <div className="space-y-4 py-4">
          <div className="h-8 w-3/4 rounded bg-slate-100" />
          <div className="h-6 w-1/3 rounded bg-slate-100" />
          <span className="sr-only">Loading product information…</span>
        </div>
      </div>
    );
  }

  if (productData.status !== "ready" || !productData.product) {
    if (!isAuthoring) return null;
    const message =
      productData.status === "configuration-error"
        ? "Configure Product Source and its corresponding product ID on ProductContainer."
        : productData.status === "not-found"
          ? `Product ${productData.productId ?? ""} was not found.`
          : (productData.error?.message ??
            "Unable to load product information.");

    return (
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <span className="font-medium">ProductInfo:</span> {message}
      </div>
    );
  }

  const product = productData.product;

  return (
    <article
      className={`grid gap-6 md:grid-cols-2 ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="ProductInfo"
    >
      <ProductGallery
        images={product.images}
        productName={product.name}
        isAuthoring={isAuthoring}
      />
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <p className="text-xl font-semibold">
          {formatPrice(product.price, product.currency)}
        </p>
        {product.description && (
          <p className="text-base leading-7">{product.description}</p>
        )}
      </div>
    </article>
  );
};
