import {
  Auth,
  Configuration,
  OrderCloudError,
  type ApiRole,
  type RequestOptions,
} from 'ordercloud-javascript-sdk';
import { getCommerceBrowserConfig } from './browser-config';

export type CommerceRequestOptions = RequestOptions & { signal?: AbortSignal };
export type CommerceRequest = <T>(
  operation: (options: CommerceRequestOptions) => Promise<T>
) => Promise<T>;

export const configureOrderCloudSdk = (): void => {
  Configuration.Set({
    baseApiUrl: getCommerceBrowserConfig().proxyBaseUrl,
  });
};

const getAnonymousScope = (): ApiRole[] | undefined => {
  const scope = getCommerceBrowserConfig().anonymousScope;
  return scope ? (scope.split(/\s+/).filter(Boolean) as ApiRole[]) : undefined;
};

export const requestAnonymousOrderCloudToken = async (): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  configureOrderCloudSdk();
  const clientId = getCommerceBrowserConfig().clientId ?? '';
  const response = await Auth.Anonymous(clientId, getAnonymousScope());
  if (!response.access_token || !response.expires_in) {
    throw new Error('OrderCloud anonymous auth returned an invalid token response');
  }

  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
  };
};

export const hasOrderCloudStatus = (error: unknown, status: number): boolean =>
  error instanceof OrderCloudError && error.status === status;
