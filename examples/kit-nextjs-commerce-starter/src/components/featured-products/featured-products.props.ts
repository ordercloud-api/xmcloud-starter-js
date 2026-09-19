import type { ComponentProps } from "@/lib/component-props";
import type { FeaturedProductsDatasource } from "@/lib/commerce/products/featured-products";

export type FeaturedProductsParams = ComponentProps["params"] & {
  "Maximum Products Per Row"?: unknown;
  "Product Detail Page Path"?: unknown;
  [key: string]: unknown;
};

export type FeaturedProductsProps = ComponentProps & {
  fields?: FeaturedProductsDatasource;
  params: FeaturedProductsParams;
};
