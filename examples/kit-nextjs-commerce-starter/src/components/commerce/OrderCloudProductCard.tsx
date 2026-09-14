'use client';

import type { CommerceProduct } from '@/lib/commerce/products/types';

type OrderCloudProductCardProps = {
  product: CommerceProduct;
  compact?: boolean;
  href?: string;
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
}: OrderCloudProductCardProps) {
  const content = (
    <>
      {product.imageUrl && (
        <img
          src={product.imageUrl}
          alt={product.name}
          className={compact ? 'h-24 w-full rounded object-cover' : 'h-32 w-full rounded object-cover'}
          loading="lazy"
        />
      )}

      <div className="space-y-1">
        <p className="font-medium leading-tight">{product.name}</p>
        <p className="text-muted-foreground text-xs">ID: {product.id}</p>
        {(product.brand || product.category) && (
          <p className="text-muted-foreground text-xs">
            {[product.brand, product.category].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-emerald-700 text-xs font-semibold">{formatPrice(product.price, product.currency)}</p>
        {product.description && !compact && (
          <p className="text-muted-foreground line-clamp-3 text-xs">{product.description}</p>
        )}
      </div>
    </>
  );

  const className = 'space-y-2 rounded-md border p-3';

  if (href) {
    return (
      <a href={href} className={`block ${className} hover:border-slate-400`}>
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
}
