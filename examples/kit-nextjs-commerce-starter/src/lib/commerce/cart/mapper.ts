import type { LineItem, Order } from "ordercloud-javascript-sdk";
import { asFiniteNumber, asNonEmptyString } from "../normalization";
import type { CommerceCart, CommerceCartItem } from "./types";

type OrderCloudCart = Pick<
  Order,
  "ID" | "Status" | "Currency" | "Subtotal" | "TaxCost" | "Total"
> & { IsCalculated?: boolean };

const toCommerceCartItems = (payload: unknown): CommerceCartItem[] => {
  const items = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { Items?: unknown }).Items)
      ? (payload as { Items: unknown[] }).Items
      : [];

  return items.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];

    const row = item as LineItem;
    const productId = asNonEmptyString(row.ProductID);
    if (!productId) return [];

    return [
      {
        id: asNonEmptyString(row.ID) || `line-${index}`,
        productId,
        name: asNonEmptyString(row.Product?.Name) || productId,
        quantity: asFiniteNumber(row.Quantity) || 1,
        unitPrice: asFiniteNumber(row.UnitPrice),
      },
    ];
  });
};

export const toCommerceCart = (
  order: OrderCloudCart,
  lineItems: unknown = [],
): CommerceCart => {
  if (
    order.Status !== undefined &&
    order.Status !== null &&
    order.Status !== "Unsubmitted"
  ) {
    throw new Error("OrderCloud cart response was not an unsubmitted order");
  }

  const id = asNonEmptyString(order.ID);
  return {
    ...(id ? { id } : {}),
    status: "Unsubmitted",
    currency: asNonEmptyString(order.Currency),
    subtotal: asFiniteNumber(order.Subtotal),
    taxCost: asFiniteNumber(order.TaxCost),
    total: asFiniteNumber(order.Total),
    isCalculated: order.IsCalculated === true,
    items: toCommerceCartItems(lineItems),
  };
};

export type { OrderCloudCart };
