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

const normalizeBaseUrl = (value: string): string => value.replace(/\/$/, '');

const getSandboxBaseApiUrl = (): string =>
  normalizeBaseUrl(
    process.env.NEXT_PUBLIC_ORDERCLOUD_BASE_API_URL?.trim() || 'https://sandboxapi.ordercloud.io'
  );

export const hasOrderCloudStatus = (error: unknown, status: number): boolean =>
  error instanceof OrderCloudError && error.status === status;

const readErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

const shouldFallbackToSandbox = (error: unknown): boolean => {
  const status = readErrorStatus(error);
  if (status === 401 || status === 502 || status === 503) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /network error|econnrefused|enotfound|failed to fetch|fetch failed|invalid or expired|invalid token/i.test(
    message
  );
};

export const configureOrderCloudSdk = (): void => {
  Configuration.Set({
    baseApiUrl: getCommerceBrowserConfig().proxyBaseUrl,
  });
};

const getAnonymousScope = (): ApiRole[] | undefined => {
  const scope = getCommerceBrowserConfig().anonymousScope;
  return scope ? (scope.split(/\s+/).filter(Boolean) as ApiRole[]) : undefined;
};

const withSandboxFallback = async <T>(operation: () => Promise<T>): Promise<T> => {
  configureOrderCloudSdk();
  try {
    return await operation();
  } catch (error) {
    const sandboxBaseApiUrl = getSandboxBaseApiUrl();
    if (sandboxBaseApiUrl === getCommerceBrowserConfig().proxyBaseUrl || !shouldFallbackToSandbox(error)) {
      throw error;
    }

    Configuration.Set({ baseApiUrl: sandboxBaseApiUrl });
    try {
      return await operation();
    } finally {
      configureOrderCloudSdk();
    }
  }
};

export const runOrderCloudOperation = async <T>(
  operation: (options: CommerceRequestOptions) => Promise<T>,
  options: CommerceRequestOptions
): Promise<T> => withSandboxFallback(() => operation(options));

export const requestAnonymousOrderCloudToken = async (): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  const clientId = getCommerceBrowserConfig().clientId ?? '';
  const response = await withSandboxFallback(() => Auth.Anonymous(clientId, getAnonymousScope()));
  if (!response.access_token || !response.expires_in) {
    throw new Error('OrderCloud anonymous auth returned an invalid token response');
  }

  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
  };
};
