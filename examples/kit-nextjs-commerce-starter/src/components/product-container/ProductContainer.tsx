import type React from "react";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import ProductContainerContent from "@/components/commerce/ProductContainerContent";
import {
  normalizeProductSource,
  parseProductReference,
} from "@/lib/commerce/products/reference";
import type { ProductContainerProps } from "./product-container.props";

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const getDatasource = (fields: unknown): Record<string, unknown> => {
  const root = asRecord(fields) ?? {};
  const data = asRecord(root.data);
  return asRecord(data?.datasource) ?? root;
};

const getNamedField = (
  fields: Record<string, unknown>,
  names: string[],
): unknown => {
  for (const name of names) {
    if (fields[name] !== undefined) return fields[name];
  }
  return undefined;
};

const getFieldValue = (field: unknown): unknown => {
  const record = asRecord(field);
  if (!record) return field;
  const jsonValue = asRecord(record.jsonValue);
  if (jsonValue && "value" in jsonValue) return jsonValue.value;
  return "value" in record ? record.value : field;
};

export const Default: React.FC<ProductContainerProps> = ({
  fields,
  params,
  rendering,
  page,
}) => {
  const datasource = getDatasource(fields);
  const source = normalizeProductSource(
    getFieldValue(
      getNamedField(datasource, [
        "productSource",
        "ProductSource",
        "Product Source",
      ]),
    ),
  );
  const selectedProduct = parseProductReference(
    getFieldValue(
      getNamedField(datasource, ["productId", "ProductId", "Product ID"]),
    ),
  );
  const previewProduct = parseProductReference(
    getFieldValue(
      getNamedField(datasource, [
        "previewProductId",
        "PreviewProductId",
        "Preview Product ID",
      ]),
    ),
  );
  const placeholderName = `product-container-${params.DynamicPlaceholderId ?? "0"}`;
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;
  const authoringFieldName =
    source === "ordercloud-picker"
      ? "Product ID"
      : source === "last-url-segment"
        ? "Preview Product ID"
        : undefined;
  const authoringProduct =
    source === "last-url-segment" ? previewProduct : selectedProduct;
  const language = page.layout.sitecore.route?.itemLanguage ?? page.locale;
  const authoringField =
    isAuthoring && authoringFieldName && rendering.dataSource
      ? {
          dataSource: rendering.dataSource,
          fieldName: authoringFieldName,
          helpText:
            source === "last-url-segment"
              ? "The live product comes from the URL. This product is used only to preview the wildcard page while editing."
              : "This product will be be rendered on the live site",
          initialIds: authoringProduct ? [authoringProduct.id] : [],
          language,
          mode: "single" as const,
          title:
            source === "last-url-segment"
              ? "Preview product"
              : "Selected product",
        }
      : undefined;

  return (
    <section
      className={params.styles ?? ""}
      id={params.RenderingIdentifier}
      data-component="ProductContainer"
      data-class-change
    >
      <ProductContainerContent
        source={source}
        selectedProduct={selectedProduct}
        previewProduct={previewProduct}
        isAuthoring={isAuthoring}
        authoringField={authoringField}
      >
        <AppPlaceholder
          name={placeholderName}
          rendering={rendering}
          page={page}
          componentMap={componentMap}
        />
      </ProductContainerContent>
    </section>
  );
};
