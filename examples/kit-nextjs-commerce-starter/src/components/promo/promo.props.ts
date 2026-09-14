import type { Field, ImageField, LinkField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export type PromoFields = {
  PromoIcon?: ImageField;
  PromoText?: Field<string>;
  PromoText2?: Field<string>;
  PromoText3?: Field<string>;
  PromoLink?: LinkField;
};

export type PromoProps = ComponentProps & {
  fields?: PromoFields;
};
