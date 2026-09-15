import type React from 'react';
import { RichText as ContentSdkRichText } from '@sitecore-content-sdk/nextjs';
import type { RichTextProps } from './rich-text.props';

export const Default: React.FC<RichTextProps> = ({ fields, params }) => {
  const { styles, RenderingIdentifier: id } = params;
  const text = fields?.Text;

  return (
    <div
      className={`space-y-3 text-base leading-relaxed ${styles ?? ''}`}
      id={id}
      data-component="RichText"
      data-class-change
    >
      {text ? (
        <ContentSdkRichText field={text} />
      ) : (
        <span className="text-muted-foreground">Rich text</span>
      )}
    </div>
  );
};
