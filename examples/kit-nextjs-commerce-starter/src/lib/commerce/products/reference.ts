import { asNonEmptyString } from "../normalization";

export type ProductSource = "last-url-segment" | "ordercloud-picker";

export type ProductReference = {
  id: string;
};

export const parseProductReference = (
  value: unknown,
): ProductReference | undefined => {
  const id = asNonEmptyString(value, { trim: true });
  if (!id || id.startsWith("{") || id.startsWith("[")) return undefined;
  return { id };
};

export const normalizeProductSource = (
  value: unknown,
): ProductSource | undefined => {
  const source = asNonEmptyString(value, { trim: true })?.toLowerCase();
  if (source?.includes("picker")) return "ordercloud-picker";
  if (source?.includes("url")) return "last-url-segment";
  return undefined;
};

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
};

export const isSitecoreWildcardSegment = (segment: string): boolean =>
  segment === "*" || segment === ",-w-,";

export const resolveProductId = ({
  source,
  routePath,
  selectedProduct,
  previewProduct,
  isAuthoring,
}: {
  source?: ProductSource;
  routePath: string[];
  selectedProduct?: ProductReference;
  previewProduct?: ProductReference;
  isAuthoring: boolean;
}): string | undefined => {
  if (source === "ordercloud-picker") return selectedProduct?.id;
  if (source !== "last-url-segment") return undefined;

  const lastSegment = routePath.length
    ? decodeSegment(routePath[routePath.length - 1])
    : "";
  const hasConcreteRouteProduct = Boolean(
    lastSegment && !isSitecoreWildcardSegment(lastSegment),
  );
  if (hasConcreteRouteProduct) return lastSegment;
  return isAuthoring ? previewProduct?.id : undefined;
};

export const serializeProductReference = (
  reference: ProductReference,
): string => reference.id;
