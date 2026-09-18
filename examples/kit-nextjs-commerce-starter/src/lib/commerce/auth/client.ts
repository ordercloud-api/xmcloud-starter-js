import 'server-only';
import { Auth, Configuration, type ApiRole } from 'ordercloud-javascript-sdk';
import { commerceAuthConfig } from './config';

type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

const parseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const asMessage = (body: unknown, fallback: string): string => {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const payload = body as {
      error?: unknown;
      error_description?: unknown;
      Message?: unknown;
      Errors?: Array<{ Message?: unknown }>;
    };
    const message = [
      payload.error_description,
      payload.error,
      payload.Message,
      payload.Errors?.[0]?.Message,
    ].find((v): v is string => typeof v === 'string' && !!v.trim());
    if (message) return message;
  }

  return fallback;
};

const configureServerSdk = (): void => {
  Configuration.Set({ baseApiUrl: commerceAuthConfig.baseApiUrl });
};

export const requestMiddlewareOrderCloudToken = async (): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  if (!commerceAuthConfig.middlewareClientId || !commerceAuthConfig.middlewareClientSecret) {
    throw new Error(
      'Missing ORDERCLOUD_MIDDLEWARE_CLIENT_ID / ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET for gateway order fulfillment'
    );
  }

  configureServerSdk();
  const scope = commerceAuthConfig.middlewareScope.split(/\s+/).filter(Boolean) as ApiRole[];
  let response;
  try {
    response = await Auth.ClientCredentials(
      commerceAuthConfig.middlewareClientSecret,
      commerceAuthConfig.middlewareClientId,
      scope.length ? scope : undefined
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`OrderCloud middleware client_credentials failed (${scope.join(" ")}): ${message}`);
  }
  if (!response.access_token || !response.expires_in) {
    throw new Error('OrderCloud token response did not include an access token');
  }

  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
  };
};

export const orderCloudRequest = async <T>(
  path: string,
  options: RequestOptions,
  accessToken: string
): Promise<T> => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${commerceAuthConfig.baseApiUrl}${normalizedPath}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
    cache: 'no-store',
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(asMessage(body, `OrderCloud request failed with status ${response.status}`));
  }

  return body as T;
};
