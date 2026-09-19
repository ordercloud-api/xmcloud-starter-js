import { afterEach, describe, expect, it, vi } from "vitest";
import { Me } from "ordercloud-javascript-sdk";
import type { CommerceRequest } from "../lib/commerce/client";
import { ProductsService } from "../lib/commerce/products/service";

const request: CommerceRequest = (operation) =>
  operation({ accessToken: "test-token" });

const originalClientId = process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalClientId === undefined)
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = originalClientId;
});

describe("ProductsService", () => {
  it("searches the buyer catalog and maps metadata", async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "buyer-client-id";
    const listProducts = vi.spyOn(Me, "ListProducts").mockResolvedValue({
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
    } as never);
    const service = new ProductsService(request);

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
    expect(listProducts).toHaveBeenCalledWith(
      {
        catalogID: "catalog/one",
        categoryID: "running/shoes",
        search: "head phones",
        sortBy: ["!xp.Price"],
        page: 2,
        pageSize: 10,
        filters: { "xp.Facets.Brand": ["Nike"] },
      },
      { accessToken: "test-token", signal: undefined },
    );
  });

  it("maps JSON-cased list responses instead of treating them as empty", async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_CLIENT_ID = "buyer-client-id";
    vi.spyOn(Me, "ListProducts").mockResolvedValue({
      items: [{ id: "P-2", name: "Running shoes" }],
      meta: { totalCount: 1, totalPages: 1 },
    } as never);

    await expect(new ProductsService(request).list()).resolves.toEqual({
      items: [{ id: "P-2", name: "Running shoes", images: [] }],
      meta: { totalCount: 1, totalPages: 1, facets: [] },
    });
  });

  it("retrieves and safely encodes a single product ID", async () => {
    const getProduct = vi.spyOn(Me, "GetProduct").mockResolvedValue({
      ID: "SKU/123",
      Name: "Headphones",
      PriceSchedule: { Currency: "USD", PriceBreaks: [{ Price: 19.99 }] },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get(" SKU/123 ")).resolves.toEqual({
      id: "SKU/123",
      name: "Headphones",
      images: [],
      price: 19.99,
      currency: "USD",
    });
    expect(getProduct).toHaveBeenCalledWith("SKU/123", undefined, {
      accessToken: "test-token",
      signal: undefined,
    });
  });

  it("maps the updated XP schema and moves the primary image first", async () => {
    vi.spyOn(Me, "GetProduct").mockResolvedValue({
      ID: "SKU-IMAGES",
      Name: "Gallery product",
      xp: {
        Brand: "Jordan",
        Category: "Basketball Lifestyle",
        Price: 189.99,
        Images: [
          { Url: "https://images.example.test/detail.jpg" },
          {
            Url: "https://images.example.test/primary.jpg",
            Thumbnailurl: "https://images.example.test/primary-thumb.jpg",
            Primary: true,
          },
        ],
      },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get("SKU-IMAGES")).resolves.toMatchObject({
      imageUrl: "https://images.example.test/primary.jpg",
      thumbnailUrl: "https://images.example.test/primary-thumb.jpg",
      brand: "Jordan",
      category: "Basketball Lifestyle",
      price: 189.99,
      images: [
        {
          url: "https://images.example.test/primary.jpg",
          thumbnailUrl: "https://images.example.test/primary-thumb.jpg",
        },
        { url: "https://images.example.test/detail.jpg" },
      ],
    });
  });

  it("uses the first product image when no primary image is provided", async () => {
    vi.spyOn(Me, "GetProduct").mockResolvedValue({
      ID: "SKU-NO-PRIMARY",
      Name: "Gallery product",
      xp: {
        Images: [
          { Url: "https://images.example.test/first.jpg" },
          { Url: "https://images.example.test/second.jpg" },
        ],
      },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get("SKU-NO-PRIMARY")).resolves.toMatchObject({
      imageUrl: "https://images.example.test/first.jpg",
      thumbnailUrl: "https://images.example.test/first.jpg",
      images: [
        { url: "https://images.example.test/first.jpg" },
        { url: "https://images.example.test/second.jpg" },
      ],
    });
  });

  it("rejects an empty product ID before making a request", async () => {
    const getProduct = vi.spyOn(Me, "GetProduct");
    const service = new ProductsService(request);

    await expect(service.get(" ")).rejects.toThrow(
      "OrderCloud product ID is required",
    );
    expect(getProduct).not.toHaveBeenCalled();
  });

  it("loads selected products by ID in order and skips missing ones", async () => {
    const listProducts = vi.spyOn(Me, "ListProducts").mockResolvedValue({
      Items: [
        { ID: "P-1", Name: "P-1" },
        { ID: "P-2", Name: "P-2" },
      ],
      Meta: { TotalCount: 2 },
    } as never);
    const service = new ProductsService(request);

    await expect(
      service.listByIds([" P-2 ", "P-1", "P-2", "MISSING", ""]),
    ).resolves.toEqual({
      items: [
        { id: "P-2", name: "P-2", images: [] },
        { id: "P-1", name: "P-1", images: [] },
      ],
      meta: { totalCount: 2 },
    });
    expect(listProducts).toHaveBeenCalledOnce();
    expect(listProducts).toHaveBeenCalledWith(
      {
        pageSize: 3,
        filters: { ID: "P-2|P-1|MISSING" },
      },
      { accessToken: "test-token", signal: undefined },
    );
  });

  it("returns an empty list without requesting products", async () => {
    const listProducts = vi.spyOn(Me, "ListProducts");
    const service = new ProductsService(request);

    await expect(service.listByIds([" ", ""])).resolves.toEqual({
      items: [],
      meta: { totalCount: 0 },
    });
    expect(listProducts).not.toHaveBeenCalled();
  });

  it("loads and maps specs assigned to a product", async () => {
    const listSpecs = vi.spyOn(Me, "ListSpecs").mockResolvedValue({
      Items: [
        {
          ID: "SIZE",
          Name: "Size",
          Required: true,
          DefinesVariant: true,
          DefaultOptionID: "MEDIUM",
          Options: [
            { ID: "SMALL", Value: "Small" },
            { ID: "MEDIUM", Value: "Medium" },
          ],
        },
      ],
    } as never);
    const service = new ProductsService(request);

    await expect(service.listSpecs("SKU/123")).resolves.toEqual([
      {
        id: "SIZE",
        name: "Size",
        required: true,
        allowOpenText: false,
        definesVariant: true,
        defaultOptionId: "MEDIUM",
        defaultValue: undefined,
        presentation: {
          control: undefined,
          textControl: undefined,
          label: undefined,
          helpText: undefined,
          placeholder: undefined,
          prefix: undefined,
          suffix: undefined,
        },
        validation: {
          min: undefined,
          max: undefined,
          step: undefined,
          minLength: undefined,
          maxLength: undefined,
          minDate: undefined,
          maxDate: undefined,
        },
        options: [
          {
            id: "SMALL",
            name: "Small",
            isOpenText: false,
            priceMarkupType: undefined,
            priceMarkup: undefined,
            presentation: {
              label: undefined,
              description: undefined,
              color: undefined,
              imageUrl: undefined,
              badge: undefined,
            },
          },
          {
            id: "MEDIUM",
            name: "Medium",
            isOpenText: false,
            priceMarkupType: undefined,
            priceMarkup: undefined,
            presentation: {
              label: undefined,
              description: undefined,
              color: undefined,
              imageUrl: undefined,
              badge: undefined,
            },
          },
        ],
      },
    ]);
    expect(listSpecs).toHaveBeenCalledWith(
      "SKU/123",
      { pageSize: 100 },
      { accessToken: "test-token", signal: undefined },
    );
  });
  it("loads every page of active variants and normalizes their spec combinations", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ID: `VARIANT-${index + 1}`,
      Active: true,
      Specs: [{ SpecID: "SIZE", OptionID: `SIZE-${index + 1}` }],
    }));
    const listVariants = vi
      .spyOn(Me, "ListVariants")
      .mockResolvedValueOnce({
        Items: firstPage,
        Meta: { Page: 1, PageSize: 100, TotalPages: 2, TotalCount: 102 },
      } as never)
      .mockResolvedValueOnce({
        Items: [
          {
            ID: "VARIANT-101",
            Active: false,
            Specs: [{ SpecID: "SIZE", OptionID: "SIZE-101" }],
          },
          {
            ID: "VARIANT-102",
            Active: true,
            Specs: [{ SpecID: "SIZE", OptionID: "SIZE-102" }],
          },
        ],
        Meta: { Page: 2, PageSize: 100, TotalPages: 2, TotalCount: 102 },
      } as never);
    const service = new ProductsService(request);

    const variants = await service.listVariants("SKU-123");

    expect(variants).toHaveLength(101);
    expect(variants.at(-1)).toEqual({
      id: "VARIANT-102",
      active: true,
      specs: { SIZE: "SIZE-102" },
    });
    expect(listVariants).toHaveBeenNthCalledWith(
      1,
      "SKU-123",
      { page: 1, pageSize: 100, filters: { Active: true } },
      { accessToken: "test-token", signal: undefined },
    );
    expect(listVariants).toHaveBeenNthCalledWith(
      2,
      "SKU-123",
      { page: 2, pageSize: 100, filters: { Active: true } },
      { accessToken: "test-token", signal: undefined },
    );
  });
});
