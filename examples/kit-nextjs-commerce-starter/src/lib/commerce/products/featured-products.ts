import type { LinkField, TextField } from "@sitecore-content-sdk/nextjs";
import { parseProductReferenceList } from "./list-source";
import {
  getProductListParam,
  normalizeMaxProductsPerRow,
  normalizeOptionalText,
} from "./product-list-config";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;

const normalizeFieldName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const getDatasource = (fields: unknown): UnknownRecord => {
  const root = asRecord(fields) ?? {};
  const data = asRecord(root.data);
  return asRecord(data?.datasource) ?? root;
};

const getField = (fields: unknown, label: string): unknown => {
  const datasource = getDatasource(fields);
  if (datasource[label] !== undefined) return datasource[label];

  const normalizedLabel = normalizeFieldName(label);
  return Object.entries(datasource).find(
    ([name]) => normalizeFieldName(name) === normalizedLabel,
  )?.[1];
};

const getJsonField = <T>(field: unknown): T | undefined => {
  const record = asRecord(field);
  if (!record) return undefined;
  return (asRecord(record.jsonValue) ?? record) as unknown as T;
};

const getFieldValue = (field: unknown): unknown => {
  const record = asRecord(field);
  if (!record) return field;
  const jsonValue = asRecord(record.jsonValue);
  if (jsonValue && "value" in jsonValue) return jsonValue.value;
  return "value" in record ? record.value : field;
};

export type FeaturedProductsDatasource = Record<string, unknown> & {
  data?: {
    datasource?: Record<string, unknown>;
  };
};

export type FeaturedProductsSettings = {
  detailPageHref: string;
  maxProductsPerRow: number;
};

export const getFeaturedProductIds = (fields: unknown): string[] =>
  parseProductReferenceList(getFieldValue(getField(fields, "Products"))).map(
    (product) => product.id,
  );

export const getFeaturedProductsHeading = (
  fields: unknown,
): TextField | undefined => getJsonField<TextField>(getField(fields, "Heading"));

export const getFeaturedProductsCallToAction = (
  fields: unknown,
): LinkField | undefined =>
  getJsonField<LinkField>(getField(fields, "Call To Action"));

export const getFeaturedProductsSettings = (
  params: Record<string, unknown>,
): FeaturedProductsSettings => ({
  detailPageHref:
    normalizeOptionalText(
      getProductListParam(params, "Product Detail Page Path"),
    ) ?? "/products",
  maxProductsPerRow: normalizeMaxProductsPerRow(
    getProductListParam(params, "Maximum Products Per Row") ?? 4,
  ),
});

export const hasTextValue = (field?: TextField): boolean =>
  typeof field?.value === "string" && field.value.trim().length > 0;

export const hasLinkValue = (field?: LinkField): boolean =>
  typeof field?.value?.href === "string" && field.value.href.trim().length > 0;

export const hasFeaturedProductsCallToAction = (field?: LinkField): boolean =>
  hasLinkValue(field) &&
  typeof field?.value?.text === "string" &&
  field.value.text.trim().length > 0;
