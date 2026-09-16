import type { LineItemSpec } from 'ordercloud-javascript-sdk';

export interface CommerceCartItemSpec {
  specId: string;
  name?: string;
  optionId?: string;
  value?: string;
}

export interface CommerceCartItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  specs?: CommerceCartItemSpec[];
}

export interface CommerceCart {
  id?: string;
  status: 'Unsubmitted';
  currency?: string;
  subtotal?: number;
  taxCost?: number;
  total?: number;
  isCalculated: boolean;
  items: CommerceCartItem[];
}

export interface AddCartItemInput {
  productId: string;
  quantity: number;
  specs?: LineItemSpec[];
}

export interface UpdateCartItemInput {
  lineItemId: string;
  quantity: number;
}
