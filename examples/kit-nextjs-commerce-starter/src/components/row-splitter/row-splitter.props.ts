import { ComponentProps } from "@/lib/component-props";

export type RowNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type RowStyles = {
  [K in RowNumber as `Styles${K}`]?: string;
};

export interface RowSplitterProps extends ComponentProps {
  params: ComponentProps["params"] & RowStyles;
}
