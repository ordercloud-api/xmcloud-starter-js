import { lastPathSegment } from "./commerce/cart/destination";

export { isCartRoute } from "./commerce/cart/destination";

type LayoutRoute = {
  name?: string;
  displayName?: string;
  itemPath?: string;
  placeholders?: Record<string, unknown>;
};

export const isHomeRoute = (route?: LayoutRoute | null): boolean => {
  if (!route) return false;

  const labels = [route.name, route.displayName]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
  if (labels.includes("home")) return true;

  const path = typeof route.itemPath === "string" ? route.itemPath.trim() : "";
  if (!path || path === "/") return path === "/";
  return lastPathSegment(path) === "home";
};

export const isPlaceholderEmpty = (
  route: LayoutRoute | null | undefined,
  placeholderName: string,
): boolean => {
  const items = route?.placeholders?.[placeholderName];
  return !Array.isArray(items) || items.length === 0;
};
