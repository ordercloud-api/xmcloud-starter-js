import type { ComponentProps } from "@/lib/component-props";

export type ProductListParams = {
  "Show Filters"?: unknown;
  "Show Search Bar"?: unknown;
  "Show Sort"?: unknown;
  "Sort Options"?: unknown;
  "Search Placeholder"?: unknown;
  "Pagination Style"?: unknown;
  "Results Per Page"?: unknown;
  "Maximum Products Per Row"?: unknown;
  "Catalog ID"?: unknown;
  "Category ID"?: unknown;
  "Initial Search Term"?: unknown;
  "Product Filters"?: unknown;
  "Product Detail Page Path"?: unknown;
  [key: string]: unknown;
};

export type ProductListProps = ComponentProps & {
  params: ComponentProps["params"] & ProductListParams;
};
