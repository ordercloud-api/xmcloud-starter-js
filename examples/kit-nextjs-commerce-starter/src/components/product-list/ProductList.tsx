import type React from "react";
import OrderCloudProductList from "@/components/commerce/OrderCloudProductList";
import {
  asBoolean,
  getProductListParam,
  normalizeMaxProductsPerRow,
  normalizeOptionalText,
  normalizePaginationStyle,
  normalizeProductListPageSize,
  normalizeSearchPlaceholder,
  parseProductSortOptions,
  parseProductFilters,
} from "@/lib/commerce/products/product-list-config";
import type { ProductListProps } from "./product-list.props";

export const Default: React.FC<ProductListProps> = ({ page, params }) => {
  const getParam = (label: string) => getProductListParam(params, label);
  const showFacets = asBoolean(getParam("Show Filters"));
  const showSearchBar = asBoolean(getParam("Show Search Bar"));
  const showSort = asBoolean(getParam("Show Sort"), true);
  const parsedSortOptions = parseProductSortOptions(getParam("Sort Options"));
  const searchPlaceholder = normalizeSearchPlaceholder(
    getParam("Search Placeholder"),
  );
  const paginationStyle = normalizePaginationStyle(
    getParam("Pagination Style"),
  );
  const pageSize = normalizeProductListPageSize(getParam("Results Per Page"));
  const maxProductsPerRow = normalizeMaxProductsPerRow(
    getParam("Maximum Products Per Row"),
  );
  const catalogId = normalizeOptionalText(getParam("Catalog ID"));
  const categoryId = normalizeOptionalText(getParam("Category ID"));
  const initialSearchTerm = normalizeOptionalText(
    getParam("Initial Search Term"),
  );
  const parsedProductFilters = parseProductFilters(
    getParam("Product Filters"),
  );
  const detailPageHref = normalizeOptionalText(
    getParam("Product Detail Page Path"),
  );
  const isAuthoring = Boolean(page.mode.isEditing || page.mode.isDesignLibrary);

  return (
    <OrderCloudProductList
      showFacets={showFacets}
      showSearchBar={showSearchBar}
      showSort={showSort}
      sortOptions={parsedSortOptions.options}
      sortOptionErrors={parsedSortOptions.errors}
      searchPlaceholder={searchPlaceholder}
      paginationStyle={paginationStyle}
      pageSize={pageSize}
      maxProductsPerRow={maxProductsPerRow}
      catalogId={catalogId}
      categoryId={categoryId}
      initialSearchTerm={initialSearchTerm}
      productFilters={parsedProductFilters.filters}
      productFilterErrors={parsedProductFilters.errors}
      detailPageHref={detailPageHref}
      isAuthoring={isAuthoring}
      renderingIdentifier={params.RenderingIdentifier}
      styles={params.styles}
    />
  );
};
