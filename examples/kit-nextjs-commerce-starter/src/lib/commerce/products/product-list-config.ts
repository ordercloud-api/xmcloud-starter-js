import type { CommerceProductFacet, CommerceProductFilters } from "./types";

export type PaginationStyle = "standard" | "infinite" | "none";
export type ProductSortOption = {
  label: string;
  value: string;
  sortBy?: string[];
};

export type ParsedProductSortOptions = {
  options: ProductSortOption[];
  errors: string[];
};

const SORT_EXPRESSION = /^!?[A-Za-z0-9_.]+$/;

const normalizeParameterName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

export const getProductListParam = (
  params: Record<string, unknown>,
  label: string,
): unknown => {
  if (params[label] !== undefined) return params[label];
  const normalizedLabel = normalizeParameterName(label);
  return Object.entries(params).find(
    ([name]) => normalizeParameterName(name) === normalizedLabel,
  )?.[1];
};

export const parseProductSortOptions = (
  value: unknown,
): ParsedProductSortOptions => {
  if (typeof value !== "string" || !value.trim()) {
    return { options: [], errors: [] };
  }

  const options: ProductSortOption[] = [];
  const errors: string[] = [];
  const labels = new Set<string>();
  const values = new Set<string>();

  for (const [index, sourceLine] of value.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      errors.push(`Line ${index + 1} must use Display label=Sort expression.`);
      continue;
    }

    const label = line.slice(0, separatorIndex).trim();
    const sortBy = line
      .slice(separatorIndex + 1)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!label) {
      errors.push(`Line ${index + 1} needs a display label.`);
      continue;
    }
    if (sortBy.some((entry) => !SORT_EXPRESSION.test(entry))) {
      errors.push(`Line ${index + 1} has an invalid sort expression.`);
      continue;
    }

    const normalizedLabel = label.toLowerCase();
    const optionValue = sortBy.join(",");
    if (labels.has(normalizedLabel)) {
      errors.push(`Line ${index + 1} repeats the display label "${label}".`);
      continue;
    }
    if (values.has(optionValue)) {
      errors.push(
        `Line ${index + 1} repeats the sort expression "${optionValue}".`,
      );
      continue;
    }

    labels.add(normalizedLabel);
    values.add(optionValue);
    options.push({
      label,
      value: optionValue,
      sortBy: sortBy.length ? sortBy : undefined,
    });
  }

  return {
    options,
    errors,
  };
};

export type ProductListConfig = {
  showFacets: boolean;
  showSearchBar: boolean;
  showSort: boolean;
  sortOptions: ProductSortOption[];
  searchPlaceholder: string;
  paginationStyle: PaginationStyle;
  pageSize: number;
  maxProductsPerRow: number;
};

export const DEFAULT_PRODUCT_LIST_PAGE_SIZE = 12;
export const MIN_PRODUCT_LIST_PAGE_SIZE = 4;
export const MAX_PRODUCT_LIST_PAGE_SIZE = 48;
export const DEFAULT_MAX_PRODUCTS_PER_ROW = 3;
export const MIN_PRODUCTS_PER_ROW = 2;
export const MAX_PRODUCTS_PER_ROW = 6;

export const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "checked"].includes(normalized)) return true;
  if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  return fallback;
};

export const normalizePaginationStyle = (value: unknown): PaginationStyle => {
  if (typeof value !== "string") return "standard";
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  if (normalized === "infinite" || normalized === "infinitescroll")
    return "infinite";
  if (normalized === "none") return "none";
  return "standard";
};

export const normalizeProductListPageSize = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_PRODUCT_LIST_PAGE_SIZE;
  return Math.min(
    MAX_PRODUCT_LIST_PAGE_SIZE,
    Math.max(MIN_PRODUCT_LIST_PAGE_SIZE, Math.trunc(parsed)),
  );
};

export const normalizeSearchPlaceholder = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value.trim() : "Search products";

export const normalizeOptionalText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const normalizeMaxProductsPerRow = (value: unknown): number => {
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isInteger(parsed)) return DEFAULT_MAX_PRODUCTS_PER_ROW;
  return Math.min(
    MAX_PRODUCTS_PER_ROW,
    Math.max(MIN_PRODUCTS_PER_ROW, parsed),
  );
};

export type ParsedProductFilters = {
  filters?: CommerceProductFilters;
  errors: string[];
};

const SAFE_FILTER_KEY = /^[A-Za-z0-9_.|]+$/;

export const parseProductFilters = (value: unknown): ParsedProductFilters => {
  if (typeof value !== "string" || !value.trim()) return { errors: [] };

  const filters: CommerceProductFilters = {};
  const errors: string[] = [];
  for (const [index, sourceLine] of value.split(/\r?\n/).entries()) {
    const line = sourceLine.trim();
    if (!line) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      errors.push(`Line ${index + 1} must use Field=Value.`);
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const filterValue = line.slice(separatorIndex + 1).trim();
    if (!SAFE_FILTER_KEY.test(key)) {
      errors.push(`Line ${index + 1} has an invalid field path.`);
      continue;
    }

    const current = filters[key];
    if (current === undefined) filters[key] = filterValue;
    else if (Array.isArray(current)) filters[key] = [...current, filterValue];
    else filters[key] = [String(current), filterValue];
  }

  return {
    filters: Object.keys(filters).length ? filters : undefined,
    errors,
  };
};

const toFilterKey = (xpPath: string): string =>
  xpPath.toLowerCase().startsWith("xp.") ? xpPath : `xp.${xpPath}`;

const getFacetPath = (filterKey: string): string =>
  filterKey.toLowerCase().startsWith("xp.") ? filterKey.slice(3) : filterKey;

const getEditableFacetValues = (value: unknown): string[] | undefined => {
  if (typeof value !== "string") return undefined;
  const values = value.split("|").map((item) => item.trim());
  if (
    values.some(
      (item) => !item || item.includes("*") || /^[!<>]/.test(item),
    )
  ) {
    return undefined;
  }
  return values;
};

export const splitProductFilters = (
  productFilters: CommerceProductFilters | undefined,
  facets: CommerceProductFacet[],
): {
  hiddenFilters?: CommerceProductFilters;
  editableFacetDefaults: Record<string, string[]>;
} => {
  const hiddenFilters: CommerceProductFilters = {};
  const editableFacetDefaults: Record<string, string[]> = {};
  const facetPaths = new Map(
    facets.map((facet) => [facet.xpPath.toLowerCase(), facet.xpPath]),
  );

  for (const [key, value] of Object.entries(productFilters ?? {})) {
    const facetPath = facetPaths.get(getFacetPath(key).toLowerCase());
    const values = facetPath ? getEditableFacetValues(value) : undefined;
    if (facetPath && values) editableFacetDefaults[facetPath] = values;
    else hiddenFilters[key] = value;
  }

  return {
    hiddenFilters: Object.keys(hiddenFilters).length
      ? hiddenFilters
      : undefined,
    editableFacetDefaults,
  };
};

const combineFilterValues = (
  left: CommerceProductFilters[string],
  right: CommerceProductFilters[string],
): CommerceProductFilters[string] => {
  const values = [
    ...(Array.isArray(left) ? left : [left]),
    ...(Array.isArray(right) ? right : [right]),
  ].filter((item): item is string | number | boolean => item !== undefined);
  return values.length === 1 ? values[0] : values.map(String);
};

export const mergeProductListFilters = (
  hiddenFilters: CommerceProductFilters | undefined,
  selectedFacetFilters: CommerceProductFilters | undefined,
): CommerceProductFilters | undefined => {
  const merged: CommerceProductFilters = { ...hiddenFilters };
  for (const [key, value] of Object.entries(selectedFacetFilters ?? {})) {
    merged[key] =
      merged[key] === undefined
        ? value
        : combineFilterValues(merged[key], value);
  }
  return Object.keys(merged).length ? merged : undefined;
};

export const toProductListFilters = (
  selectedFacets: Record<string, string[]>,
): CommerceProductFilters | undefined => {
  const entries = Object.entries(selectedFacets).filter(
    ([, values]) => values.length > 0,
  );
  if (!entries.length) return undefined;

  return Object.fromEntries(
    entries.map(([xpPath, values]) => [toFilterKey(xpPath), values.join("|")]),
  );
};

export const mergeProductFacets = (
  existing: CommerceProductFacet[],
  incoming: CommerceProductFacet[],
): CommerceProductFacet[] => {
  const incomingByPath = new Map(
    incoming.map((facet) => [facet.xpPath, facet]),
  );
  const merged = existing.map((facet) => {
    const nextFacet = incomingByPath.get(facet.xpPath);
    if (!nextFacet) return facet;
    incomingByPath.delete(facet.xpPath);

    const nextValues = new Map(
      nextFacet.values.map((value) => [value.value, value]),
    );
    const values = facet.values.map((value) => {
      const nextValue = nextValues.get(value.value);
      nextValues.delete(value.value);
      return nextValue ?? value;
    });

    return {
      ...nextFacet,
      values: [...values, ...nextValues.values()],
    };
  });

  return [...merged, ...incomingByPath.values()];
};

export const getPageNumbers = (
  currentPage: number,
  totalPages: number,
): number[] => {
  if (totalPages <= 1) return totalPages === 1 ? [1] : [];
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) pages.add(page);
  }
  return [...pages].sort((left, right) => left - right);
};
