import { asNonEmptyString } from "../normalization";
import {
  parseProductReference,
  type ProductReference,
} from "./reference";

export type ProductListSource =
  | "ordercloud-catalog"
  | "ordercloud-picker"
  | "sitecore";

export type ProductListPresentation = "catalog" | "featured";

export const FEATURED_PRODUCT_LIMIT = 3;
export const CATALOG_LIST_HREF = "/products";

export const limitItems = <T>(items: T[], limit?: number): T[] => {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return items;
  }
  return items.slice(0, limit);
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export const normalizeProductListSource = (
  value: unknown,
): ProductListSource | undefined => {
  const source = asNonEmptyString(value, { trim: true })?.toLowerCase();
  if (!source) return undefined;
  if (source.includes("picker")) return "ordercloud-picker";
  if (
    source.includes("sitecore") ||
    source.includes("treelist") ||
    source.includes("cms")
  ) {
    return "sitecore";
  }
  if (source.includes("catalog") || source.includes("ordercloud")) {
    return "ordercloud-catalog";
  }
  return undefined;
};

export const parseProductReferenceList = (
  value: unknown,
): ProductReference[] => {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const parsed = parseProductReference(item);
      return parsed ? [parsed] : [];
    });
  }

  const record = asRecord(value);
  if (record) {
    if (Array.isArray(record.targetItems)) {
      return parseProductReferenceList(record.targetItems);
    }
    if (Array.isArray(record.items)) {
      return parseProductReferenceList(record.items);
    }
    if (Array.isArray(record.products)) {
      return parseProductReferenceList(record.products);
    }

    const single = parseProductReference(value);
    return single ? [single] : [];
  }

  const text = asNonEmptyString(value, { trim: true });
  if (!text) return [];

  try {
    return parseProductReferenceList(JSON.parse(text) as unknown);
  } catch {
    return text.split(/[,;\n]+/).flatMap((part) => {
      const parsed = parseProductReference(part);
      return parsed ? [parsed] : [];
    });
  }
};

export const serializeProductReferenceList = (
  references: ProductReference[],
): string => JSON.stringify(references);

export const resolveProductListSource = ({
  configured,
  hasSitecoreProducts,
}: {
  configured?: ProductListSource;
  hasSitecoreProducts: boolean;
}): ProductListSource => {
  if (configured) return configured;
  if (hasSitecoreProducts) return "sitecore";
  return "ordercloud-catalog";
};
