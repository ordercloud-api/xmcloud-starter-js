"use client";

import type React from "react";
import { useMemo } from "react";
import {
  useProduct,
  useProductOptions,
  useProductSelection,
} from "@sitecore-content-sdk/nextjs/commerce";
import type { ComponentProps } from "@/lib/component-props";
import {
  ProductSpecFields,
  resolveDefaultOptionControl,
} from "@/components/commerce/ProductSpecFields";
import type { CommerceProduct } from "@/lib/commerce/products/types";
import {
  toCommerceProductSpec,
  toProductSpecErrors,
} from "@/lib/commerce/products/specs";

const SpecForm: React.FC<
  ComponentProps & { variantDefaultOptionControl?: "dropdown" | "buttons" }
> = ({ params, page, variantDefaultOptionControl }) => {
  const productData = useProduct<CommerceProduct | null>({ optional: true });
  const optionsData = useProductOptions({ optional: true });
  const selectionData = useProductSelection({ optional: true });
  const isAuthoring =
    page.mode.isEditing || page.mode.isPreview || page.mode.isDesignLibrary;
  const defaultOptionControl =
    variantDefaultOptionControl ??
    resolveDefaultOptionControl(
      params.DefaultOptionControl ?? params["Default Option Control"],
    );
  const specs = useMemo(
    () =>
      optionsData?.specs.flatMap((spec) => {
        const mapped = toCommerceProductSpec(spec);
        return mapped ? [mapped] : [];
      }) ?? [],
    [optionsData?.specs],
  );
  const validationErrors = useMemo(
    () => toProductSpecErrors(specs, selectionData?.visibleIssues ?? []),
    [selectionData?.visibleIssues, specs],
  );

  if (!productData || !optionsData || !selectionData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        SpecForm must be placed inside a ProductContainer.
      </div>
    ) : null;
  }

  if (productData.isLoading) {
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

  if (!productData.isSuccess || !productData.product) {
    if (!isAuthoring) return null;
    const message =
      productData.status === "idle"
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
    optionsData.status === "loading" ||
    optionsData.status === "error" ||
    (optionsData.status === "success" && specs.length > 0);

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
      {optionsData.status === "loading" && (
        <p className="text-sm text-slate-600" aria-live="polite">
          Loading product options…
        </p>
      )}

      {optionsData.status === "error" && (
        <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700" role="alert">
            {optionsData.error?.message ?? "Unable to load product options."}
          </p>
          <button
            type="button"
            onClick={() => void optionsData.refetch()}
            className="text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {validationErrors.message && (
        <p className="text-sm text-red-700" role="alert">
          {validationErrors.message}
        </p>
      )}

      {optionsData.status === "success" && specs.length > 0 && (
        <ProductSpecFields
          specs={specs}
          selections={selectionData.selections}
          errors={validationErrors.fields}
          defaultOptionControl={defaultOptionControl}
          currency={productData.product.currency}
          disabled={false}
          optionAvailability={optionsData.optionAvailability}
          onChange={selectionData.setSelection}
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
