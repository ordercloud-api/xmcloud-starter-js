import type React from 'react';
import { AppPlaceholder } from '@sitecore-content-sdk/nextjs';
import componentMap from '.sitecore/component-map';
import type { ContainerProps } from './container.props';

export const Default: React.FC<ContainerProps> = ({ params, rendering, page }) => {
  const { styles, RenderingIdentifier: id, DynamicPlaceholderId } = params;
  const phKey = `container-${DynamicPlaceholderId ?? '0'}`;

  return (
    <section
      className={`mx-auto w-full max-w-7xl px-4 py-6 ${styles ?? ''}`}
      id={id}
      data-component="Container"
    >
      <AppPlaceholder name={phKey} rendering={rendering} page={page} componentMap={componentMap} />
    </section>
  );
};
