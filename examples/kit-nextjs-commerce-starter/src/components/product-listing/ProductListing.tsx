import type React from 'react';
import { Image, Link, Text } from '@sitecore-content-sdk/nextjs';
import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';
import OrderCloudProductList from '@/components/commerce/OrderCloudProductList';

type ProductListingParams = {
  [key: string]: unknown;
};

type ProductItem = {
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

type ProductListingFields = {
  data?: {
    datasource?: {
      title?: { jsonValue?: Field<string> };
      viewAllLink?: { jsonValue?: LinkField };
      products?: {
        targetItems?: ProductItem[];
      };
    };
  };
};

type ProductListingProps = ComponentProps & {
  params: ProductListingParams;
  fields?: ProductListingFields;
};

const hasTextValue = (field?: Field<string>): boolean => {
  const value = (field as { value?: unknown } | undefined)?.value;
  return typeof value === 'string' && value.trim().length > 0;
};

const hasLinkValue = (field?: LinkField): boolean => {
  const value = (field as { value?: { href?: string; text?: string } } | undefined)?.value;
  return Boolean(value?.href || value?.text);
};

const ProductCard: React.FC<{ product: ProductItem }> = ({ product }) => {
  return (
    <article className="space-y-3 rounded-md border p-4">
      {product.productThumbnail?.jsonValue && (
        <Image field={product.productThumbnail.jsonValue} className="h-40 w-full rounded object-cover" />
      )}

      <div className="space-y-1">
        {product.productName?.jsonValue && (
          <Text field={product.productName.jsonValue} tag="h3" className="text-lg font-semibold" />
        )}

        {product.productBasePrice?.jsonValue && (
          <p className="text-sm font-semibold text-emerald-700">
            Price: <Text field={product.productBasePrice.jsonValue} />
          </p>
        )}

        {product.productFeatureTitle?.jsonValue && (
          <Text field={product.productFeatureTitle.jsonValue} tag="p" className="text-sm font-medium" />
        )}

        {product.productFeatureText?.jsonValue && (
          <Text field={product.productFeatureText.jsonValue} tag="p" className="text-muted-foreground text-sm" />
        )}

        {product.productDrivingRange?.jsonValue && (
          <p className="text-muted-foreground text-xs">
            <Text field={product.productDrivingRange.jsonValue} />
          </p>
        )}

        {product.url?.path && (
          <a href={product.url.path} className="inline-block pt-1 text-sm font-medium underline">
            View details
          </a>
        )}
      </div>
    </article>
  );
};

export const Default: React.FC<ProductListingProps> = ({ fields }) => {
  const datasource = fields?.data?.datasource;
  const products = datasource?.products?.targetItems ?? [];
  const hasDatasourceProducts = products.length > 0;
  const title = datasource?.title?.jsonValue;
  const viewAllLink = datasource?.viewAllLink?.jsonValue;

  if (!datasource) {
    return (
      <section className="space-y-3 rounded-lg border border-dashed p-4 text-sm text-amber-700" data-component="ProductListing">
        <p>ProductListing datasource missing.</p>
        <OrderCloudProductList title="Live OrderCloud products" compact />
      </section>
    );
  }

  return (
    <section className="space-y-4" data-component="ProductListing">
      {title && hasTextValue(title) && (
        <Text field={title} tag="h2" className="text-2xl font-semibold" />
      )}

      {hasDatasourceProducts ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard key={product.id || `product-${index}`} product={product} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">No Sitecore products configured in datasource.</p>
          <OrderCloudProductList title="Live OrderCloud products" compact />
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
