import type { TextField } from '@sitecore-content-sdk/nextjs';
import type { ComponentProps } from '@/lib/component-props';

type TitleDatasource = {
  url?: {
    path?: string;
  };
  field?: {
    jsonValue?: TextField;
  };
};

export type TitleFields = {
  Title?: TextField;
  field?: TextField;
  data?: {
    datasource?: TitleDatasource;
    contextItem?: TitleDatasource;
  };
};

export type TitleProps = ComponentProps & {
  fields?: TitleFields;
};
