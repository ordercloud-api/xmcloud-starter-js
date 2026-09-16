type LayoutRoute = {
  name?: string;
  displayName?: string;
  itemPath?: string;
  placeholders?: Record<string, unknown>;
};

const lastPathSegment = (path: string): string => {
  const segments = path.split("/").filter((segment) => segment.length > 0);
  return segments.at(-1)?.toLowerCase() ?? "";
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

export const isCartRoute = (route?: LayoutRoute | null): boolean => {
  if (!route) return false;

  const labels = [route.name, route.displayName]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
  if (labels.includes("cart") || labels.includes("shopping cart")) return true;

  const path = typeof route.itemPath === "string" ? route.itemPath.trim() : "";
  return lastPathSegment(path) === "cart";
};

export const isPlaceholderEmpty = (
  route: LayoutRoute | null | undefined,
  placeholderName: string,
): boolean => {
  const items = route?.placeholders?.[placeholderName];
  return !Array.isArray(items) || items.length === 0;
};
