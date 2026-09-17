// Below are built-in components that are available in the app, it's recommended to keep them as is
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCServerWrapper, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as Title from 'src/components/title/Title';
import * as SpecForm from 'src/components/spec-form/SpecForm';
import * as ShoppingCart from 'src/components/shopping-cart/ShoppingCart';
import * as RowSplitter from 'src/components/row-splitter/RowSplitter';
import * as RichText from 'src/components/rich-text/RichText';
import * as Promo from 'src/components/promo/Promo';
import * as ProductListing from 'src/components/product-listing/ProductListing';
import * as ProductInfo from 'src/components/product-info/ProductInfo';
import * as ProductImageGallery from 'src/components/product-image-gallery/ProductImageGallery';
import * as ProductContainer from 'src/components/product-container/ProductContainer';
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
import * as PageContent from 'src/components/page-content/PageContent';
import * as Navigation from 'src/components/navigation/Navigation';
import * as LinkList from 'src/components/link-list/LinkList';
import * as Image from 'src/components/image/Image';
import * as Container from 'src/components/container/Container';
import * as ColumnSplitter from 'src/components/column-splitter/ColumnSplitter';
import * as AddToCart from 'src/components/add-to-cart/AddToCart';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['Title', { ...Title }],
  ['SpecForm', { ...SpecForm, componentType: 'client' }],
  ['ShoppingCart', { ...ShoppingCart, componentType: 'client' }],
  ['RowSplitter', { ...RowSplitter }],
  ['RichText', { ...RichText }],
  ['Promo', { ...Promo }],
  ['ProductListing', { ...ProductListing }],
  ['ProductInfo', { ...ProductInfo, componentType: 'client' }],
  ['ProductImageGallery', { ...ProductImageGallery, componentType: 'client' }],
  ['ProductContainer', { ...ProductContainer }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['PageContent', { ...PageContent }],
  ['Navigation', { ...Navigation }],
  ['LinkList', { ...LinkList }],
  ['Image', { ...Image }],
  ['Container', { ...Container }],
  ['ColumnSplitter', { ...ColumnSplitter }],
  ['AddToCart', { ...AddToCart, componentType: 'client' }],
]);

export default componentMap;
