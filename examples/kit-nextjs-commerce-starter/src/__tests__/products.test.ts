import { afterEach, describe, expect, it, vi } from 'vitest';
import { Me } from 'ordercloud-javascript-sdk';
import type { CommerceRequest } from '../lib/commerce/client';
import { ProductsService } from '../lib/commerce/products/service';

const request: CommerceRequest = (operation) => operation({ accessToken: 'test-token' });

const originalCatalogId = process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID;
const originalProxyUrl = process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalCatalogId === undefined)
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID = originalCatalogId;
  if (originalProxyUrl === undefined)
    delete process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL;
  else process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL = originalProxyUrl;
});

describe('ProductsService', () => {
  it('searches the buyer catalog and maps metadata', async () => {
    process.env.NEXT_PUBLIC_ORDERCLOUD_PROXY_URL =
      'https://commerce.example.test';
    process.env.NEXT_PUBLIC_ORDERCLOUD_CATALOG_ID = 'catalog/one';
    const listProducts = vi.spyOn(Me, 'ListProducts').mockResolvedValue({
      Items: [{ ID: 'P-1', Name: 'Headphones' }],
      Meta: { Page: 2, PageSize: 10, TotalCount: 12, TotalPages: 2 },
    } as never);
    const service = new ProductsService(request);

    await expect(
      service.list({ search: 'head phones', page: 2, pageSize: 10 }),
    ).resolves.toEqual({
      items: [{ id: 'P-1', name: 'Headphones', images: [] }],
      meta: { page: 2, pageSize: 10, totalCount: 12, totalPages: 2 },
    });
    expect(listProducts).toHaveBeenCalledWith(
      {
        catalogID: 'catalog/one',
        search: 'head phones',
        page: 2,
        pageSize: 10,
      },
      { accessToken: 'test-token', signal: undefined },
    );
  });

  it('retrieves and safely encodes a single product ID', async () => {
    const getProduct = vi.spyOn(Me, 'GetProduct').mockResolvedValue({
      ID: 'SKU/123',
      Name: 'Headphones',
      PriceSchedule: { Currency: 'USD', PriceBreaks: [{ Price: 19.99 }] },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get(' SKU/123 ')).resolves.toEqual({
      id: 'SKU/123',
      name: 'Headphones',
      images: [],
      price: 19.99,
      currency: 'USD',
    });
    expect(getProduct).toHaveBeenCalledWith(
      'SKU/123',
      undefined,
      { accessToken: 'test-token', signal: undefined },
    );
  });

  it('maps the updated XP schema and moves the primary image first', async () => {
    vi.spyOn(Me, 'GetProduct').mockResolvedValue({
      ID: 'SKU-IMAGES',
      Name: 'Gallery product',
      xp: {
        Brand: 'Jordan',
        Category: 'Basketball Lifestyle',
        Price: 189.99,
        Images: [
          { Url: 'https://images.example.test/detail.jpg' },
          {
            Url: 'https://images.example.test/primary.jpg',
            Thumbnailurl: 'https://images.example.test/primary-thumb.jpg',
            Primary: true,
          },
        ],
      },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get('SKU-IMAGES')).resolves.toMatchObject({
      imageUrl: 'https://images.example.test/primary.jpg',
      thumbnailUrl: 'https://images.example.test/primary-thumb.jpg',
      brand: 'Jordan',
      category: 'Basketball Lifestyle',
      price: 189.99,
      images: [
        {
          url: 'https://images.example.test/primary.jpg',
          thumbnailUrl: 'https://images.example.test/primary-thumb.jpg',
        },
        { url: 'https://images.example.test/detail.jpg' },
      ],
    });
  });

  it('uses the first product image when no primary image is provided', async () => {
    vi.spyOn(Me, 'GetProduct').mockResolvedValue({
      ID: 'SKU-NO-PRIMARY',
      Name: 'Gallery product',
      xp: {
        Images: [
          { Url: 'https://images.example.test/first.jpg' },
          { Url: 'https://images.example.test/second.jpg' },
        ],
      },
    } as never);
    const service = new ProductsService(request);

    await expect(service.get('SKU-NO-PRIMARY')).resolves.toMatchObject({
      imageUrl: 'https://images.example.test/first.jpg',
      thumbnailUrl: 'https://images.example.test/first.jpg',
      images: [
        { url: 'https://images.example.test/first.jpg' },
        { url: 'https://images.example.test/second.jpg' },
      ],
    });
  });

  it('rejects an empty product ID before making a request', async () => {
    const getProduct = vi.spyOn(Me, 'GetProduct');
    const service = new ProductsService(request);

    await expect(service.get(' ')).rejects.toThrow(
      'OrderCloud product ID is required',
    );
    expect(getProduct).not.toHaveBeenCalled();
  });

  it('loads selected products by ID in order and skips missing ones', async () => {
    const getProduct = vi.spyOn(Me, 'GetProduct').mockImplementation(async (productId) => {
      if (productId === 'MISSING') throw new Error('Not found');
      return { ID: productId, Name: productId } as never;
    });
    const service = new ProductsService(request);

    await expect(
      service.listByIds([' P-2 ', 'P-1', 'P-2', 'MISSING', '']),
    ).resolves.toEqual({
      items: [
        { id: 'P-2', name: 'P-2', images: [] },
        { id: 'P-1', name: 'P-1', images: [] },
      ],
      meta: { totalCount: 2 },
    });
    expect(getProduct).toHaveBeenCalledTimes(3);
    expect(getProduct.mock.calls.map((call) => call[0])).toEqual([
      'P-2',
      'P-1',
      'MISSING',
    ]);
  });

  it('returns an empty list without requesting products', async () => {
    const getProduct = vi.spyOn(Me, 'GetProduct');
    const service = new ProductsService(request);

    await expect(service.listByIds([' ', ''])).resolves.toEqual({
      items: [],
      meta: { totalCount: 0 },
    });
    expect(getProduct).not.toHaveBeenCalled();
  });

  it('loads and maps specs assigned to a product', async () => {
    const listSpecs = vi.spyOn(Me, 'ListSpecs').mockResolvedValue({
      Items: [
        {
          ID: 'SIZE',
          Name: 'Size',
          Required: true,
          DefinesVariant: true,
          DefaultOptionID: 'MEDIUM',
          Options: [
            { ID: 'SMALL', Value: 'Small' },
            { ID: 'MEDIUM', Value: 'Medium' },
          ],
        },
      ],
    } as never);
    const service = new ProductsService(request);

    await expect(service.listSpecs('SKU/123')).resolves.toEqual([
      {
        id: 'SIZE',
        name: 'Size',
        required: true,
        allowOpenText: false,
        definesVariant: true,
        defaultOptionId: 'MEDIUM',
        defaultValue: undefined,
        options: [
          { id: 'SMALL', name: 'Small', isOpenText: false },
          { id: 'MEDIUM', name: 'Medium', isOpenText: false },
        ],
      },
    ]);
    expect(listSpecs).toHaveBeenCalledWith(
      'SKU/123',
      { pageSize: 100 },
      { accessToken: 'test-token', signal: undefined },
    );
  });
});
