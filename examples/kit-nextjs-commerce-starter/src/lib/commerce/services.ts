import type { OrderCloudService } from "@sitecore-content-sdk/commerce";
import { ProductsService } from "./products/service";
import { CartService } from "./cart/service";

export interface OrderCloudServices {
  products: ProductsService;
  cart: CartService;
}

export const createOrderCloudServices = (
  service: OrderCloudService,
): OrderCloudServices => ({
  products: new ProductsService(service.products),
  cart: new CartService((path, init) => service.request(path, init)),
});
