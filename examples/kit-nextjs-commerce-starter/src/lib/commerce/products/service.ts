import type { ProductsApi } from "@sitecore-content-sdk/commerce";
import { toCommerceProduct } from "./mapper";
import type {
  CommerceProduct,
  CommerceProductList,
  ListProductsOptions,
  ProductRequestOptions,
} from "./types";

const asPositiveInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;

const asNonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;

const getProperty = (value: unknown, ...names: string[]): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const record = value as Record<string, unknown>;
  const key = Object.keys(record).find((candidate) =>
    names.some((name) => candidate.toLowerCase() === name.toLowerCase()),
  );
  return key ? record[key] : undefined;
};

const getMeta = (value: unknown): CommerceProductList["meta"] => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const meta = value as Record<string, unknown>;
  const facetsValue = getProperty(meta, "Facets", "facets");
  const facets = Array.isArray(facetsValue)
    ? facetsValue.flatMap((facetValue) => {
        if (
          !facetValue ||
          typeof facetValue !== "object" ||
          Array.isArray(facetValue)
        ) {
          return [];
        }
        const facet = facetValue as Record<string, unknown>;
        const nameValue = getProperty(facet, "Name", "name");
        const name = typeof nameValue === "string" ? nameValue.trim() : "";
        const xpPathValue = getProperty(facet, "XpPath", "xpPath");
        const xpPath =
          typeof xpPathValue === "string" ? xpPathValue.trim() : "";
        if (!name || !xpPath) return [];

        const facetValues = getProperty(facet, "Values", "values");
        const values = Array.isArray(facetValues)
          ? facetValues.flatMap((itemValue) => {
              if (
                !itemValue ||
                typeof itemValue !== "object" ||
                Array.isArray(itemValue)
              ) {
                return [];
              }
              const item = itemValue as Record<string, unknown>;
              const itemText = getProperty(item, "Value", "value");
              const facetItemValue =
                typeof itemText === "string" ? itemText.trim() : "";
              const count = asNonNegativeInteger(
                getProperty(item, "Count", "count"),
              );
              return facetItemValue && count !== undefined
                ? [{ value: facetItemValue, count }]
                : [];
            })
          : [];

        return [{ name, xpPath, values }];
      })
    : [];

  return {
    page: asPositiveInteger(getProperty(meta, "Page", "page")),
    pageSize: asPositiveInteger(getProperty(meta, "PageSize", "pageSize")),
    totalCount: asNonNegativeInteger(
      getProperty(meta, "TotalCount", "totalCount"),
    ),
    totalPages: asNonNegativeInteger(
      getProperty(meta, "TotalPages", "totalPages"),
    ),
    facets,
  };
};

export class ProductsService {
  constructor(private readonly products: ProductsApi) {}

  async list(options: ListProductsOptions = {}): Promise<CommerceProductList> {
    const response = await this.products.list(
      {
        catalogID: options.catalogId?.trim() || undefined,
        categoryID: options.categoryId?.trim() || undefined,
        search: options.search?.trim() || undefined,
        sortBy: options.sortBy,
        page: options.page,
        pageSize: options.pageSize,
        filters: options.filters,
      },
      { signal: options.signal },
    );

    return {
      items: response.Items.map(toCommerceProduct).filter(
        (product): product is CommerceProduct => !!product,
      ),
      meta: getMeta(response.Meta),
    };
  }

  async listByIds(
    productIds: string[],
    options: ProductRequestOptions = {},
  ): Promise<CommerceProductList> {
    const uniqueIds = [
      ...new Set(
        productIds
          .map((productId) => productId.trim())
          .filter((productId) => productId.length > 0),
      ),
    ];

    if (uniqueIds.length === 0) {
      return {
        items: [],
        meta: { totalCount: 0 },
      };
    }

    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += 100) {
      chunks.push(uniqueIds.slice(index, index + 100));
    }

    const responses = await Promise.all(
      chunks.map((ids) =>
        this.products.list(
          {
            pageSize: ids.length,
            filters: { ID: ids },
          },
          { signal: options.signal },
        ),
      ),
    );
    const productsById = new Map(
      responses
        .flatMap((response) => response.Items)
        .map(toCommerceProduct)
        .filter((product): product is CommerceProduct => !!product)
        .map((product): [string, CommerceProduct] => [product.id, product]),
    );
    const items = uniqueIds.flatMap((productId) => {
      const product = productsById.get(productId);
      return product ? [product] : [];
    });

    return {
      items,
      meta: { totalCount: items.length },
    };
  }
}
