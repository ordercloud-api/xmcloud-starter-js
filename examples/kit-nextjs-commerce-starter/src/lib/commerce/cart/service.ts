import { Cart, type LineItem } from "ordercloud-javascript-sdk";
import {
  configureOrderCloudSdk,
  runOrderCloudOperation,
  type CommerceRequest,
} from "../client";
import { toCommerceCart, type OrderCloudCart } from "./mapper";
import type {
  AddCartItemInput,
  CommerceCart,
  UpdateCartItemInput,
} from "./types";

const createCartService = (shopperToken: string): CartService => {
  configureOrderCloudSdk();
  return new CartService((operation) =>
    runOrderCloudOperation(operation, { accessToken: shopperToken }),
  );
};

export const getCart = async (shopperToken: string): Promise<CommerceCart> =>
  createCartService(shopperToken).get();

export const markCartCheckoutPending = async (
  shopperToken: string,
  input: { clientId: string; stripeSessionId: string },
): Promise<void> =>
  createCartService(shopperToken).markCheckoutPending(input);

export class CartService {
  constructor(private readonly request: CommerceRequest) {}

  async get(): Promise<CommerceCart> {
    const [order, lineItems] = await Promise.all([
      this.request((requestOptions) =>
        Cart.Get<OrderCloudCart>(requestOptions),
      ),
      this.request((requestOptions) =>
        Cart.ListLineItems<LineItem>({ pageSize: 100 }, requestOptions),
      ),
    ]);
    return toCommerceCart(order, lineItems);
  }

  async addItem(input: AddCartItemInput): Promise<void> {
    const lineItem = {
      ProductID: input.productId,
      Quantity: input.quantity,
      ...(input.specs?.length ? { Specs: input.specs } : {}),
    } satisfies LineItem;
    await this.request((requestOptions) =>
      Cart.CreateLineItem(lineItem, requestOptions),
    );
  }

  async updateItem(input: UpdateCartItemInput): Promise<void> {
    await this.request((requestOptions) =>
      Cart.PatchLineItem(
        input.lineItemId,
        { Quantity: input.quantity },
        requestOptions,
      ),
    );
  }

  async removeItem(lineItemId: string): Promise<void> {
    await this.request((requestOptions) =>
      Cart.DeleteLineItem(lineItemId, requestOptions),
    );
  }

  async markCheckoutPending(input: {
    clientId: string;
    stripeSessionId: string;
  }): Promise<void> {
    await this.request((requestOptions) =>
      Cart.Patch(
        {
          xp: {
            CheckoutStatus: "Pending",
            ocClientId: input.clientId,
            stripeSessionId: input.stripeSessionId,
          },
        },
        requestOptions,
      ),
    );
  }
}
