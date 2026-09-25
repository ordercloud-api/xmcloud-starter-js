"use client";

import { useState, type ReactNode } from "react";
import { ProductDataProvider } from "@/contexts/ProductDataContext";
import type {
  ProductReference,
  ProductSource,
} from "@/lib/commerce/products/reference";
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

  const updateProduct = (ids: string[]) => {
    const reference = ids[0] ? { id: ids[0] } : undefined;
    if (source === "last-url-segment") {
      setPreviewProduct(reference);
    } else {
      setSelectedProduct(reference);
    }
  };

  return (
    <ProductDataProvider
      source={source}
      selectedProduct={selectedProduct}
      previewProduct={previewProduct}
      isAuthoring={isAuthoring}
    >
      {isAuthoring && authoringField && (
        <AuthoringProductField {...authoringField} onSaved={updateProduct} />
      )}
      {children}
    </ProductDataProvider>
  );
}
