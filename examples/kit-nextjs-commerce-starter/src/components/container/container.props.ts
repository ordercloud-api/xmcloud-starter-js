import type { ComponentProps } from '@/lib/component-props';

export type ContainerProps = ComponentProps & {
  params: ComponentProps['params'] & {
    DynamicPlaceholderId?: string;
  };
};
