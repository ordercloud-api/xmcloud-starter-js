'use client';

import type { ProductListPresentation } from '@/lib/commerce/products/list-source';
import type { CommerceProduct } from '@/lib/commerce/products/types';

type OrderCloudProductCardProps = {
  product: CommerceProduct;
  compact?: boolean;
  href?: string;
  presentation?: ProductListPresentation;
};

const formatPrice = (price?: number, currency?: string): string => {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 'Price unavailable';

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency || 'USD'}`;
  }
};

export default function OrderCloudProductCard({
  product,
  compact = false,
  href,
  presentation = 'catalog',
}: OrderCloudProductCardProps) {
  const isFeatured = presentation === 'featured';
  const imageUrl = product.thumbnailUrl ?? product.imageUrl;
  const content = (
    <>
      <div
        className={`aspect-square overflow-hidden bg-slate-100 ${
          isFeatured ? 'rounded-lg' : 'rounded'
        }`}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className={isFeatured ? 'space-y-1' : 'space-y-0.5'}>
        <p
          className={
            isFeatured
              ? 'line-clamp-2 text-base font-semibold leading-tight'
              : 'line-clamp-2 text-sm font-medium leading-tight'
          }
        >
          {product.name}
        </p>
        {!compact && !isFeatured && <p className="text-muted-foreground text-xs">ID: {product.id}</p>}
        {(product.brand || product.category) && (
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {[product.brand, product.category].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className={`font-semibold text-emerald-700 ${isFeatured ? 'text-sm' : 'text-xs'}`}>
          {formatPrice(product.price, product.currency)}
        </p>
        {product.description && (isFeatured || !compact) && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{product.description}</p>
        )}
      </div>
    </>
  );

  const className = isFeatured
    ? 'space-y-3 rounded-lg border p-3'
    : compact
      ? 'space-y-2 rounded-md border p-2'
      : 'space-y-2 rounded-md border p-3';

  if (href) {
    return (
      <a href={href} className={`block ${className} hover:border-slate-400`}>
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
}
