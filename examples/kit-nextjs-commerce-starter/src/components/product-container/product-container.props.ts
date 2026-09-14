import type { ComponentProps } from "@/lib/component-props";
import type { ProductReference } from "@/lib/commerce/products/reference";

type ProductContainerField<T> =
  | T
  | {
      value?: T;
      jsonValue?: {
        value?: T;
      };
    };

type ProductReferenceValue = string | ProductReference;

export type ProductContainerDatasource = {
  productSource?: ProductContainerField<string>;
  ProductSource?: ProductContainerField<string>;
  "Product Source"?: ProductContainerField<string>;
  productId?: ProductContainerField<ProductReferenceValue>;
  ProductId?: ProductContainerField<ProductReferenceValue>;
  "Product ID"?: ProductContainerField<ProductReferenceValue>;
  previewProductId?: ProductContainerField<ProductReferenceValue>;
  PreviewProductId?: ProductContainerField<ProductReferenceValue>;
  "Preview Product ID"?: ProductContainerField<ProductReferenceValue>;
};

export type ProductContainerFields = ProductContainerDatasource & {
  data?: {
    datasource?: ProductContainerDatasource;
  };
};

export type ProductContainerProps = ComponentProps & {
  params: ComponentProps["params"] & {
    DynamicPlaceholderId?: string;
  };
  fields?: ProductContainerFields;
};
