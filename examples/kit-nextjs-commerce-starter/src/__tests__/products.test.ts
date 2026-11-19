import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProductsApi } from "@sitecore-content-sdk/commerce";
import { toCommerceProduct } from "../lib/commerce/products/mapper";
import { ProductsService } from "../lib/commerce/products/service";

const createProductsApi = (
  list: ProductsApi["list"] = vi.fn() as unknown as ProductsApi["list"],
): ProductsApi => ({
  get: vi.fn(),
  list,
  listSpecs: vi.fn(),
  listVariants: vi.fn(),
});

afterEach(() => vi.restoreAllMocks());

describe("ProductsService", () => {
  it("maps SDK list responses to starter product view models", async () => {
    const list = vi.fn().mockResolvedValue({
      Items: [{ ID: "P-1", Name: "Headphones" }],
      Meta: {
        Page: 2,
        PageSize: 10,
        TotalCount: 12,
        TotalPages: 2,
        Facets: [
          {
            Name: "Brand",
            XpPath: "Facets.Brand",
            Values: [
              { Value: "Nike", Count: 8 },
              { Value: "Jordan", Count: 4 },
            ],
          },
        ],
      },
    });
    const service = new ProductsService(
      createProductsApi(list as unknown as ProductsApi["list"]),
    );

    await expect(
      service.list({
        catalogId: " catalog/one ",
        categoryId: " running/shoes ",
        search: "head phones",
        sortBy: ["!xp.Price"],
        page: 2,
        pageSize: 10,
        filters: { "xp.Facets.Brand": ["Nike"] },
      }),
    ).resolves.toEqual({
      items: [{ id: "P-1", name: "Headphones", images: [] }],
      meta: {
        page: 2,
        pageSize: 10,
        totalCount: 12,
        totalPages: 2,
        facets: [
          {
            name: "Brand",
            xpPath: "Facets.Brand",
            values: [
              { value: "Nike", count: 8 },
              { value: "Jordan", count: 4 },
            ],
          },
        ],
      },
    });
    expect(list).toHaveBeenCalledWith(
      {
        catalogID: "catalog/one",
        categoryID: "running/shoes",
        search: "head phones",
        sortBy: ["!xp.Price"],
        page: 2,
        pageSize: 10,
        filters: { "xp.Facets.Brand": ["Nike"] },
      },
      { signal: undefined },
    );
  });

  it("loads selected products in input order and skips missing IDs", async () => {
    const list = vi.fn().mockResolvedValue({
      Items: [
        { ID: "P-1", Name: "P-1" },
        { ID: "P-2", Name: "P-2" },
      ],
      Meta: { TotalCount: 2 },
    });
    const service = new ProductsService(
      createProductsApi(list as unknown as ProductsApi["list"]),
    );

    await expect(
      service.listByIds([" P-2 ", "P-1", "P-2", "MISSING", ""]),
    ).resolves.toEqual({
      items: [
        { id: "P-2", name: "P-2", images: [] },
        { id: "P-1", name: "P-1", images: [] },
      ],
      meta: { totalCount: 2 },
    });
    expect(list).toHaveBeenCalledWith(
      {
        pageSize: 3,
        filters: { ID: ["P-2", "P-1", "MISSING"] },
      },
      { signal: undefined },
    );
  });

  it("returns an empty list without requesting products", async () => {
    const list = vi.fn();
    const service = new ProductsService(
      createProductsApi(list as unknown as ProductsApi["list"]),
    );

    await expect(service.listByIds([" ", ""])).resolves.toEqual({
      items: [],
      meta: { totalCount: 0 },
    });
    expect(list).not.toHaveBeenCalled();
  });

  it("maps XP images, primary image order, price, and metadata", () => {
    expect(
      toCommerceProduct({
        ID: "SKU-IMAGES",
        Name: "Gallery product",
        PriceSchedule: {
          Currency: "USD",
          PriceBreaks: [{ Quantity: 1, Price: 189.99 }],
        },
        xp: {
          Brand: "Jordan",
          Category: "Basketball Lifestyle",
          Images: [
            { Url: "https://images.example.test/detail.jpg" },
            {
              Url: "https://images.example.test/primary.jpg",
              Thumbnailurl: "https://images.example.test/primary-thumb.jpg",
              Primary: true,
            },
          ],
        },
      }),
    ).toMatchObject({
      imageUrl: "https://images.example.test/primary.jpg",
      thumbnailUrl: "https://images.example.test/primary-thumb.jpg",
      brand: "Jordan",
      category: "Basketball Lifestyle",
      price: 189.99,
      currency: "USD",
      images: [
        {
          url: "https://images.example.test/primary.jpg",
          thumbnailUrl: "https://images.example.test/primary-thumb.jpg",
        },
        { url: "https://images.example.test/detail.jpg" },
      ],
    });
  });
});
