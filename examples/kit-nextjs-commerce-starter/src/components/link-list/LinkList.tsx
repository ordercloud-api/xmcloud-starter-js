import type { JSX } from "react";
import { Link, Text, type LinkField } from "@sitecore-content-sdk/nextjs";
import type { LinkListProps } from "./link-list.props";

type LinkListItemProps = {
  field: LinkField;
  index: number;
  total: number;
};

const LinkListItem = ({
  field,
  index,
  total,
}: LinkListItemProps): JSX.Element => {
  const className = [
    `item${index}`,
    index % 2 === 0 ? "odd" : "even",
    index === 0 ? "first" : "",
    index === total - 1 ? "last" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className}>
      <Link
        field={field}
        className="inline-block py-2 text-sm hover:underline"
        prefetch={false}
      />
    </li>
  );
};

export const Default = ({
  params,
  fields,
  page,
}: LinkListProps): JSX.Element | null => {
  const datasource = fields?.data?.datasource;
  const results = datasource?.children?.results ?? [];
  const links = results.flatMap((item, index) => {
    const field = item.field?.link;

    return field
      ? [
          <LinkListItem
            key={index}
            field={field}
            index={index}
            total={results.length}
          />,
        ]
      : [];
  });
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!datasource && !isAuthoring) return null;

  return (
    <nav
      className={`component link-list ${params.styles ?? ""}`}
      id={params.RenderingIdentifier}
      data-component="LinkList"
      data-class-change
      aria-label="Related links"
    >
      <div className="component-content">
        {datasource?.field?.title ? (
          <Text
            tag="h3"
            field={datasource.field.title}
            className="mb-3 text-lg font-semibold"
          />
        ) : (
          isAuthoring && (
            <h3 className="mb-3 text-lg font-semibold">Link List</h3>
          )
        )}
        <ul>{links}</ul>
      </div>
    </nav>
  );
};
