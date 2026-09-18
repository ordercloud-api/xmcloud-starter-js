import { asNonEmptyString } from "../normalization";
import { parseProductReference, type ProductReference } from "./reference";

export const CATALOG_LIST_HREF = "/products";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

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
