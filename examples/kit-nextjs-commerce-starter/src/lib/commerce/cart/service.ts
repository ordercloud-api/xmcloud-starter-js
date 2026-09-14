import { Cart, type LineItem } from "ordercloud-javascript-sdk";
import { configureOrderCloudSdk, type CommerceRequest } from "../client";
import { toCommerceCart, type OrderCloudCart } from "./mapper";
import type {
  AddCartItemInput,
  CommerceCart,
  UpdateCartItemInput,
} from "./types";

export const getCart = async (shopperToken: string): Promise<CommerceCart> => {
  configureOrderCloudSdk();
  const service = new CartService((operation) =>
    operation({ accessToken: shopperToken }),
  );
  return service.get();
};

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
}
