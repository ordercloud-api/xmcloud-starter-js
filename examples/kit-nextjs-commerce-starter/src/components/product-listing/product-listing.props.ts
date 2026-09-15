import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

type ProductListingField<T> =
  | T
  | {
      value?: T;
      jsonValue?: {
        value?: T;
      };
    };

export type ProductListingSitecoreProduct = {
  id?: string;
  productName?: { jsonValue?: Field<string> };
  productThumbnail?: { jsonValue?: ImageField };
  productBasePrice?: { jsonValue?: Field<string> };
  productFeatureTitle?: { jsonValue?: Field<string> };
  productFeatureText?: { jsonValue?: Field<string> };
  productDrivingRange?: { jsonValue?: Field<string> };
  url?: {
    path?: string;
  };
};

export type ProductListingDatasource = {
  title?: { jsonValue?: Field<string> };
  viewAllLink?: { jsonValue?: LinkField };
  detailPage?: { jsonValue?: LinkField };
  productDetailPage?: { jsonValue?: LinkField };
  'Detail Page'?: { jsonValue?: LinkField };
  productListSource?: ProductListingField<string>;
  ProductListSource?: ProductListingField<string>;
  'Product List Source'?: ProductListingField<string>;
  orderCloudProducts?: ProductListingField<unknown>;
  OrderCloudProducts?: ProductListingField<unknown>;
  productIds?: ProductListingField<unknown>;
  'Product IDs'?: ProductListingField<unknown>;
  products?: {
    targetItems?: ProductListingSitecoreProduct[];
  };
};

export type ProductListingFields = ProductListingDatasource & {
  data?: {
    datasource?: ProductListingDatasource;
  };
};

export type ProductListingParams = {
  detailPage?: string;
  DetailPage?: string;
  productListSource?: string;
  ProductListSource?: string;
  [key: string]: unknown;
};

export type ProductListingProps = ComponentProps & {
  params: ComponentProps['params'] & ProductListingParams;
  fields?: ProductListingFields;
};

export const getProductListingDatasource = (
  fields: unknown,
): ProductListingDatasource => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  const root = fields as Record<string, unknown>;
  const data =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : undefined;
  const datasource = data?.datasource;
  if (datasource && typeof datasource === 'object' && !Array.isArray(datasource)) {
    return datasource as ProductListingDatasource;
  }
  return root as ProductListingDatasource;
};

export const getNamedField = (
  fields: ProductListingDatasource,
  names: string[],
): unknown => {
  const record = fields as Record<string, unknown>;
  for (const name of names) {
    if (record[name] !== undefined) return record[name];
  }
  return undefined;
};

export const getFieldValue = (field: unknown): unknown => {
  if (!field || typeof field !== 'object' || Array.isArray(field)) return field;
  const record = field as Record<string, unknown>;
  const jsonValue =
    record.jsonValue && typeof record.jsonValue === 'object' && !Array.isArray(record.jsonValue)
      ? (record.jsonValue as Record<string, unknown>)
      : undefined;
  if (jsonValue && 'value' in jsonValue) return jsonValue.value;
  return 'value' in record ? record.value : field;
};
