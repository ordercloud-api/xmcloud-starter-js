"use client";

import { useEffect, useState, type FormEvent } from "react";
import type React from "react";
import Link from "next/link";
import {
  useProduct,
  useProductOptions,
  useProductSelection,
} from "@sitecore-content-sdk/nextjs/commerce";
import type { ComponentProps } from "@/lib/component-props";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import { hasOrderCloudStatus } from "@/lib/commerce/client";
import { getCartDestinationFromRoute } from "@/lib/commerce/cart/destination";
import type { CommerceProduct } from "@/lib/commerce/products/types";

type SubmissionStatus = "idle" | "adding" | "added" | "error";

export const Default: React.FC<ComponentProps> = ({ params, page }) => {
  const productData = useProduct<CommerceProduct | null>({ optional: true });
  const optionsData = useProductOptions({ optional: true });
  const selectionData = useProductSelection({ optional: true });
  const { cart, startFreshAnonymousSession } = useOrderCloud();
  const isAuthoring =
    page.mode.isEditing || page.mode.isPreview || page.mode.isDesignLibrary;
  const cartHref = getCartDestinationFromRoute(
    page.layout?.sitecore?.route,
  ).href;
  const [quantity, setQuantity] = useState("1");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>("idle");
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(
    null,
  );
  const productId = productData?.productId;

  useEffect(() => {
    setQuantity("1");
    setQuantityError(null);
    setSubmissionStatus("idle");
    setSubmissionMessage(null);
  }, [productId]);

  useEffect(() => {
    setSubmissionStatus("idle");
    setSubmissionMessage(null);
  }, [selectionData?.selections]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !selectionData ||
      !productId ||
      !cart ||
      optionsData?.status !== "success" ||
      isAuthoring
    ) {
      return;
    }

    const normalizedQuantity = Number(quantity);
    const hasValidQuantity =
      Number.isInteger(normalizedQuantity) && normalizedQuantity >= 1;
    const validSelection = selectionData.validate();
    setQuantityError(
      hasValidQuantity ? null : "Enter a quantity of at least 1.",
    );
    const draft = selectionData.getLineItemDraft();
    if (!validSelection || !draft) {
      setSubmissionStatus("error");
      setSubmissionMessage("Select the required product options.");
      return;
    }
    if (!hasValidQuantity) return;

    setSubmissionStatus("adding");
    setSubmissionMessage(null);
    try {
      try {
        await cart.addItem({
          productId: draft.ProductID,
          quantity: normalizedQuantity,
          specs: draft.Specs,
        });
      } catch (error) {
        if (!hasOrderCloudStatus(error, 409)) throw error;
        await startFreshAnonymousSession();
        await cart.addItem({
          productId: draft.ProductID,
          quantity: normalizedQuantity,
          specs: draft.Specs,
        });
      }
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

  if (!productData || !optionsData || !selectionData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        AddToCart must be placed inside a ProductContainer.
      </div>
    ) : null;
  }

  if (productData.isLoading) {
    return (
      <div
        className={`space-y-4 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        aria-live="polite"
        data-component="AddToCart"
      >
        <div className="h-12 w-36 animate-pulse rounded bg-slate-100" />
        <span className="sr-only">Loading add to cart…</span>
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
          : (productData.error?.message ?? "Unable to load add to cart.");

    return (
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <span className="font-medium">AddToCart:</span> {message}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className={`space-y-4 border-t border-slate-200 pt-6 ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="AddToCart"
      noValidate
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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
            className="w-24 rounded-md border border-slate-300 px-3 py-3"
          />
        </label>
        <button
          type="submit"
          disabled={
            !selectionData.isComplete ||
            isAuthoring ||
            submissionStatus === "adding"
          }
          className="min-h-12 flex-1 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submissionStatus === "adding" ? "Adding…" : "Add to cart"}
        </button>
      </div>
      {quantityError && (
        <p
          id="product-quantity-error"
          className="text-sm text-red-700"
          role="alert"
        >
          {quantityError}
        </p>
      )}

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
          {submissionStatus === "added" && (
            <>
              {" "}
              <Link href={cartHref} className="font-semibold underline">
                View cart
              </Link>
            </>
          )}
        </p>
      )}
    </form>
  );
};
