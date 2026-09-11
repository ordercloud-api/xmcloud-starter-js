import { getCommerceBrowserConfig } from '@/lib/commerce/browser-config';
import type { CommerceRequest } from '@/lib/commerce/client';
import type { AddCartItemInput, CommerceCart, CommerceCartItem, UpdateCartItemInput } from './types';

type OrderCloudCart = {
  ID?: unknown;
  Status?: unknown;
  Currency?: unknown;
  Subtotal?: unknown;
  TaxCost?: unknown;
  Total?: unknown;
  IsCalculated?: unknown;
};

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const parseCart = (order: OrderCloudCart): CommerceCart => {
  const id = asString(order.ID);

  if (order.Status !== undefined && order.Status !== null && order.Status !== 'Unsubmitted') {
    throw new Error('OrderCloud cart response was not an unsubmitted order');
  }

  return {
    ...(id ? { id } : {}),
    status: 'Unsubmitted',
    currency: asString(order.Currency),
    subtotal: asNumber(order.Subtotal),
    taxCost: asNumber(order.TaxCost),
    total: asNumber(order.Total),
    isCalculated: order.IsCalculated === true,
    items: [],
  };
};

const parseCartItems = (payload: unknown): CommerceCartItem[] => {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { Items?: unknown }).Items)
      ? (payload as { Items: unknown[] }).Items
      : [];

  return items.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as {
      ID?: unknown;
      ProductID?: unknown;
      Quantity?: unknown;
      UnitPrice?: unknown;
      Product?: { Name?: unknown };
    };
    const productId = asString(row.ProductID);
    if (!productId) return [];

    return [
      {
        id: asString(row.ID) || `line-${index}`,
        productId,
        name: asString(row.Product?.Name) || productId,
        quantity: asNumber(row.Quantity) || 1,
        unitPrice: asNumber(row.UnitPrice),
      },
    ];
  });
};

export const getCart = async (shopperToken: string): Promise<CommerceCart> => {
  const proxyBaseUrl = getCommerceBrowserConfig().proxyBaseUrl;
  const headers = { Authorization: `Bearer ${shopperToken}` };
  const cartResponse = await fetch(`${proxyBaseUrl}/v1/cart`, {
    headers,
    cache: 'no-store',
  });
  const cartPayload = (await cartResponse.json().catch(() => ({}))) as OrderCloudCart;
  if (!cartResponse.ok) {
    throw new Error('Unable to load OrderCloud cart');
  }

  const lineResponse = await fetch(`${proxyBaseUrl}/v1/cart/lineitems`, {
    headers,
    cache: 'no-store',
  });
  const linePayload = await lineResponse.json().catch(() => []);
  const cart = parseCart(cartPayload);
  cart.items = lineResponse.ok ? parseCartItems(linePayload) : [];
  return cart;
};

const dispatchCartMutation = async (
  request: CommerceRequest,
  path: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>
): Promise<void> => {
  await request<void>(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
};

export class CartService {
  constructor(private readonly request: CommerceRequest) {}

  async get(): Promise<CommerceCart> {
    return parseCart(await this.request<OrderCloudCart>('/v1/cart'));
  }

  async addItem(input: AddCartItemInput): Promise<void> {
    await dispatchCartMutation(this.request, '/v1/cart/lineitems', 'POST', {
      ProductID: input.productId,
      Quantity: input.quantity,
    });
  }

  async updateItem(input: UpdateCartItemInput): Promise<void> {
    await dispatchCartMutation(
      this.request,
      `/v1/cart/lineitems/${encodeURIComponent(input.lineItemId)}`,
      'PATCH',
      { Quantity: input.quantity }
    );
  }

  async removeItem(lineItemId: string): Promise<void> {
    await dispatchCartMutation(
      this.request,
      `/v1/cart/lineitems/${encodeURIComponent(lineItemId)}`,
      'DELETE'
    );
  }
}
