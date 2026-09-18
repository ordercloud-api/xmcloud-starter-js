"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import { buildProductDetailHref } from "@/lib/commerce/products/href";
import {
  getPageNumbers,
  mergeProductListFilters,
  mergeProductFacets,
  splitProductFilters,
  toProductListFilters,
  type PaginationStyle,
  type ProductSortOption,
} from "@/lib/commerce/products/product-list-config";
import type {
  CommerceProduct,
  CommerceProductFacet,
  CommerceProductFilters,
  CommerceProductList,
} from "@/lib/commerce/products/types";
import OrderCloudProductCard from "./OrderCloudProductCard";

type OrderCloudProductListProps = {
  showFacets: boolean;
  showSearchBar: boolean;
  showSort: boolean;
  sortOptions: ProductSortOption[];
  sortOptionErrors?: string[];
  searchPlaceholder: string;
  paginationStyle: PaginationStyle;
  pageSize: number;
  maxProductsPerRow: number;
  catalogId?: string;
  categoryId?: string;
  initialSearchTerm?: string;
  productFilters?: CommerceProductFilters;
  productFilterErrors?: string[];
  detailPageHref?: string;
  isAuthoring?: boolean;
  renderingIdentifier?: string;
  styles?: string;
};

type ProductListUrlState = {
  search: string;
  sort: string;
  page: number;
  selectedFacets: Record<string, string[]>;
  explicitFacetPaths: string[];
};

type FacetPanelProps = {
  facets: CommerceProductFacet[];
  selectedFacets: Record<string, string[]>;
  loading: boolean;
  idPrefix: string;
  onToggle: (facet: CommerceProductFacet, value: string) => void;
  onClearAll: () => void;
};

const REQUEST_TIMEOUT_MS = 10_000;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PARAM = "search";
const SORT_PARAM = "sort";
const PAGE_PARAM = "page";
const FACET_PARAM_PREFIX = "facet.";

const mergeUniqueProducts = (
  existing: CommerceProduct[],
  incoming: CommerceProduct[],
): CommerceProduct[] => {
  const products = new Map(existing.map((product) => [product.id, product]));
  for (const product of incoming) products.set(product.id, product);
  return [...products.values()];
};

const getSelectedFacetCount = (
  selectedFacets: Record<string, string[]>,
): number =>
  Object.values(selectedFacets).reduce(
    (total, values) => total + values.length,
    0,
  );

const readUrlState = ({
  initialSearchTerm,
  sortOptions,
  showFacets,
  showSearchBar,
  showSort,
}: {
  initialSearchTerm?: string;
  sortOptions: ProductSortOption[];
  showFacets: boolean;
  showSearchBar: boolean;
  showSort: boolean;
}): ProductListUrlState => {
  const params = new URLSearchParams(window.location.search);
  const selectedFacets: Record<string, string[]> = {};
  const explicitFacetPaths: string[] = [];

  for (const key of new Set(params.keys())) {
    if (!showFacets || !key.startsWith(FACET_PARAM_PREFIX)) continue;
    const xpPath = key.slice(FACET_PARAM_PREFIX.length);
    const values = params.getAll(key).filter(Boolean);
    if (xpPath) explicitFacetPaths.push(xpPath);
    if (xpPath && values.length) selectedFacets[xpPath] = values;
  }

  const parsedPage = Number.parseInt(params.get(PAGE_PARAM) ?? "", 10);
  const initialSortValue = sortOptions[0]?.value ?? "";
  const requestedSort = params.get(SORT_PARAM) ?? "";
  return {
    search: showSearchBar
      ? params.has(SEARCH_PARAM)
        ? params.get(SEARCH_PARAM)?.trim() ?? ""
        : initialSearchTerm ?? ""
      : initialSearchTerm ?? "",
    sort:
      showSort &&
      params.has(SORT_PARAM) &&
      sortOptions.some((option) => option.value === requestedSort)
        ? requestedSort
        : initialSortValue,
    page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    selectedFacets,
    explicitFacetPaths,
  };
};

const writeUrlState = (
  state: ProductListUrlState,
  paginationStyle: PaginationStyle,
  {
    initialSearchTerm,
    initialSortValue,
    replace = false,
    showFacets,
    showSearchBar,
    showSort,
    defaultFacetPaths,
  }: {
    initialSearchTerm?: string;
    initialSortValue: string;
    replace?: boolean;
    showFacets: boolean;
    showSearchBar: boolean;
    showSort: boolean;
    defaultFacetPaths: string[];
  },
) => {
  const url = new URL(window.location.href);
  url.searchParams.delete(SEARCH_PARAM);
  url.searchParams.delete(SORT_PARAM);
  url.searchParams.delete(PAGE_PARAM);
  for (const key of new Set(url.searchParams.keys())) {
    if (key.startsWith(FACET_PARAM_PREFIX)) url.searchParams.delete(key);
  }

  if (showSearchBar && (state.search || initialSearchTerm)) {
    url.searchParams.set(SEARCH_PARAM, state.search);
  }
  if (showSort && state.sort !== initialSortValue) {
    url.searchParams.set(SORT_PARAM, state.sort);
  }
  if (paginationStyle === "standard" && state.page > 1) {
    url.searchParams.set(PAGE_PARAM, String(state.page));
  }
  if (showFacets) {
    for (const [xpPath, values] of Object.entries(state.selectedFacets)) {
      for (const value of values) {
        url.searchParams.append(`${FACET_PARAM_PREFIX}${xpPath}`, value);
      }
    }
    for (const xpPath of defaultFacetPaths) {
      if (!(state.selectedFacets[xpPath]?.length > 0)) {
        url.searchParams.append(`${FACET_PARAM_PREFIX}${xpPath}`, "");
      }
    }
  }

  window.history[replace ? "replaceState" : "pushState"]({}, "", url);
};

const getProductGridStyle = (maxProductsPerRow: number) => ({
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
  maxWidth: `calc(${maxProductsPerRow} * 18rem + ${maxProductsPerRow - 1} * 1rem)`,
});

function FacetSkeleton() {
  return (
    <div className="space-y-5" aria-hidden="true">
      <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
      {Array.from({ length: 3 }, (_, groupIndex) => (
        <div
          key={`facet-skeleton-${groupIndex}`}
          className="space-y-3 border-t pt-4"
        >
          <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
          {Array.from({ length: groupIndex + 2 }, (_, valueIndex) => (
            <div
              key={`facet-skeleton-${groupIndex}-${valueIndex}`}
              className="flex items-center gap-2"
            >
              <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
              <div className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-5 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FacetPanel({
  facets,
  selectedFacets,
  loading,
  idPrefix,
  onToggle,
  onClearAll,
}: FacetPanelProps) {
  const activeCount = getSelectedFacetCount(selectedFacets);
  if (loading && facets.length === 0) return <FacetSkeleton />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Filter products</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-sm font-medium underline"
          >
            Clear all
          </button>
        )}
      </div>
      {facets.map((facet, facetIndex) => (
        <fieldset key={facet.xpPath} className="space-y-2 border-t pt-4">
          <legend className="font-medium">{facet.name}</legend>
          {facet.values.map((item, valueIndex) => {
            const id = `${idPrefix}-facet-${facetIndex}-${valueIndex}`;
            return (
              <label
                key={item.value}
                htmlFor={id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  id={id}
                  type="checkbox"
                  checked={(selectedFacets[facet.xpPath] ?? []).includes(
                    item.value,
                  )}
                  onChange={() => onToggle(facet, item.value)}
                />
                <span className="flex-1">{item.value}</span>
                <span className="text-slate-500">{item.count}</span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}

export default function OrderCloudProductList({
  showFacets,
  showSearchBar,
  showSort,
  sortOptions,
  sortOptionErrors = [],
  searchPlaceholder,
  paginationStyle,
  pageSize,
  maxProductsPerRow,
  catalogId,
  categoryId,
  initialSearchTerm,
  productFilters,
  productFilterErrors = [],
  detailPageHref,
  isAuthoring = false,
  renderingIdentifier,
  styles,
}: OrderCloudProductListProps) {
  const { products: productsService, status } = useOrderCloud();
  const resolvedDetailPageHref = detailPageHref?.trim() || undefined;
  const idPrefix = renderingIdentifier ?? "product-list";
  const initialSortValue = sortOptions[0]?.value ?? "";
  const [urlReady, setUrlReady] = useState(isAuthoring);
  const [searchInput, setSearchInput] = useState(initialSearchTerm ?? "");
  const [search, setSearch] = useState(initialSearchTerm ?? "");
  const [sort, setSort] = useState(initialSortValue);
  const [selectedFacets, setSelectedFacets] = useState<
    Record<string, string[]>
  >({});
  const [explicitFacetPaths, setExplicitFacetPaths] = useState<string[]>([]);
  const [facetDefinitions, setFacetDefinitions] = useState<
    CommerceProductFacet[]
  >([]);
  const [facetDiscoveryReady, setFacetDiscoveryReady] = useState(
    !showFacets || !productFilters,
  );
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [meta, setMeta] = useState<CommerceProductList["meta"]>();
  const [availableFacets, setAvailableFacets] = useState<
    CommerceProductFacet[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMorePendingRef = useRef(false);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusResultsAfterLoad = useRef(false);
  const productFiltersKey = JSON.stringify(productFilters ?? {});
  const hasConfigurationError = productFilterErrors.length > 0;

  useEffect(() => {
    if (isAuthoring) setSort(initialSortValue);
  }, [initialSortValue, isAuthoring]);

  useEffect(() => {
    if (isAuthoring) return;

    const applyUrlState = () => {
      const state = readUrlState({
        initialSearchTerm,
        sortOptions,
        showFacets,
        showSearchBar,
        showSort,
      });
      setSearchInput(state.search);
      setSearch(state.search);
      setSort(state.sort);
      setSelectedFacets(showFacets ? state.selectedFacets : {});
      setExplicitFacetPaths(showFacets ? state.explicitFacetPaths : []);
      setPage(paginationStyle === "standard" ? state.page : 1);
      setProducts([]);
      setLoading(true);
      setUrlReady(true);
    };

    applyUrlState();
    window.addEventListener("popstate", applyUrlState);
    return () => window.removeEventListener("popstate", applyUrlState);
  }, [
    initialSearchTerm,
    initialSortValue,
    isAuthoring,
    paginationStyle,
    showFacets,
    showSearchBar,
    showSort,
    sortOptions,
  ]);

  useEffect(() => {
    if (!showFacets || !productFilters) {
      setFacetDefinitions([]);
      setFacetDiscoveryReady(true);
      return;
    }
    if (status !== "authenticated" || hasConfigurationError) {
      setFacetDiscoveryReady(status !== "loading");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setFacetDiscoveryReady(false);

    void productsService
      .list({
        signal: controller.signal,
        catalogId,
        categoryId,
        page: 1,
        pageSize: 1,
      })
      .then((payload) => {
        if (!active) return;
        setFacetDefinitions(payload.meta?.facets ?? []);
      })
      .catch((discoveryError) => {
        if (!active || controller.signal.aborted) return;
        console.error("Product facet discovery failed", discoveryError);
        setFacetDefinitions([]);
      })
      .finally(() => {
        if (active) setFacetDiscoveryReady(true);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    catalogId,
    categoryId,
    hasConfigurationError,
    productFilterErrors.length,
    productFilters,
    productFiltersKey,
    productsService,
    showFacets,
    status,
  ]);

  const { hiddenFilters, editableFacetDefaults } = useMemo(
    () => splitProductFilters(productFilters, facetDefinitions),
    [facetDefinitions, productFilters, productFiltersKey],
  );
  const editableFacetDefaultsKey = JSON.stringify(editableFacetDefaults);
  const defaultFacetPaths = useMemo(
    () => Object.keys(editableFacetDefaults),
    [editableFacetDefaultsKey],
  );

  useEffect(() => {
    if (!facetDiscoveryReady || defaultFacetPaths.length === 0) return;

    setSelectedFacets((current) => {
      const next = { ...current };
      let changed = false;
      for (const [xpPath, values] of Object.entries(editableFacetDefaults)) {
        if (!explicitFacetPaths.includes(xpPath) && next[xpPath] === undefined) {
          next[xpPath] = values;
          changed = true;
        }
      }

      if (!changed) return current;

      if (!isAuthoring && urlReady) {
        writeUrlState(
          {
            search,
            sort,
            page,
            selectedFacets: next,
            explicitFacetPaths,
          },
          paginationStyle,
          {
            defaultFacetPaths,
            initialSearchTerm,
            initialSortValue,
            replace: true,
            showFacets,
            showSearchBar,
            showSort,
          },
        );
      }
      return next;
    });
  }, [
    editableFacetDefaults,
    editableFacetDefaultsKey,
    explicitFacetPaths,
    facetDiscoveryReady,
    initialSearchTerm,
    initialSortValue,
    isAuthoring,
    page,
    paginationStyle,
    search,
    showFacets,
    showSearchBar,
    showSort,
    sort,
    urlReady,
  ]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileFiltersOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    if (!showSearchBar) return;
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) return;
      setPage(1);
      setProducts([]);
      setLoading(true);
      setSearch(nextSearch);
      if (!isAuthoring && urlReady) {
        writeUrlState(
          {
            search: nextSearch,
            sort,
            page: 1,
            selectedFacets,
            explicitFacetPaths,
          },
          paginationStyle,
          {
            defaultFacetPaths,
            initialSearchTerm,
            initialSortValue,
            showFacets,
            showSearchBar,
            showSort,
          },
        );
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [
    defaultFacetPaths,
    explicitFacetPaths,
    initialSearchTerm,
    initialSortValue,
    isAuthoring,
    paginationStyle,
    search,
    searchInput,
    selectedFacets,
    showFacets,
    showSearchBar,
    showSort,
    sort,
    urlReady,
  ]);

  const filters = useMemo<CommerceProductFilters | undefined>(() => {
    const selectedFacetFilters = showFacets
      ? toProductListFilters(selectedFacets)
      : undefined;
    return mergeProductListFilters(hiddenFilters, selectedFacetFilters);
  }, [hiddenFilters, selectedFacets, showFacets]);
  const filterKey = JSON.stringify(filters ?? {});
  const sortBy = useMemo(
    () => sortOptions.find((option) => option.value === sort)?.sortBy,
    [sort, sortOptions],
  );

  useEffect(() => {
    if (!urlReady || !facetDiscoveryReady) return;
    if (hasConfigurationError) {
      loadMorePendingRef.current = false;
      setProducts([]);
      setMeta(undefined);
      setAvailableFacets([]);
      setError(true);
      setLoading(false);
      return;
    }
    if (status !== "authenticated") {
      loadMorePendingRef.current = false;
      setProducts([]);
      setMeta(undefined);
      setAvailableFacets([]);
      setError(status === "error");
      setLoading(status === "loading");
      return;
    }

    const controller = new AbortController();
    let active = true;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const loadProducts = async () => {
      setLoading(true);
      setError(false);
      try {
        const payload = await productsService.list({
          signal: controller.signal,
          catalogId,
          categoryId,
          search,
          sortBy,
          filters,
          page: paginationStyle === "none" ? 1 : page,
          pageSize,
        });
        if (!active) return;
        setProducts((current) =>
          paginationStyle === "infinite" && page > 1
            ? mergeUniqueProducts(current, payload.items)
            : payload.items,
        );
        setMeta(payload.meta);
        setAvailableFacets((current) =>
          mergeProductFacets(current, payload.meta?.facets ?? []),
        );
        setFacetDefinitions((current) =>
          current.length
            ? current
            : mergeProductFacets(current, payload.meta?.facets ?? []),
        );
      } catch (loadError) {
        if (!active || (controller.signal.aborted && !timedOut)) return;
        console.error("Product list request failed", loadError);
        setProducts([]);
        setMeta(undefined);
        setError(true);
      } finally {
        window.clearTimeout(timeoutId);
        if (active) {
          loadMorePendingRef.current = false;
          setLoading(false);
        }
      }
    };

    void loadProducts();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    catalogId,
    categoryId,
    facetDiscoveryReady,
    filterKey,
    filters,
    hasConfigurationError,
    page,
    pageSize,
    paginationStyle,
    productsService,
    search,
    sortBy,
    status,
    urlReady,
  ]);

  const totalPages = meta?.totalPages ?? 0;
  const canLoadMore = paginationStyle === "infinite" && page < totalPages;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (
      !sentinel ||
      !canLoadMore ||
      loading ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || loadMorePendingRef.current) return;
        loadMorePendingRef.current = true;
        setPage((current) => current + 1);
      },
      { rootMargin: "0px 0px 600px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoadMore, loading]);

  useEffect(() => {
    if (!loading && focusResultsAfterLoad.current) {
      focusResultsAfterLoad.current = false;
      resultsHeadingRef.current?.focus();
      resultsHeadingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [loading]);

  const syncUrl = (state: Partial<ProductListUrlState>) => {
    if (isAuthoring || !urlReady) return;
    writeUrlState(
      {
        search,
        sort,
        page,
        selectedFacets,
        explicitFacetPaths,
        ...state,
      },
      paginationStyle,
      {
        defaultFacetPaths,
        initialSearchTerm,
        initialSortValue,
        showFacets,
        showSearchBar,
        showSort,
      },
    );
  };

  const toggleFacet = (facet: CommerceProductFacet, value: string) => {
    const selected = selectedFacets[facet.xpPath] ?? [];
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    const updated = { ...selectedFacets };
    if (next.length) updated[facet.xpPath] = next;
    else delete updated[facet.xpPath];

    setPage(1);
    setProducts([]);
    setLoading(true);
    setSelectedFacets(updated);
    const nextExplicitFacetPaths = explicitFacetPaths.includes(facet.xpPath)
      ? explicitFacetPaths
      : [...explicitFacetPaths, facet.xpPath];
    setExplicitFacetPaths(nextExplicitFacetPaths);
    syncUrl({
      page: 1,
      selectedFacets: updated,
      explicitFacetPaths: nextExplicitFacetPaths,
    });
  };

  const clearAllFacets = () => {
    setPage(1);
    setProducts([]);
    setLoading(true);
    setSelectedFacets({});
    const nextExplicitFacetPaths = [
      ...new Set([...explicitFacetPaths, ...defaultFacetPaths]),
    ];
    setExplicitFacetPaths(nextExplicitFacetPaths);
    syncUrl({
      page: 1,
      selectedFacets: {},
      explicitFacetPaths: nextExplicitFacetPaths,
    });
  };

  const changeSort = (nextSort: string) => {
    setPage(1);
    setProducts([]);
    setLoading(true);
    setSort(nextSort);
    syncUrl({ page: 1, sort: nextSort });
  };

  const changePage = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
    focusResultsAfterLoad.current = true;
    setPage(nextPage);
    syncUrl({ page: nextPage });
  };

  const totalCount = meta?.totalCount ?? products.length;
  const firstResult = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, totalCount);
  const pageNumbers = getPageNumbers(page, totalPages);
  const facets = showFacets ? availableFacets : [];
  const activeFacetCount = getSelectedFacetCount(selectedFacets);
  const showFacetSkeleton =
    showFacets && loading && products.length === 0 && facets.length === 0;
  const showFacetColumn =
    showFacets && (facets.length > 0 || showFacetSkeleton);
  const facetNames = new Map(facets.map((facet) => [facet.xpPath, facet.name]));

  return (
    <section
      className={`component product-list space-y-6 ${styles ?? ""}`}
      id={renderingIdentifier}
      data-component="ProductList"
    >
      {showSearchBar && (
        <div className="max-w-xl">
          <label htmlFor={`${idPrefix}-search`} className="sr-only">
            Search products
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              id={`${idPrefix}-search`}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-10 text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>
      )}

      {isAuthoring && !resolvedDetailPageHref && (
        <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          Configure Product Detail Page Path so product cards can link to
          product details.
        </p>
      )}
      {isAuthoring && productFilterErrors.length > 0 && (
        <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          <p className="font-medium">Product Filters needs attention.</p>
          <ul className="mt-1 list-disc pl-5">
            {productFilterErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {isAuthoring && sortOptionErrors.length > 0 && (
        <div className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          <p className="font-medium">Sort Options needs attention.</p>
          <ul className="mt-1 list-disc pl-5">
            {sortOptionErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {isAuthoring && showSort && sortOptions.length === 0 && (
        <p className="rounded border border-dashed border-amber-500 p-3 text-sm text-amber-700">
          Show Sort is enabled, but no valid Sort Options are configured.
        </p>
      )}

      <div
        className={
          showFacetColumn ? "grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]" : ""
        }
      >
        {showFacetColumn && (
          <aside
            aria-label="Product facets"
            className="hidden space-y-5 lg:block"
          >
            <FacetPanel
              facets={facets}
              selectedFacets={selectedFacets}
              loading={showFacetSkeleton}
              idPrefix={`${idPrefix}-desktop`}
              onToggle={toggleFacet}
              onClearAll={clearAllFacets}
            />
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          <h2 ref={resultsHeadingRef} tabIndex={-1} className="sr-only">
            Product results
          </h2>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {showFacets && (
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium lg:hidden"
                  aria-expanded={mobileFiltersOpen}
                >
                  Filters{activeFacetCount ? ` (${activeFacetCount})` : ""}
                </button>
              )}
              {paginationStyle === "standard" &&
                !loading &&
                !error &&
                totalCount > 0 && (
                  <p className="text-sm text-slate-600">
                    Showing {firstResult}–{lastResult} of {totalCount} products
                  </p>
                )}
            </div>
            {showSort && sortOptions.length > 0 && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <span>Sort by</span>
                <select
                  value={sort}
                  onChange={(event) => changeSort(event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {showFacets && activeFacetCount > 0 && (
            <div
              className="flex flex-wrap items-center gap-2"
              aria-label="Active filters"
            >
              {Object.entries(selectedFacets).flatMap(([xpPath, values]) =>
                values.map((value) => (
                  <button
                    key={`${xpPath}-${value}`}
                    type="button"
                    onClick={() =>
                      toggleFacet(
                        {
                          xpPath,
                          name: facetNames.get(xpPath) ?? xpPath,
                          values: [],
                        },
                        value,
                      )
                    }
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                    aria-label={`Remove ${facetNames.get(xpPath) ?? xpPath}: ${value} filter`}
                  >
                    {facetNames.get(xpPath) ?? xpPath}: {value}{" "}
                    <span aria-hidden="true">×</span>
                  </button>
                )),
              )}
              <button
                type="button"
                onClick={clearAllFacets}
                className="px-1 text-sm font-medium underline"
              >
                Clear all
              </button>
            </div>
          )}

          {loading && products.length === 0 && (
            <div
              className="mx-auto grid w-full gap-4"
              style={getProductGridStyle(maxProductsPerRow)}
              aria-live="polite"
            >
              {Array.from({ length: Math.min(pageSize, 12) }, (_, index) => (
                <div
                  key={`product-skeleton-${index}`}
                  className="w-full max-w-72 justify-self-center space-y-2"
                >
                  <div className="aspect-square animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
              <span className="sr-only">Loading products…</span>
            </div>
          )}

          {!loading && error && (
            <p
              role="alert"
              className="rounded border border-slate-200 bg-slate-50 p-4 text-sm"
            >
              Products are temporarily unavailable.
            </p>
          )}

          {!loading && !error && products.length === 0 && (
            <p className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
              No products match your search and filters.
            </p>
          )}

          {products.length > 0 && (
            <div
              className="mx-auto grid w-full gap-4"
              style={getProductGridStyle(maxProductsPerRow)}
            >
              {products.map((product) => (
                <div
                  key={product.id}
                  className="w-full max-w-72 justify-self-center"
                >
                  <OrderCloudProductCard
                    product={product}
                    compact
                    href={buildProductDetailHref(
                      resolvedDetailPageHref,
                      product.id,
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {paginationStyle === "infinite" && products.length > 0 && (
            <div
              ref={sentinelRef}
              className="py-3 text-center text-sm text-slate-500"
              aria-live="polite"
            >
              {loading
                ? "Loading more products…"
                : canLoadMore
                  ? ""
                  : "All products loaded"}
            </div>
          )}

          {paginationStyle === "standard" && totalPages > 1 && !error && (
            <nav
              aria-label="Product pagination"
              className="flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() => changePage(page - 1)}
                disabled={page <= 1 || loading}
                className="rounded border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              {pageNumbers.map((pageNumber, index) => (
                <span key={pageNumber} className="contents">
                  {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                    <span aria-hidden="true" className="px-1">
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => changePage(pageNumber)}
                    disabled={loading}
                    aria-current={pageNumber === page ? "page" : undefined}
                    className="min-w-10 rounded border px-3 py-2 text-sm font-medium aria-[current=page]:bg-slate-900 aria-[current=page]:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pageNumber}
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => changePage(page + 1)}
                disabled={page >= totalPages || loading}
                className="rounded border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {mobileFiltersOpen && showFacets && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="absolute inset-y-0 right-0 w-[min(90vw,24rem)] overflow-y-auto bg-white p-5 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium"
              >
                Close
              </button>
            </div>
            <FacetPanel
              facets={facets}
              selectedFacets={selectedFacets}
              loading={showFacetSkeleton}
              idPrefix={`${idPrefix}-mobile`}
              onToggle={toggleFacet}
              onClearAll={clearAllFacets}
            />
          </aside>
        </div>
      )}
    </section>
  );
}
