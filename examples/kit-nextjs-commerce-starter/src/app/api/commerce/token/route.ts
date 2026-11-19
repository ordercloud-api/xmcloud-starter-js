import { createCommerceTokenRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import scConfig from 'sitecore.config';

export const { POST, DELETE } = createCommerceTokenRouteHandler({
  contextId: scConfig.api.edge.contextId,
  edgeUrl: scConfig.api.edge.edgeUrl,
});
