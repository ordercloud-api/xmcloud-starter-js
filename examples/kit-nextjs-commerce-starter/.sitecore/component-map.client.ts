// Client-safe component map for App Router
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCClientWrapper, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as SpecForm from 'src/components/spec-form/SpecForm';
import * as ShoppingCart from 'src/components/shopping-cart/ShoppingCart';
import * as ProductInfo from 'src/components/product-info/ProductInfo';
import * as ProductImageGallery from 'src/components/product-image-gallery/ProductImageGallery';
import * as AddToCart from 'src/components/add-to-cart/AddToCart';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['SpecForm', { ...SpecForm }],
  ['ShoppingCart', { ...ShoppingCart }],
  ['ProductInfo', { ...ProductInfo }],
  ['ProductImageGallery', { ...ProductImageGallery }],
  ['AddToCart', { ...AddToCart }],
]);

export default componentMap;
