import type { ComponentProps } from "@/lib/component-props";

export type CartButtonProps = ComponentProps & {
  params: ComponentProps["params"] & {
    ShowCartLink?: string;
    CartPage?: string;
    Parameters?: string;
  };
};
