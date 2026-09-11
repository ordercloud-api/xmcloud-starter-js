import 'server-only';
import { checkoutConfig } from './config';
import {
  CheckoutServiceError,
  type CheckoutStatusResponse,
  type StartCheckoutRequest,
  type StartCheckoutResponse,
} from './types';

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => null)) as T | { error?: unknown } | null;

  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
    const message =
      typeof error === 'string' && error.trim() ? error : 'Checkout service request failed';
    throw new CheckoutServiceError(message, response.status);
  }

  if (!body) {
    throw new CheckoutServiceError('Checkout service returned an empty response', 502);
  }

  return body as T;
};

const createHeaders = (shopperToken: string): HeadersInit => ({
  Authorization: `Bearer ${shopperToken}`,
  'Content-Type': 'application/json',
});

export const startCheckout = async (
  request: StartCheckoutRequest,
  shopperToken: string
): Promise<StartCheckoutResponse> => {
  const response = await fetch(`${checkoutConfig.serviceUrl}/checkout/attempts`, {
    method: 'POST',
    headers: createHeaders(shopperToken),
    body: JSON.stringify(request),
    cache: 'no-store',
  });

  return parseResponse<StartCheckoutResponse>(response);
};

export const getCheckoutStatus = async (
  attemptId: string,
  shopperToken: string
): Promise<CheckoutStatusResponse> => {
  const response = await fetch(
    `${checkoutConfig.serviceUrl}/checkout/attempts/${encodeURIComponent(attemptId)}`,
    {
      headers: createHeaders(shopperToken),
      cache: 'no-store',
    }
  );

  return parseResponse<CheckoutStatusResponse>(response);
};
