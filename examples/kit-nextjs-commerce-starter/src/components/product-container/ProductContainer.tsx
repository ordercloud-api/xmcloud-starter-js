import type React from "react";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import { ProductDataProvider } from "@/contexts/ProductDataContext";
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

  return (
    <section
      className={params.styles ?? ""}
      id={params.RenderingIdentifier}
      data-component="ProductContainer"
      data-class-change
    >
      <ProductDataProvider
        source={source}
        selectedProduct={selectedProduct}
        previewProduct={previewProduct}
        isAuthoring={isAuthoring}
      >
        <AppPlaceholder
          name={placeholderName}
          rendering={rendering}
          page={page}
          componentMap={componentMap}
        />
      </ProductDataProvider>
    </section>
  );
};
