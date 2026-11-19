"use client";

import { useState, type ReactNode } from "react";
import { ProductProvider } from "@sitecore-content-sdk/nextjs/commerce";
import { useRoutePath } from "@/contexts/RoutePathContext";
import { selectCommerceProduct } from "@/lib/commerce/products/mapper";
import type {
  ProductReference,
  ProductSource,
} from "@/lib/commerce/products/reference";
import { resolveProductId } from "@/lib/commerce/products/reference";
import { validateProductSpec } from "@/lib/commerce/products/specs";
import AuthoringProductField, {
  type AuthoringProductFieldConfig,
} from "./AuthoringProductField";

type ProductContainerContentProps = {
  authoringField?: AuthoringProductFieldConfig;
  children: ReactNode;
  isAuthoring: boolean;
  previewProduct?: ProductReference;
  selectedProduct?: ProductReference;
  source?: ProductSource;
};

export default function ProductContainerContent({
  authoringField,
  children,
  isAuthoring,
  previewProduct: initialPreviewProduct,
  selectedProduct: initialSelectedProduct,
  source,
}: ProductContainerContentProps) {
  const [selectedProduct, setSelectedProduct] = useState(
    initialSelectedProduct,
  );
  const [previewProduct, setPreviewProduct] = useState(initialPreviewProduct);
  const routePath = useRoutePath();
  const productId = resolveProductId({
    source,
    routePath: [...routePath],
    selectedProduct,
    previewProduct,
    isAuthoring,
  });

  const updateProduct = (ids: string[]) => {
    const reference = ids[0] ? { id: ids[0] } : undefined;
    if (source === "last-url-segment") {
      setPreviewProduct(reference);
    } else {
      setSelectedProduct(reference);
    }
  };

  return (
    <ProductProvider
      productId={productId}
      select={selectCommerceProduct}
      validateSpec={validateProductSpec}
    >
      {isAuthoring && authoringField && (
        <AuthoringProductField {...authoringField} onSaved={updateProduct} />
      )}
      {children}
    </ProductProvider>
  );
}
