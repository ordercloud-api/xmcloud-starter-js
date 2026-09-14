'use client';

import { ClientSDK } from '@sitecore-marketplace-sdk/client';
import { useEffect, useState } from 'react';

let marketplaceClientPromise: Promise<ClientSDK> | null = null;

const initializeMarketplaceClient = (): Promise<ClientSDK> => {
  marketplaceClientPromise ??= ClientSDK.init({ target: window.parent });
  return marketplaceClientPromise;
};

export const useMarketplaceClient = () => {
  const [client, setClient] = useState<ClientSDK | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void initializeMarketplaceClient()
      .then((nextClient) => {
        if (active) setClient(nextClient);
      })
      .catch((initializationError: unknown) => {
        marketplaceClientPromise = null;
        if (active) {
          setError(
            initializationError instanceof Error
              ? initializationError
              : new Error('Unable to connect to SitecoreAI'),
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { client, error, isLoading: !client && !error };
};
