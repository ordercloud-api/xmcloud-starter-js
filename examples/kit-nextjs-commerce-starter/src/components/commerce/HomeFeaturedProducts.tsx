'use client';

import {
  CATALOG_LIST_HREF,
  FEATURED_PRODUCT_LIMIT,
} from '@/lib/commerce/products/list-source';
import OrderCloudProductList from './OrderCloudProductList';

export default function HomeFeaturedProducts() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10" data-component="HomeFeaturedProducts">
      <OrderCloudProductList
        presentation="featured"
        title="Featured"
        source="ordercloud-catalog"
        limit={FEATURED_PRODUCT_LIMIT}
        viewAllHref={CATALOG_LIST_HREF}
        viewAllLabel="Shop all products"
        detailPageHref={CATALOG_LIST_HREF}
      />
    </section>
  );
}
