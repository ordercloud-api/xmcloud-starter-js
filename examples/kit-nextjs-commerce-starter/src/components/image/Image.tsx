import type React from 'react';
import { Image as ContentSdkImage, Link, Text } from '@sitecore-content-sdk/nextjs';
import type { ImageProps } from './image.props';

export const Default: React.FC<ImageProps> = ({ fields, params }) => {
  const { styles, RenderingIdentifier: id } = params;
  const image = fields?.Image;
  const caption = fields?.ImageCaption;
  const link = fields?.TargetUrl;

  if (!image?.value) {
    return (
      <div className={`w-full ${styles ?? ''}`} id={id} data-component="Image">
        <span className="text-muted-foreground text-sm">Image</span>
      </div>
    );
  }

  const rendered = <ContentSdkImage field={image} className="h-auto w-full rounded object-cover" />;

  return (
    <figure className={`w-full ${styles ?? ''}`} id={id} data-component="Image">
      {link?.value?.href ? <Link field={link}>{rendered}</Link> : rendered}
      {caption?.value && (
        <figcaption className="text-muted-foreground mt-2 text-xs">
          <Text field={caption} />
        </figcaption>
      )}
    </figure>
  );
};
