import { asNonEmptyString } from "../normalization";
import { parseProductReference, type ProductReference } from "./reference";

export const CATALOG_LIST_HREF = "/products";

export const parseProductReferenceList = (
  value: unknown,
): ProductReference[] => {
  const text = asNonEmptyString(value, { trim: true });
  if (!text || text.startsWith("[") || text.startsWith("{")) return [];

  return text.split(/\r?\n/).flatMap((line) => {
    const parsed = parseProductReference(line);
    return parsed ? [parsed] : [];
  });
};

export const serializeProductReferenceList = (
  references: ProductReference[],
): string => references.map((reference) => reference.id).join("\n");
