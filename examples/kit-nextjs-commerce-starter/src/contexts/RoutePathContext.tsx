'use client';

import { createContext, useContext, type ReactNode } from 'react';

const RoutePathContext = createContext<readonly string[]>([]);

export const RoutePathProvider = ({
  routePath,
  children,
}: {
  routePath: readonly string[];
  children: ReactNode;
}) => (
  <RoutePathContext.Provider value={routePath}>
    {children}
  </RoutePathContext.Provider>
);

export const useRoutePath = (): readonly string[] =>
  useContext(RoutePathContext);
