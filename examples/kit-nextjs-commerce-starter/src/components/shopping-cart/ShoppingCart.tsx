'use client';

import type React from 'react';
import ShoppingCart from '@/components/commerce/ShoppingCart';
import type { ShoppingCartProps } from './shopping-cart.props';

export const Default: React.FC<ShoppingCartProps> = ({ params, page }) => {
  const isAuthoring = Boolean(page.mode.isEditing || page.mode.isDesignLibrary);

  return (
    <section
      className={`component shopping-cart px-4 py-10 ${params.styles ?? ''}`}
      id={params.RenderingIdentifier}
      data-component="ShoppingCart"
      data-class-change
    >
      {isAuthoring && (
        <p className="text-muted-foreground mb-4 text-xs">
          Shopping cart renders live OrderCloud line items. Empty until a shopper adds a product.
        </p>
      )}
      <ShoppingCart />
    </section>
  );
};
