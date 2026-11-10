import { createCommerceTokenRouteHandler } from '@sitecore-content-sdk/nextjs/route-handler';
import scConfig from 'sitecore.config';

export const { POST, DELETE } = createCommerceTokenRouteHandler({
  contextId: scConfig.api.edge.contextId,   // server-side SITECORE_EDGE_CONTEXT_ID
  edgeUrl: scConfig.api.edge.edgeUrl,
});