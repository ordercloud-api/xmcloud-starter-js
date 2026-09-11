'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CommerceProxyError,
  requestAnonymousOrderCloudToken,
  requestOrderCloudProxy,
  type CommerceRequest,
} from '@/lib/commerce/client';
import {
  clearStoredOrderCloudToken,
  readStoredOrderCloudToken,
  writeStoredOrderCloudToken,
  type StoredOrderCloudToken,
} from '@/lib/commerce/auth/token-store';
import { createOrderCloudServices, type OrderCloudServices } from '@/lib/commerce/services';

export type OrderCloudAuthStatus = 'loading' | 'authenticated' | 'error';

export interface OrderCloudContextValue extends OrderCloudServices {
  status: OrderCloudAuthStatus;
  isAuthenticated: boolean;
  accessToken: string | null;
  error: Error | null;
}

const OrderCloudContext = createContext<OrderCloudContextValue | undefined>(undefined);
let authenticationPromise: Promise<StoredOrderCloudToken> | null = null;
const TRANSIENT_AUTH_RETRY_DELAYS_MS = [100, 250] as const;

const requestAnonymousOrderCloudTokenWithRetry = async (): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestAnonymousOrderCloudToken();
    } catch (error) {
      const retryDelay = TRANSIENT_AUTH_RETRY_DELAYS_MS[attempt];
      const isTransientServerError =
        error instanceof CommerceProxyError && error.status >= 500 && error.status < 600;

      if (!isTransientServerError || retryDelay === undefined) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
};

const authenticateAnonymous = async (forceNewToken = false): Promise<StoredOrderCloudToken> => {
  if (!forceNewToken) {
    const storedToken = readStoredOrderCloudToken();
    if (storedToken) return storedToken;
  }

  if (!authenticationPromise) {
    authenticationPromise = requestAnonymousOrderCloudTokenWithRetry()
      .then(({ accessToken, expiresIn }) => writeStoredOrderCloudToken(accessToken, expiresIn))
      .finally(() => {
        authenticationPromise = null;
      });
  }

  return authenticationPromise;
};

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error('Unable to start an OrderCloud session');

export function OrderCloudProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<OrderCloudAuthStatus>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [storedToken, setStoredToken] = useState<StoredOrderCloudToken | null>(null);
  const tokenRef = useRef<StoredOrderCloudToken | null>(null);

  const setAuthenticated = useCallback((token: StoredOrderCloudToken) => {
    tokenRef.current = token;
    setStoredToken(token);
    setError(null);
    setStatus('authenticated');
  }, []);

  const setAuthenticationError = useCallback((authenticationError: unknown) => {
    const normalizedError = asError(authenticationError);
    tokenRef.current = null;
    setStoredToken(null);
    clearStoredOrderCloudToken();
    setError(normalizedError);
    setStatus('error');
    return normalizedError;
  }, []);

  useEffect(() => {
    let active = true;

    void authenticateAnonymous()
      .then((token) => {
        if (active) setAuthenticated(token);
      })
      .catch((authenticationError) => {
        if (active) setAuthenticationError(authenticationError);
      });

    return () => {
      active = false;
    };
  }, [setAuthenticated, setAuthenticationError]);

  const request = useCallback<CommerceRequest>(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      let token = tokenRef.current ?? (await authenticateAnonymous());
      tokenRef.current = token;

      try {
        return await requestOrderCloudProxy<T>(path, token.accessToken, init);
      } catch (requestError) {
        if (!(requestError instanceof CommerceProxyError) || requestError.status !== 401) {
          throw requestError;
        }

        clearStoredOrderCloudToken();
        tokenRef.current = null;
        try {
          token = await authenticateAnonymous(true);
          setAuthenticated(token);
        } catch (authenticationError) {
          throw setAuthenticationError(authenticationError);
        }

        try {
          return await requestOrderCloudProxy<T>(path, token.accessToken, init);
        } catch (retryError) {
          if (retryError instanceof CommerceProxyError && retryError.status === 401) {
            throw setAuthenticationError(retryError);
          }
          throw retryError;
        }
      }
    },
    [setAuthenticated, setAuthenticationError]
  );
  const services = useMemo(() => createOrderCloudServices(request), [request]);

  return (
    <OrderCloudContext.Provider
      value={{
        status,
        isAuthenticated: status === 'authenticated',
        accessToken: storedToken?.accessToken ?? null,
        error,
        ...services,
      }}
    >
      {children}
    </OrderCloudContext.Provider>
  );
}

export const useOrderCloud = (): OrderCloudContextValue => {
  const context = useContext(OrderCloudContext);
  if (!context) throw new Error('useOrderCloud must be used within an OrderCloudProvider');
  return context;
};
