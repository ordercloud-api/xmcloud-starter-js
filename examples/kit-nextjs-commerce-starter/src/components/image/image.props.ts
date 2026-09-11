import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export interface ImageFields {
  Image?: ImageField;
  ImageCaption?: Field<string>;
  TargetUrl?: LinkField;
}

export type ImageProps = ComponentProps & {
  fields?: ImageFields;
};
