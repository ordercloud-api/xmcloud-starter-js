import { Me, type Spec, type Variant } from "ordercloud-javascript-sdk";
import { getCommerceBrowserConfig } from "../browser-config";
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

const getMeta = (value: unknown): CommerceProductList["meta"] => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  const meta = value as Record<string, unknown>;

  return {
    page: asPositiveInteger(meta.Page),
    pageSize: asPositiveInteger(meta.PageSize),
    totalCount: asNonNegativeInteger(meta.TotalCount),
    totalPages: asNonNegativeInteger(meta.TotalPages),
  };
};

export class ProductsService {
  constructor(private readonly request: CommerceRequest) {}

  async list(options: ListProductsOptions = {}): Promise<CommerceProductList> {
    const catalogId = getCommerceBrowserConfig().catalogId;
    const response = await this.request((requestOptions) => {
      const optionsWithSignal = { ...requestOptions, signal: options.signal };
      return Me.ListProducts<OrderCloudBuyerProduct>(
        {
          catalogID: catalogId,
          search: options.search?.trim() || undefined,
          page: options.page,
          pageSize: options.pageSize,
        },
        optionsWithSignal,
      );
    });

    return {
      items: Array.isArray(response.Items)
        ? response.Items.map(toCommerceProduct).filter(
            (product): product is CommerceProduct => !!product,
          )
        : [],
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
