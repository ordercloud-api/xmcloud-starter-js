import type React from 'react';
import {
  Link,
  NextImage as ContentSdkImage,
  RichText as ContentSdkRichText,
} from '@sitecore-content-sdk/nextjs';
import type { PromoProps } from './promo.props';

export const Default: React.FC<PromoProps> = ({ fields, params, page }) => {
  const isAuthoring = page.mode.isEditing || page.mode.isDesignLibrary;

  if (!fields) {
    if (!isAuthoring) return null;

    return (
      <div
        className={`component promo ${params.styles ?? ''}`}
        id={params.RenderingIdentifier}
        data-component="Promo"
        data-class-change
      >
        <span className="text-muted-foreground">Promo</span>
      </div>
    );
  }

  return (
    <article
      className={`component promo overflow-hidden rounded-lg border ${params.styles ?? ''}`}
      id={params.RenderingIdentifier}
      data-component="Promo"
      data-class-change
    >
      {fields.PromoIcon && (
        <ContentSdkImage field={fields.PromoIcon} className="h-auto w-full object-cover" />
      )}
      <div className="space-y-3 p-5">
        {fields.PromoText3 && (
          <ContentSdkRichText field={fields.PromoText3} className="text-sm font-medium" />
        )}
        {fields.PromoText && (
          <ContentSdkRichText field={fields.PromoText} className="text-2xl font-semibold" />
        )}
        {fields.PromoText2 && (
          <ContentSdkRichText field={fields.PromoText2} className="text-muted-foreground" />
        )}
        {fields.PromoLink && <Link field={fields.PromoLink} className="font-medium underline" />}
      </div>
    </article>
  );
};
