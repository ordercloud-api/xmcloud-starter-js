import type { LinkField, TextField } from "@sitecore-content-sdk/nextjs";
import type { ComponentProps } from "@/lib/component-props";

export type LinkListItem = {
  field?: {
    link?: LinkField;
  };
};

export interface LinkListProps extends ComponentProps {
  fields?: {
    data?: {
      datasource?: {
        children?: {
          results?: LinkListItem[];
        };
        field?: {
          title?: TextField;
        };
      };
    };
  };
}
