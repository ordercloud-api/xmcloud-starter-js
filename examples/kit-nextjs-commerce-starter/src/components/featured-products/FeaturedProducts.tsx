import type React from "react";
import { Link, Text } from "@sitecore-content-sdk/nextjs";
import FeaturedProductsSection from "@/components/commerce/FeaturedProductsSection";
import {
  getFeaturedProductIds,
  getFeaturedProductsCallToAction,
  getFeaturedProductsHeading,
  getFeaturedProductsSettings,
  hasFeaturedProductsCallToAction,
  hasTextValue,
} from "@/lib/commerce/products/featured-products";
import type { FeaturedProductsProps } from "./featured-products.props";

export const Default: React.FC<FeaturedProductsProps> = ({
  fields,
  page,
  params,
  rendering,
}) => {
  const heading = getFeaturedProductsHeading(fields);
  const callToAction = getFeaturedProductsCallToAction(fields);
  const productIds = getFeaturedProductIds(fields);
  const settings = getFeaturedProductsSettings(params);
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;
  const showHeading = hasTextValue(heading) || isAuthoring;
  const showCallToAction = hasFeaturedProductsCallToAction(callToAction);
  const language = page.layout.sitecore.route?.itemLanguage ?? page.locale;
  const authoringField =
    isAuthoring && rendering.dataSource
      ? {
          dataSource: rendering.dataSource,
          fieldName: "Products",
          helpText:
            "Choose and order the products displayed in this component.",
          initialIds: productIds,
          language,
          mode: "multiple" as const,
          title: "Featured products",
        }
      : undefined;

  const header =
    showHeading || showCallToAction ? (
      <header className="flex flex-wrap items-end justify-between gap-4">
        {showHeading && (
          <h2 className="text-3xl font-semibold tracking-tight">
            {heading ? <Text field={heading} /> : "Featured Products"}
          </h2>
        )}
        {showCallToAction && callToAction && (
          <Link
            field={callToAction}
            className="font-medium underline underline-offset-4"
          />
        )}
      </header>
    ) : undefined;

  return (
    <FeaturedProductsSection
      componentName="FeaturedProducts"
      authoringField={authoringField}
      detailPageHref={settings.detailPageHref}
      header={header}
      isAuthoring={isAuthoring}
      maxProductsPerRow={settings.maxProductsPerRow}
      productIds={productIds}
      renderingIdentifier={params.RenderingIdentifier}
      styles={params.styles}
    />
  );
};
