import type { ComponentProps } from "@/lib/component-props";

type ProductContainerField<T> =
  | T
  | {
      value?: T;
      jsonValue?: {
        value?: T;
      };
    };

export type ProductContainerDatasource = {
  productSource?: ProductContainerField<string>;
  ProductSource?: ProductContainerField<string>;
  "Product Source"?: ProductContainerField<string>;
  productId?: ProductContainerField<string>;
  ProductId?: ProductContainerField<string>;
  "Product ID"?: ProductContainerField<string>;
  previewProductId?: ProductContainerField<string>;
  PreviewProductId?: ProductContainerField<string>;
  "Preview Product ID"?: ProductContainerField<string>;
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
