import { JSX } from "react";
import { AppPlaceholder } from "@sitecore-content-sdk/nextjs";
import componentMap from ".sitecore/component-map";
import { RowNumber, RowSplitterProps } from "./row-splitter.props";

export const Default = ({
  params,
  rendering,
  page,
}: RowSplitterProps): JSX.Element => {
  const enabledRows =
    params.EnabledPlaceholders?.split(",").filter(Boolean) ?? [];

  return (
    <section
      className={`component row-splitter ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
    >
      {enabledRows.map((rowNum) => {
        const num = Number(rowNum) as RowNumber;
        const rowStyles = params[`Styles${num}`] ?? "";

        return (
          <section
            key={rowNum}
            className={`container-fluid ${rowStyles}`.trim()}
          >
            <div className="row">
              <AppPlaceholder
                name={`row-${rowNum}-{*}`}
                rendering={rendering}
                page={page}
                componentMap={componentMap}
              />
            </div>
          </section>
        );
      })}
    </section>
  );
};
