import type React from 'react';
import {
  RichText as ContentSdkRichText,
  type RichTextField,
} from '@sitecore-content-sdk/nextjs';
import type { PageContentProps } from './page-content.props';

export const Default: React.FC<PageContentProps> = ({ fields, params, page }) => {
  const field =
    fields?.Content ??
    (page.layout.sitecore.route?.fields?.Content as RichTextField | undefined);
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!field && !isAuthoring) return null;

  return (
    <article
      className={`component content ${params.styles ?? ''}`}
      id={params.RenderingIdentifier}
      data-component="PageContent"
      data-class-change
    >
      <div className="component-content">
        <div className="field-content text-base leading-relaxed">
          {field ? <ContentSdkRichText field={field} /> : 'Page content'}
        </div>
      </div>
    </article>
  );
};
