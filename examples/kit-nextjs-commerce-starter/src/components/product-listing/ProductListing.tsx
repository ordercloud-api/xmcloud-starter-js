import type React from 'react';
import { Image, Link, Text } from '@sitecore-content-sdk/nextjs';
import type { Field, LinkField } from '@sitecore-content-sdk/nextjs';
import { buildProductDetailHref } from '@/lib/commerce/products/href';
import {
  normalizeProductListSource,
  parseProductReferenceList,
  resolveProductListSource,
} from '@/lib/commerce/products/list-source';
import OrderCloudProductList from '@/components/commerce/OrderCloudProductList';
import {
  getFieldValue,
  getNamedField,
  getProductListingDatasource,
  type ProductListingProps,
  type ProductListingSitecoreProduct,
} from './product-listing.props';

const hasTextValue = (field?: Field<string>): boolean => {
  const value = (field as { value?: unknown } | undefined)?.value;
  return typeof value === 'string' && value.trim().length > 0;
};

const hasLinkValue = (field?: LinkField): boolean => {
  const value = (field as { value?: { href?: string; text?: string } | undefined })?.value;
  return Boolean(value?.href || value?.text);
};

const getLinkHref = (field?: LinkField): string | undefined => {
  const value = (field as { value?: { href?: string } } | undefined)?.value;
  const href = value?.href;
  return typeof href === 'string' && href.trim() ? href.trim() : undefined;
};

const getParamHref = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const ProductCard: React.FC<{ product: ProductListingSitecoreProduct; href?: string }> = ({
  product,
  href,
}) => {
  const content = (
    <>
      <div className="aspect-square overflow-hidden rounded bg-slate-100">
        {product.productThumbnail?.jsonValue && (
          <Image
            field={product.productThumbnail.jsonValue}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="space-y-0.5">
        {product.productName?.jsonValue && (
          <Text field={product.productName.jsonValue} tag="h3" className="line-clamp-2 text-sm font-medium leading-tight" />
        )}

        {product.productBasePrice?.jsonValue && (
          <p className="text-emerald-700 text-xs font-semibold">
            <Text field={product.productBasePrice.jsonValue} />
          </p>
        )}

        {product.productFeatureTitle?.jsonValue && (
          <Text field={product.productFeatureTitle.jsonValue} tag="p" className="line-clamp-1 text-xs font-medium" />
        )}

        {product.productFeatureText?.jsonValue && (
          <Text
            field={product.productFeatureText.jsonValue}
            tag="p"
            className="text-muted-foreground line-clamp-2 text-xs"
          />
        )}
      </div>
    </>
  );

  const className = 'space-y-2 rounded-md border p-2';

  if (href) {
    return (
      <a href={href} className={`block ${className} hover:border-slate-400`}>
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
};

export const Default: React.FC<ProductListingProps> = ({ fields, rendering, params, page }) => {
  const hasExplicitDatasource = Boolean(rendering.dataSource?.trim());
  const datasource = getProductListingDatasource(fields);
  const products = datasource.products?.targetItems ?? [];
  const hasSitecoreProducts = hasExplicitDatasource && products.length > 0;
  const title = hasExplicitDatasource ? datasource.title?.jsonValue : undefined;
  const viewAllLink = hasExplicitDatasource ? datasource.viewAllLink?.jsonValue : undefined;
  const isAuthoring = Boolean(page.mode.isEditing || page.mode.isDesignLibrary);
  const configuredSource =
    (hasExplicitDatasource
      ? normalizeProductListSource(
          getFieldValue(
            getNamedField(datasource, [
              'productListSource',
              'ProductListSource',
              'Product List Source',
            ]),
          ),
        )
      : undefined) ??
    normalizeProductListSource(params.productListSource) ??
    normalizeProductListSource(params.ProductListSource);
  const listSource = resolveProductListSource({
    configured: configuredSource,
    hasSitecoreProducts,
  });
  const selectedProducts = parseProductReferenceList(
    getFieldValue(
      getNamedField(datasource, [
        'orderCloudProducts',
        'OrderCloudProducts',
        'productIds',
        'Product IDs',
      ]),
    ),
  );
  const detailPageHref =
    getLinkHref(datasource.detailPage?.jsonValue) ??
    getLinkHref(datasource.productDetailPage?.jsonValue) ??
    getLinkHref(datasource['Detail Page']?.jsonValue) ??
    getParamHref(params.detailPage) ??
    getParamHref(params.DetailPage);
  const showCatalogFallbackHint =
    listSource === 'ordercloud-catalog' &&
    hasExplicitDatasource &&
    !hasSitecoreProducts &&
    !configuredSource;

  return (
    <section className="space-y-4" data-component="ProductListing">
      {title && hasTextValue(title) && (
        <Text field={title} tag="h2" className="text-2xl font-semibold" />
      )}

      {listSource === 'sitecore' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {hasSitecoreProducts ? (
            products.map((product, index) => (
              <ProductCard
                key={product.id || `product-${index}`}
                product={product}
                href={
                  isAuthoring
                    ? undefined
                    : product.url?.path ?? buildProductDetailHref(detailPageHref, product.id)
                }
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              {isAuthoring
                ? 'Add Sitecore products to the listing datasource, or switch Product List Source to OrderCloud.'
                : 'No products configured.'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {showCatalogFallbackHint && (
            <p className="text-muted-foreground text-sm">
              No Sitecore products configured in datasource. Showing live products instead.
            </p>
          )}
          <OrderCloudProductList
            title={
              listSource === 'ordercloud-picker'
                ? 'Selected OrderCloud products'
                : 'Live OrderCloud products'
            }
            compact
            source={listSource}
            productIds={selectedProducts.map((product) => product.id)}
            detailPageHref={detailPageHref}
            isAuthoring={isAuthoring}
          />
        </div>
      )}

      {viewAllLink && hasLinkValue(viewAllLink) && (
        <div>
          <Link field={viewAllLink} className="text-sm font-semibold underline" />
        </div>
      )}
    </section>
  );
};

export const ThreeUp: React.FC<ProductListingProps> = (props) => <Default {...props} />;
export const Slider: React.FC<ProductListingProps> = (props) => <Default {...props} />;
