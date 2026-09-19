import type { ReactNode } from "react";
import FeaturedProductsRail from "./FeaturedProductsRail";

type FeaturedProductsSectionProps = {
  componentName: string;
  detailPageHref: string;
  header?: ReactNode;
  isAuthoring: boolean;
  maxProductsPerRow: number;
  productIds: string[];
  renderingIdentifier?: string;
  styles?: string;
};

export default function FeaturedProductsSection({
  componentName,
  detailPageHref,
  header,
  isAuthoring,
  maxProductsPerRow,
  productIds,
  renderingIdentifier,
  styles,
}: FeaturedProductsSectionProps) {
  return (
    <section
      className={`component featured-products space-y-5 ${styles ?? ""}`}
      id={renderingIdentifier}
      data-component={componentName}
      data-class-change
    >
      <FeaturedProductsRail
        detailPageHref={detailPageHref}
        header={header}
        isAuthoring={isAuthoring}
        maxProductsPerRow={maxProductsPerRow}
        productIds={productIds}
      />
    </section>
  );
}
