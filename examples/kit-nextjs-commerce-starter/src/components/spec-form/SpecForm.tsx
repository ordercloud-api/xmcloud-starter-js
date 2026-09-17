"use client";

import type React from "react";
import type { ComponentProps } from "@/lib/component-props";
import { useProductContext } from "@/contexts/ProductDataContext";
import {
  ProductSpecFields,
  resolveDefaultOptionControl,
} from "@/components/commerce/ProductSpecFields";

const SpecForm: React.FC<
  ComponentProps & { variantDefaultOptionControl?: "dropdown" | "buttons" }
> = ({ params, page, variantDefaultOptionControl }) => {
  const productData = useProductContext();
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;
  const defaultOptionControl =
    variantDefaultOptionControl ??
    resolveDefaultOptionControl(
      params.DefaultOptionControl ?? params["Default Option Control"],
    );

  if (!productData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        SpecForm must be placed inside a ProductContainer.
      </div>
    ) : null;
  }

  if (
    productData.status === "loading-session" ||
    productData.status === "loading-product"
  ) {
    return (
      <div
        className={`space-y-4 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        aria-live="polite"
        data-component="SpecForm"
      >
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <span className="sr-only">Loading product options…</span>
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
          : (productData.error?.message ?? "Unable to load product options.");

    return (
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <span className="font-medium">SpecForm:</span> {message}
      </div>
    );
  }

  const hasVisibleContent =
    productData.specsStatus === "loading" ||
    productData.specsStatus === "error" ||
    (productData.specsStatus === "ready" && productData.specs.length > 0);

  if (!hasVisibleContent) {
    return isAuthoring ? (
      <div
        className={`rounded border border-dashed p-3 text-sm text-slate-600 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        data-component="SpecForm"
      >
        No product options are configured.
      </div>
    ) : null;
  }

  return (
    <div
      className={`space-y-4 border-t border-slate-200 pt-6 ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="SpecForm"
    >
      {productData.specsStatus === "loading" && (
        <p className="text-sm text-slate-600" aria-live="polite">
          Loading product options…
        </p>
      )}

      {productData.specsStatus === "error" && (
        <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700" role="alert">
            {productData.specsError}
          </p>
          <button
            type="button"
            onClick={productData.retrySpecs}
            className="text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {productData.specsStatus === "ready" && productData.specs.length > 0 && (
        <ProductSpecFields
          specs={productData.specs}
          selections={productData.selections}
          errors={productData.validationErrors}
          defaultOptionControl={defaultOptionControl}
          currency={productData.product.currency}
          disabled={false}
          optionAvailability={productData.optionAvailability}
          onChange={productData.updateSelection}
        />
      )}
    </div>
  );
};

export const Default: React.FC<ComponentProps> = (props) => (
  <SpecForm {...props} variantDefaultOptionControl="dropdown" />
);

export const Buttons: React.FC<ComponentProps> = (props) => (
  <SpecForm {...props} variantDefaultOptionControl="buttons" />
);
