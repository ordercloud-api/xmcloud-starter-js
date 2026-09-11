import { getCommerceBrowserConfig } from './browser-config';
import { readStoredOrderCloudToken } from './auth/token-store';

export type CommerceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

export class CommerceProxyError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'CommerceProxyError';
  }
}

const getErrorMessage = (body: unknown, status: number): string => {
  if (body && typeof body === 'object') {
    const payload = body as {
      Message?: unknown;
      Errors?: Array<{ Message?: unknown }>;
      error?: unknown;
      error_description?: unknown;
    };
    const candidates = [
      payload.Message,
      payload.Errors?.[0]?.Message,
      payload.error_description,
      payload.error,
    ];
    const message = candidates.find(
      (candidate): candidate is string => typeof candidate === 'string' && !!candidate.trim()
    );
    if (message) return message;
  }

  return `OrderCloud proxy request failed with status ${status}`;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const buildProxyUrl = (path: string): string => {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('OrderCloud proxy paths must start with a single forward slash');
  }

  return `${getCommerceBrowserConfig().proxyBaseUrl}${path}`;
};

export const requestAnonymousOrderCloudToken = async (): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  const response = await fetch('/api/commerce/auth/anonymous', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new CommerceProxyError(getErrorMessage(body, response.status), response.status);
  }

  if (body && typeof body === 'object') {
    const payload = body as { accessToken?: unknown; expiresIn?: unknown };
    if (
      typeof payload.accessToken === 'string' &&
      payload.accessToken.trim() &&
      typeof payload.expiresIn === 'number' &&
      Number.isFinite(payload.expiresIn) &&
      payload.expiresIn > 0
    ) {
      return {
        accessToken: payload.accessToken,
        expiresIn: Math.max(1, Math.floor(payload.expiresIn)),
      };
    }
  }

  const storedToken = readStoredOrderCloudToken();
  if (!storedToken) {
    throw new Error('OrderCloud anonymous auth succeeded but no browser token was stored');
  }

  const expiresIn = Math.max(1, Math.floor((storedToken.expiresAt - Date.now()) / 1000));
  return { accessToken: storedToken.accessToken, expiresIn };
};

export const requestOrderCloudProxy = async <T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(buildProxyUrl(path), { ...init, headers });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new CommerceProxyError(getErrorMessage(body, response.status), response.status);
  }

  return body as T;
};
