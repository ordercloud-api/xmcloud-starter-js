import { JSX } from "react";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import { ColumnNumber, ColumnSplitterProps } from "./column-splitter.props";

export const Default = ({
  params,
  rendering,
  page,
}: ColumnSplitterProps): JSX.Element => {
  const { EnabledPlaceholders, RenderingIdentifier: id, styles } = params;
  const enabledColumns = EnabledPlaceholders?.split(",").filter(Boolean) ?? [];

  return (
    <section
      className={`row component column-splitter ${styles ?? ""}`}
      id={id}
    >
      {enabledColumns.map((columnNum) => {
        const num = Number(columnNum) as ColumnNumber;
        const columnWidth = params[`ColumnWidth${num}`] ?? "";
        const columnStyle = params[`Styles${num}`] ?? "";

        return (
          <div
            key={columnNum}
            className={`${columnWidth} ${columnStyle}`.trim()}
          >
            <div className="row">
              <AppPlaceholder
                name={`column-${columnNum}-{*}`}
                rendering={rendering}
                page={page}
                componentMap={componentMap}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
};
