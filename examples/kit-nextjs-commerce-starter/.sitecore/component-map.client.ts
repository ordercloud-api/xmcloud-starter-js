// Client-safe component map for App Router
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCClientWrapper, FEaaSClientWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as ProductInfo from 'src/components/product-info/ProductInfo';
import * as ProductForm from 'src/components/product-form/ProductForm';
import * as Navigation from 'src/components/navigation/Navigation';
import * as AddToCart from 'src/components/add-to-cart/AddToCart';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCClientWrapper],
  ['FEaaSWrapper', FEaaSClientWrapper],
  ['Form', Form],
  ['ProductInfo', { ...ProductInfo }],
  ['ProductForm', { ...ProductForm }],
  ['Navigation', { ...Navigation }],
  ['AddToCart', { ...AddToCart }],
]);

export default componentMap;
