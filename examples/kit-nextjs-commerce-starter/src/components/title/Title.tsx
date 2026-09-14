import type React from 'react';
import { Text, type TextField } from '@sitecore-content-sdk/nextjs';
import type { TitleProps } from './title.props';

const hasValue = (field?: TextField): boolean =>
  typeof field?.value === 'string' && field.value.trim().length > 0;

export const Default: React.FC<TitleProps> = ({ fields, params, page }) => {
  const datasource = fields?.data?.datasource ?? fields?.data?.contextItem;
  const field =
    datasource?.field?.jsonValue ??
    fields?.Title ??
    fields?.field ??
    (page.layout.sitecore.route?.fields?.Title as TextField | undefined) ??
    (page.layout.sitecore.route?.fields?.pageTitle as TextField | undefined);
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!hasValue(field) && !isAuthoring) return null;

  return (
    <div
      className={`component title ${params.styles ?? ''}`}
      id={params.RenderingIdentifier}
      data-component="Title"
      data-class-change
    >
      <div className="component-content">
        <h1 className="field-title text-4xl font-semibold tracking-tight">
          {field ? <Text field={field} /> : 'Title'}
        </h1>
      </div>
    </div>
  );
};
