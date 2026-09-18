export { isCartRoute } from "./commerce/cart/destination";

type LayoutRoute = {
  name?: string;
  displayName?: string;
  itemPath?: string;
  placeholders?: Record<string, unknown>;
};

export const isPlaceholderEmpty = (
  route: LayoutRoute | null | undefined,
  placeholderName: string,
): boolean => {
  const items = route?.placeholders?.[placeholderName];
  return !Array.isArray(items) || items.length === 0;
};
