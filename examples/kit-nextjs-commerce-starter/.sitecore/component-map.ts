// Below are built-in components that are available in the app, it's recommended to keep them as is
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCServerWrapper, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as Title from 'src/components/title/Title';
import * as SpecForm from 'src/components/spec-form/SpecForm';
import * as RichText from 'src/components/rich-text/RichText';
import * as Promo from 'src/components/promo/Promo';
import * as ProductListing from 'src/components/product-listing/ProductListing';
import * as ProductInfo from 'src/components/product-info/ProductInfo';
import * as ProductContainer from 'src/components/product-container/ProductContainer';
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
import * as PageContent from 'src/components/page-content/PageContent';
import * as Navigation from 'src/components/navigation/Navigation';
import * as Image from 'src/components/image/Image';
import * as Container from 'src/components/container/Container';
import * as Cart from 'src/components/cart/Cart';
import * as AddToCart from 'src/components/add-to-cart/AddToCart';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['Title', { ...Title }],
  ['SpecForm', { ...SpecForm, componentType: 'client' }],
  ['RichText', { ...RichText }],
  ['Promo', { ...Promo }],
  ['ProductListing', { ...ProductListing }],
  ['ProductInfo', { ...ProductInfo, componentType: 'client' }],
  ['ProductContainer', { ...ProductContainer }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['PageContent', { ...PageContent }],
  ['Navigation', { ...Navigation, componentType: 'client' }],
  ['Image', { ...Image }],
  ['Container', { ...Container }],
  ['Cart', { ...Cart, componentType: 'client' }],
  ['AddToCart', { ...AddToCart, componentType: 'client' }],
]);

export default componentMap;
