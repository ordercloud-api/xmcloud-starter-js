export const CART_HREF_DEFAULT = "/cart";

const GUID_PATTERN =
  /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i;

const CART_PAGE_PARAM_KEYS = ["cartpage", "cart page", "cart_page"];
const SHOW_CART_LINK_PARAM_KEYS = [
  "showcartlink",
  "show cart link",
  "show_cart_link",
];

export type CartDestination = {
  href: string;
  id?: string;
};

type LayoutComponent = {
  componentName?: string;
  params?: Record<string, unknown>;
  placeholders?: Record<string, unknown>;
};

type LayoutRoute = {
  name?: string;
  displayName?: string;
  itemPath?: string;
  placeholders?: Record<string, unknown>;
};

export const isItemId = (value: string): boolean =>
  GUID_PATTERN.test(value.trim());

export const normalizeItemId = (value: string): string =>
  value.trim().replace(/[{}]/g, "").toLowerCase();

const stripLocalePrefix = (path: string): string => {
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return path;
  const maybeLocale = segments[0];
  if (/^[a-z]{2}(-[a-z]{2})?$/i.test(maybeLocale)) {
    return `/${segments.slice(1).join("/")}`;
  }
  return path;
};

export const normalizeCartPath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return CART_HREF_DEFAULT;

  const withoutHash = trimmed.split("#")[0] ?? trimmed;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, "/");
  const withoutTrailing =
    collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
  return stripLocalePrefix(withoutTrailing).toLowerCase() || CART_HREF_DEFAULT;
};

export const lastPathSegment = (path: string): string => {
  const segments = normalizeCartPath(path).split("/").filter(Boolean);
  return segments.at(-1) ?? "";
};

const readParamValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseQueryBag = (raw: string): Record<string, string> => {
  const bag: Record<string, string> = {};
  const query = raw.startsWith("?") ? raw.slice(1) : raw;
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const key = (
      separator === -1 ? pair : pair.slice(0, separator)
    ).trim();
    const value = (
      separator === -1 ? "" : pair.slice(separator + 1)
    ).trim();
    if (!key) continue;
    try {
      bag[decodeURIComponent(key)] = decodeURIComponent(value);
    } catch {
      bag[key] = value;
    }
  }
  return bag;
};

const valueFromParams = (
  params?: Record<string, unknown>,
  keys: string[] = CART_PAGE_PARAM_KEYS,
  options: { allowEmpty?: boolean } = {},
): string | undefined => {
  if (!params) return undefined;

  for (const [key, value] of Object.entries(params)) {
    if (keys.includes(key.trim().toLowerCase())) {
      if (options.allowEmpty && typeof value === "string") {
        return value.trim();
      }
      const parsed = readParamValue(value);
      if (parsed) return parsed;
    }
  }

  const rawParameters = readParamValue(params.Parameters ?? params.parameters);
  if (rawParameters) {
    if (rawParameters.includes("=")) {
      const bag = parseQueryBag(rawParameters);
      for (const [key, value] of Object.entries(bag)) {
        if (!keys.includes(key.trim().toLowerCase())) continue;
        if (options.allowEmpty) return value;
        if (value) return value;
      }
    }
  }

  return undefined;
};

export const getCartDestination = (
  params?: Record<string, unknown>,
): CartDestination => {
  const raw = valueFromParams(params);
  if (!raw) return { href: CART_HREF_DEFAULT };
  if (isItemId(raw)) return { href: CART_HREF_DEFAULT, id: normalizeItemId(raw) };
  return { href: normalizeCartPath(raw) };
};

export const resolveCartButtonDestination = (
  params?: Record<string, unknown>,
  route?: LayoutRoute | null,
): CartDestination => {
  if (valueFromParams(params)) return getCartDestination(params);
  return getCartDestinationFromRoute(route);
};

const isCheckboxTrue = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true";
};

const isCheckboxFalse = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false";
};

export const isShowCartLinkEnabled = (
  params?: Record<string, unknown>,
): boolean => {
  const raw = valueFromParams(params, SHOW_CART_LINK_PARAM_KEYS, {
    allowEmpty: true,
  });
  if (raw === undefined || raw === "") return true;
  if (isCheckboxFalse(raw)) return false;
  if (isCheckboxTrue(raw)) return true;
  return true;
};

export const isCartHref = (
  href: string | undefined,
  destination: CartDestination,
): boolean => {
  if (!href?.trim()) return false;
  return normalizeCartPath(href) === normalizeCartPath(destination.href);
};

export const isCartNavItem = (
  item: { Id?: string; Href?: string },
  destination: CartDestination,
): boolean => {
  if (destination.id && item.Id && normalizeItemId(item.Id) === destination.id) {
    return true;
  }
  return isCartHref(item.Href, destination);
};

export const partitionNavigationItems = <
  T extends { Id?: string; Href?: string },
>(
  items: T[],
  destination: CartDestination,
): { primary: T[]; cart?: T } => {
  const cartIndex = items.findIndex((item) => isCartNavItem(item, destination));
  if (cartIndex < 0) return { primary: items };
  return {
    primary: items.filter((_, index) => index !== cartIndex),
    cart: items[cartIndex],
  };
};

const walkComponents = (
  placeholders?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!placeholders) return undefined;

  for (const value of Object.values(placeholders)) {
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const component = entry as LayoutComponent;
      if (component.componentName === "Navigation" && component.params) {
        return component.params;
      }
      const nested = walkComponents(component.placeholders);
      if (nested) return nested;
    }
  }

  return undefined;
};

export const getCartDestinationFromRoute = (
  route?: LayoutRoute | null,
): CartDestination => getCartDestination(walkComponents(route?.placeholders));

export const isCartRoute = (
  route?: LayoutRoute | null,
  destination: CartDestination = { href: CART_HREF_DEFAULT },
): boolean => {
  if (!route) return false;

  const labels = [route.name, route.displayName]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase());
  if (labels.includes("cart") || labels.includes("shopping cart")) return true;

  const path = typeof route.itemPath === "string" ? route.itemPath.trim() : "";
  if (!path) return false;

  const destinationSegment = lastPathSegment(destination.href);
  if (!destinationSegment) return false;
  return lastPathSegment(path) === destinationSegment;
};
