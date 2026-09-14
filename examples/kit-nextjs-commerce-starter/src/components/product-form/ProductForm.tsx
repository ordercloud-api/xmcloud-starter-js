"use client";

import { useEffect, useState, type FormEvent } from "react";
import type React from "react";
import type { ComponentProps } from "@/lib/component-props";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import { useProductContext } from "@/contexts/ProductDataContext";
import { ProductSpecFields } from "./ProductSpecFields";
import {
  getInitialSpecSelections,
  toLineItemSpecs,
  validateSpecSelections,
  type CommerceProductSpec,
  type ProductSpecSelection,
  type ProductSpecSelections,
} from "@/lib/commerce/products/specs";

type SpecsStatus = "loading" | "ready" | "error";
type SubmissionStatus = "idle" | "adding" | "added" | "error";

export const Default: React.FC<ComponentProps> = ({ params, page }) => {
  const productData = useProductContext();
  const { products, cart } = useOrderCloud();
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;
  const [specs, setSpecs] = useState<CommerceProductSpec[]>([]);
  const [specsStatus, setSpecsStatus] = useState<SpecsStatus>("loading");
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [specsRefreshSeed, setSpecsRefreshSeed] = useState(0);
  const [selections, setSelections] = useState<ProductSpecSelections>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>("idle");
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(
    null,
  );
  const productId = productData?.productId;

  useEffect(() => {
    setSpecs([]);
    setSelections({});
    setSpecsError(null);
    setValidationErrors({});
    setQuantity("1");
    setQuantityError(null);
    setSubmissionStatus("idle");
    setSubmissionMessage(null);

    if (!productId || productData?.status !== "ready") {
      setSpecsStatus("loading");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setSpecsStatus("loading");

    void products
      .listSpecs(productId, { signal: controller.signal })
      .then((nextSpecs) => {
        if (!active) return;
        setSpecs(nextSpecs);
        setSelections(getInitialSpecSelections(nextSpecs));
        setSpecsStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setSpecsError(
          error instanceof Error
            ? error.message
            : "Unable to load product options",
        );
        setSpecsStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productData?.status, productId, products, specsRefreshSeed]);

  const updateSelection = (specId: string, selection: ProductSpecSelection) => {
    setSelections((current) => ({ ...current, [specId]: selection }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[specId];
      return next;
    });
    setSubmissionStatus("idle");
    setSubmissionMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!productId || specsStatus !== "ready") return;

    const nextSpecErrors = validateSpecSelections(specs, selections);
    const normalizedQuantity = Number(quantity);
    const hasValidQuantity =
      Number.isInteger(normalizedQuantity) && normalizedQuantity >= 1;
    setValidationErrors(nextSpecErrors);
    setQuantityError(
      hasValidQuantity ? null : "Enter a quantity of at least 1.",
    );
    if (Object.keys(nextSpecErrors).length > 0 || !hasValidQuantity) return;

    setSubmissionStatus("adding");
    setSubmissionMessage(null);
    try {
      await cart.addItem({
        productId,
        quantity: normalizedQuantity,
        specs: toLineItemSpecs(specs, selections),
      });
      setSubmissionStatus("added");
      setSubmissionMessage("Added to cart");
    } catch (error) {
      setSubmissionStatus("error");
      setSubmissionMessage(
        error instanceof Error
          ? error.message
          : "Unable to add product to cart",
      );
    }
  };

  if (!productData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        ProductForm must be placed inside a ProductContainer.
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
      >
        <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-12 w-36 animate-pulse rounded bg-slate-100" />
        <span className="sr-only">Loading product purchase options…</span>
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
          : (productData.error?.message ?? "Unable to load the product form.");

    return (
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <span className="font-medium">ProductForm:</span> {message}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={`space-y-5 ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="ProductForm"
      noValidate
    >
      {specsStatus === "loading" && (
        <p className="text-sm text-slate-600" aria-live="polite">
          Loading product options…
        </p>
      )}

      {specsStatus === "error" && (
        <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700" role="alert">
            {specsError}
          </p>
          <button
            type="button"
            onClick={() => setSpecsRefreshSeed((value) => value + 1)}
            className="text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {specsStatus === "ready" && specs.length > 0 && (
        <div className="space-y-4">
          <ProductSpecFields
            specs={specs}
            selections={selections}
            errors={validationErrors}
            disabled={submissionStatus === "adding"}
            onChange={updateSelection}
          />
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium">Quantity</span>
        <input
          type="number"
          min={1}
          step={1}
          value={quantity}
          disabled={submissionStatus === "adding"}
          aria-describedby={
            quantityError ? "product-quantity-error" : undefined
          }
          onChange={(event) => {
            setQuantity(event.currentTarget.value);
            setQuantityError(null);
            setSubmissionStatus("idle");
            setSubmissionMessage(null);
          }}
          className="w-24 rounded border border-slate-300 px-3 py-2"
        />
      </label>
      {quantityError && (
        <p
          id="product-quantity-error"
          className="text-sm text-red-700"
          role="alert"
        >
          {quantityError}
        </p>
      )}

      <button
        type="submit"
        disabled={specsStatus !== "ready" || submissionStatus === "adding"}
        className="rounded bg-slate-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submissionStatus === "adding" ? "Adding…" : "Add to cart"}
      </button>

      {submissionMessage && (
        <p
          className={
            submissionStatus === "error"
              ? "text-sm text-red-700"
              : "text-sm text-emerald-700"
          }
          role={submissionStatus === "error" ? "alert" : "status"}
        >
          {submissionMessage}
        </p>
      )}
    </form>
  );
};
