'use client';

import { useState } from 'react';
import type { CommerceProductImage } from '@/lib/commerce/products/types';

export const ProductGallery = ({
  images,
  productName,
  isAuthoring,
}: {
  images: CommerceProductImage[];
  productName: string;
  isAuthoring: boolean;
}) => {
  const [selectedUrl, setSelectedUrl] = useState(images[0]?.url);

  const selectedImage =
    images.find((image) => image.url === selectedUrl) ?? images[0];

  if (!selectedImage) {
    return isAuthoring ? (
      <div
        data-slot="product-media"
        className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
      >
        No product images are available.
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3" data-component="ProductGallery" data-slot="product-media">
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
                    ? 'border-slate-950'
                    : 'border-transparent opacity-70 hover:opacity-100'
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
    </div>
  );
};
