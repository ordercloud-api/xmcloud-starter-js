import { Cart, Configuration, type LineItem } from "ordercloud-javascript-sdk";
import type { OrderCloudApiPath } from "@sitecore-content-sdk/commerce";
import { getCommerceBrowserConfig } from "../browser-config";
import { toCommerceCart, type OrderCloudCart } from "./mapper";
import type {
  AddCartItemInput,
  CommerceCart,
  UpdateCartItemInput,
} from "./types";

const createCartService = (shopperToken: string): CartService => {
  Configuration.Set({ baseApiUrl: getCommerceBrowserConfig().baseApiUrl });
  const request = async <T>(
    path: OrderCloudApiPath,
    init: RequestInit = {},
  ): Promise<T> => {
    const options = { accessToken: shopperToken };
    let result: unknown;
    if (path === "/v1/cart" && init.method === "GET") {
      result = await Cart.Get(options);
    } else if (path.startsWith("/v1/cart/lineitems") && init.method === "GET") {
      result = await Cart.ListLineItems({ pageSize: 100 }, options);
    } else if (path === "/v1/cart/lineitems" && init.method === "POST") {
      result = await Cart.CreateLineItem(
        JSON.parse(String(init.body)),
        options,
      );
    } else if (
      path.startsWith("/v1/cart/lineitems/") &&
      init.method === "PATCH"
    ) {
      result = await Cart.PatchLineItem(
        decodeURIComponent(path.split("/").at(-1) ?? ""),
        JSON.parse(String(init.body)),
        options,
      );
    } else if (
      path.startsWith("/v1/cart/lineitems/") &&
      init.method === "DELETE"
    ) {
      result = await Cart.DeleteLineItem(
        decodeURIComponent(path.split("/").at(-1) ?? ""),
        options,
      );
    } else if (path === "/v1/cart" && init.method === "PATCH") {
      result = await Cart.Patch(JSON.parse(String(init.body)), options);
    } else {
      throw new Error(
        `Unsupported cart request: ${init.method ?? "GET"} ${path}`,
      );
    }
    return result as T;
  };
  return new CartService(request);
};

export const getCart = async (shopperToken: string): Promise<CommerceCart> =>
  createCartService(shopperToken).get();

export const markCartCheckoutPending = async (
  shopperToken: string,
  input: { clientId: string; stripeSessionId: string },
): Promise<void> => createCartService(shopperToken).markCheckoutPending(input);

export class CartService {
  constructor(
    private readonly request: <T>(
      path: OrderCloudApiPath,
      init?: RequestInit,
    ) => Promise<T>,
  ) {}

  async get(): Promise<CommerceCart> {
    const [order, lineItems] = await Promise.all([
      this.request<OrderCloudCart>("/v1/cart", { method: "GET" }),
      this.request<{ Items?: LineItem[] }>("/v1/cart/lineitems?pageSize=100", {
        method: "GET",
      }),
    ]);
    return toCommerceCart(order, lineItems);
  }

  async addItem(input: AddCartItemInput): Promise<void> {
    const lineItem = {
      ProductID: input.productId,
      Quantity: input.quantity,
      ...(input.specs?.length ? { Specs: input.specs } : {}),
    } satisfies LineItem;

    await this.request("/v1/cart/lineitems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lineItem),
    });
  }

  async updateItem(input: UpdateCartItemInput): Promise<void> {
    await this.request(
      `/v1/cart/lineitems/${encodeURIComponent(input.lineItemId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Quantity: input.quantity }),
      },
    );
  }

  async removeItem(lineItemId: string): Promise<void> {
    await this.request(`/v1/cart/lineitems/${encodeURIComponent(lineItemId)}`, {
      method: "DELETE",
    });
  }

  async markCheckoutPending(input: {
    clientId: string;
    stripeSessionId: string;
  }): Promise<void> {
    await this.request("/v1/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xp: {
          CheckoutStatus: "Pending",
          ocClientId: input.clientId,
          stripeSessionId: input.stripeSessionId,
        },
      }),
    });
  }
}
