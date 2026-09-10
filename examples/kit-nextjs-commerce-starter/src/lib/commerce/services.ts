import type { CommerceRequest } from './client';
import { ProductsService } from './products';
import { CartService } from './cart/service';

export interface OrderCloudServices {
  products: ProductsService;
  cart: CartService;
}

export const createOrderCloudServices = (request: CommerceRequest): OrderCloudServices => ({
  products: new ProductsService(request),
  cart: new CartService(request),
});
