// Below are built-in components that are available in the app, it's recommended to keep them as is
import { NextjsContentSdkComponent } from '@sitecore-content-sdk/nextjs';


import { BYOCServerWrapper, FEaaSServerWrapper } from '@sitecore-content-sdk/nextjs';
import { Form } from '@sitecore-content-sdk/nextjs';

// end of built-in import section
import * as RichText from 'src/components/rich-text/RichText';
import * as ProductListing from 'src/components/product-listing/ProductListing';
import * as PartialDesignDynamicPlaceholder from 'src/components/partial-design-dynamic-placeholder/PartialDesignDynamicPlaceholder';
import * as Navigation from 'src/components/navigation/Navigation';
import * as Image from 'src/components/image/Image';
import * as Container from 'src/components/container/Container';

export const componentMap = new Map<string, NextjsContentSdkComponent>([
  ['BYOCWrapper', BYOCServerWrapper],
  ['FEaaSWrapper', FEaaSServerWrapper],
  ['Form', { ...Form, componentType: 'client' }],
  ['RichText', { ...RichText }],
  ['ProductListing', { ...ProductListing }],
  ['PartialDesignDynamicPlaceholder', { ...PartialDesignDynamicPlaceholder }],
  ['Navigation', { ...Navigation, componentType: 'client' }],
  ['Image', { ...Image }],
  ['Container', { ...Container }],
]);

export default componentMap;
