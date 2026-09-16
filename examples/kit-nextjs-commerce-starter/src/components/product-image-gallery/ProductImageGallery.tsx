"use client";

import { useState } from "react";
import type React from "react";
import type { ComponentProps } from "@/lib/component-props";
import { useProductContext } from "@/contexts/ProductDataContext";
import type { CommerceProductImage } from "@/lib/commerce/products/types";

const Gallery = ({
  images,
  productName,
}: {
  images: CommerceProductImage[];
  productName: string;
}) => {
  const [selectedUrl, setSelectedUrl] = useState(images[0]?.url);
  const selectedImage =
    images.find((image) => image.url === selectedUrl) ?? images[0];

  if (!selectedImage) return null;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img
          src={selectedImage.url}
          alt={selectedImage.alt ?? productName}
          className="aspect-square h-auto w-full object-contain p-4 lg:p-8"
        />
      </div>
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2" aria-label="Product images">
          {images.map((image, index) => {
            const isSelected = image.url === selectedImage.url;
            return (
              <button
                key={image.url}
                type="button"
                onClick={() => setSelectedUrl(image.url)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-pressed={isSelected}
                className={`shrink-0 overflow-hidden rounded-lg border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 ${
                  isSelected
                    ? "border-slate-950"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img
                  src={image.thumbnailUrl ?? image.url}
                  alt=""
                  className="h-16 w-16 object-cover sm:h-20 sm:w-20"
                />
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export const Default: React.FC<ComponentProps> = ({ params, page }) => {
  const productData = useProductContext();
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!productData) {
    return isAuthoring ? (
      <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
        ProductImageGallery must be placed inside a ProductContainer.
      </div>
    ) : null;
  }

  if (
    productData.status === "loading-session" ||
    productData.status === "loading-product"
  ) {
    return (
      <div
        className={`aspect-square animate-pulse rounded-2xl bg-slate-100 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        aria-live="polite"
        data-component="ProductImageGallery"
      >
        <span className="sr-only">Loading product images…</span>
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
          : (productData.error?.message ?? "Unable to load product images.");

    return (
      <div className="rounded border border-dashed p-3 text-sm text-slate-600">
        <span className="font-medium">ProductImageGallery:</span> {message}
      </div>
    );
  }

  if (productData.product.images.length === 0) {
    return isAuthoring ? (
      <div
        className={`flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500 ${params.styles ?? ""}`}
        id={params.RenderingIdentifier}
        data-component="ProductImageGallery"
      >
        No product images are available.
      </div>
    ) : null;
  }

  return (
    <div
      className={`space-y-3 ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="ProductImageGallery"
    >
      <Gallery
        images={productData.product.images}
        productName={productData.product.name}
      />
    </div>
  );
};
