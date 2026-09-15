export const CHECKOUT_ORDER_ID_STORAGE_KEY = "oc-checkout-order-id";

export type GatewayCheckoutStatus = "Pending" | "Completed" | "Failed";

export const toGatewayCheckoutStatus = (value: unknown): GatewayCheckoutStatus => {
  if (typeof value !== "string") return "Pending";
  const normalized = value.trim().toLowerCase();
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  return "Pending";
};

export const isTerminalCheckoutStatus = (value: unknown): boolean => {
  const status = toGatewayCheckoutStatus(value);
  return status === "Completed" || status === "Failed";
};
