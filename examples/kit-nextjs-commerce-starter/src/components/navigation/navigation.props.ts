import type { TextField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

export interface NavigationLinkFields {
  Id: string;
  DisplayName: string;
  Title?: TextField;
  NavigationTitle?: TextField;
  Href?: string;
  Querystring?: string;
  Children?: NavigationLinkFields[];
}

export type NavigationProps = ComponentProps & {
  fields?: Record<string, NavigationLinkFields>;
};
