import { Me, type Spec, type Variant } from "ordercloud-javascript-sdk";
import type { CommerceRequest } from "../client";
import { toCommerceProduct } from "./mapper";
import type {
  CommerceProduct,
  CommerceProductList,
  ListProductsOptions,
  OrderCloudBuyerProduct,
  ProductRequestOptions,
} from "./types";
import { toCommerceProductSpec, type CommerceProductSpec } from "./specs";
import {
  toCommerceProductVariant,
  type CommerceProductVariant,
} from "./variants";

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

const getListItems = (value: unknown): unknown[] => {
  const items = getProperty(value, "Items", "items");
  return Array.isArray(items) ? items : [];
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
  constructor(private readonly request: CommerceRequest) {}

  async list(options: ListProductsOptions = {}): Promise<CommerceProductList> {
    const response = await this.request((requestOptions) => {
      const optionsWithSignal = { ...requestOptions, signal: options.signal };
      return Me.ListProducts<OrderCloudBuyerProduct>(
        {
          catalogID: options.catalogId?.trim() || undefined,
          categoryID: options.categoryId?.trim() || undefined,
          search: options.search?.trim() || undefined,
          sortBy: options.sortBy,
          page: options.page,
          pageSize: options.pageSize,
          filters: options.filters,
        },
        optionsWithSignal,
      );
    });

    return {
      items: getListItems(response)
        .map(toCommerceProduct)
        .filter((product): product is CommerceProduct => !!product),
      meta: getMeta(getProperty(response, "Meta", "meta")),
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

    const items = (
      await Promise.all(
        uniqueIds.map(async (productId) => {
          try {
            return await this.get(productId, options);
          } catch {
            return undefined;
          }
        }),
      )
    ).filter((product): product is CommerceProduct => !!product);

    return {
      items,
      meta: { totalCount: items.length },
    };
  }

  async get(
    productId: string,
    options: ProductRequestOptions = {},
  ): Promise<CommerceProduct> {
    const normalizedId = productId.trim();
    if (!normalizedId) throw new Error("OrderCloud product ID is required");

    const response = await this.request((requestOptions) => {
      const optionsWithSignal = { ...requestOptions, signal: options.signal };
      return Me.GetProduct<OrderCloudBuyerProduct>(
        normalizedId,
        undefined,
        optionsWithSignal,
      );
    });
    const product = toCommerceProduct(response);
    if (!product)
      throw new Error("OrderCloud returned an invalid product response");
    return product;
  }

  async listSpecs(
    productId: string,
    options: ProductRequestOptions = {},
  ): Promise<CommerceProductSpec[]> {
    const normalizedId = productId.trim();
    if (!normalizedId) throw new Error("OrderCloud product ID is required");

    const response = await this.request((requestOptions) => {
      const optionsWithSignal = { ...requestOptions, signal: options.signal };
      return Me.ListSpecs<Spec>(
        normalizedId,
        { pageSize: 100 },
        optionsWithSignal,
      );
    });

    return Array.isArray(response.Items)
      ? response.Items.flatMap((value) => {
          const spec = toCommerceProductSpec(value);
          return spec ? [spec] : [];
        })
      : [];
  }

  async listVariants(
    productId: string,
    options: ProductRequestOptions = {},
  ): Promise<CommerceProductVariant[]> {
    const normalizedId = productId.trim();
    if (!normalizedId) throw new Error("OrderCloud product ID is required");

    const variants: CommerceProductVariant[] = [];
    const pageSize = 100;
    let page = 1;

    while (true) {
      const response = await this.request((requestOptions) => {
        const optionsWithSignal = { ...requestOptions, signal: options.signal };
        return Me.ListVariants<Variant>(
          normalizedId,
          { page, pageSize, filters: { Active: true } },
          optionsWithSignal,
        );
      });
      const pageItems = Array.isArray(response.Items) ? response.Items : [];
      variants.push(
        ...pageItems.flatMap((value) => {
          const variant = toCommerceProductVariant(value);
          return variant?.active ? [variant] : [];
        }),
      );

      const totalPages = asNonNegativeInteger(response.Meta?.TotalPages);
      if (
        pageItems.length < pageSize ||
        (totalPages !== undefined && page >= totalPages)
      )
        break;
      page += 1;
    }

    return variants;
  }
}
