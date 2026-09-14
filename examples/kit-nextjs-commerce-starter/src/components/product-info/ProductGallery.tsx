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
      <div className="flex aspect-square items-center justify-center rounded border border-dashed text-sm text-slate-500">
        No product images are available.
      </div>
    ) : null;
  }

  return (
    <div className="space-y-3" data-component="ProductGallery">
      <div className="overflow-hidden rounded bg-slate-50">
        <img
          src={selectedImage.url}
          alt={selectedImage.alt ?? productName}
          className="aspect-square h-auto w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" aria-label="Product images">
          {images.map((image, index) => {
            const isSelected = image.url === selectedImage.url;
            return (
              <button
                key={image.url}
                type="button"
                onClick={() => setSelectedUrl(image.url)}
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-pressed={isSelected}
                className={`shrink-0 overflow-hidden rounded border-2 ${
                  isSelected ? 'border-slate-900' : 'border-transparent'
                }`}
              >
                <img
                  src={image.thumbnailUrl ?? image.url}
                  alt=""
                  className="h-20 w-20 object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
