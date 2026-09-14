import type { RichTextField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export type PageContentFields = {
  Content?: RichTextField;
};

export type PageContentProps = ComponentProps & {
  fields?: PageContentFields;
};
