import { asNonEmptyString } from "../normalization";

export type ProductSource = "last-url-segment" | "ordercloud-picker";

export type ProductReference = {
  id: string;
  name?: string;
};

export const parseProductReference = (
  value: unknown,
): ProductReference | undefined => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const id =
      asNonEmptyString(record.id, { trim: true }) ??
      asNonEmptyString(record.productId, { trim: true }) ??
      asNonEmptyString(record.ID, { trim: true });
    if (!id) return undefined;
    return {
      id,
      name:
        asNonEmptyString(record.name, { trim: true }) ??
        asNonEmptyString(record.Name, { trim: true }),
    };
  }

  const text = asNonEmptyString(value, { trim: true });
  if (!text) return undefined;

  try {
    return parseProductReference(JSON.parse(text) as unknown);
  } catch {
    // Plain string values keep existing data usable while the picker writes JSON references.
    return { id: text };
  }
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

const isSitecoreWildcardSegment = (segment: string): boolean =>
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
): string => JSON.stringify({ id: reference.id, name: reference.name });
