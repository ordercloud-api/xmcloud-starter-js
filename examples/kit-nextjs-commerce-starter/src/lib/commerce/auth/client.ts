import 'server-only';
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

export const orderCloudTokenRequest = async <T>(params: URLSearchParams): Promise<T> => {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const tokenParams = new URLSearchParams(params);
  if (!tokenParams.get('client_id')) {
    tokenParams.set('client_id', commerceAuthConfig.buyerClientId);
  }

  const response = await fetch(`${commerceAuthConfig.baseApiUrl}/oauth/token`, {
    method: 'POST',
    headers,
    body: tokenParams.toString(),
    cache: 'no-store',
  });

  const body = await parseBody(response);
  if (!response.ok) {
    throw new Error(asMessage(body, `OrderCloud token request failed with status ${response.status}`));
  }

  return body as T;
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
