"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import {
  CommerceProvider,
  useCommerce,
} from "@sitecore-content-sdk/nextjs/commerce";
import {
  createOrderCloudServices,
  type OrderCloudServices,
} from "@/lib/commerce/services";
import { clearLegacyOrderCloudToken } from "@/lib/commerce/auth/legacy-token-cleanup";

export type OrderCloudAuthStatus = "loading" | "authenticated" | "error";

export interface OrderCloudContextValue {
  products: OrderCloudServices["products"] | null;
  cart: OrderCloudServices["cart"] | null;
  status: OrderCloudAuthStatus;
  isAuthenticated: boolean;
  accessToken: string | null;
  error: Error | null;
  startFreshAnonymousSession: () => Promise<void>;
}

const OrderCloudContext = createContext<OrderCloudContextValue | undefined>(
  undefined,
);

function OrderCloudProviderContent({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(clearLegacyOrderCloudToken, []);
  const {
    service,
    session,
    status: commerceStatus,
    error,
    resetSession,
  } = useCommerce();
  const services = useMemo(
    () => (service ? createOrderCloudServices(service) : null),
    [service],
  );
  const status: OrderCloudAuthStatus =
    commerceStatus === "ready"
      ? "authenticated"
      : commerceStatus === "error"
        ? "error"
        : "loading";

  return (
    <OrderCloudContext.Provider
      value={{
        status,
        isAuthenticated: status === "authenticated" && !!services,
        accessToken: session?.accessToken ?? null,
        error,
        startFreshAnonymousSession: async () => {
          await resetSession();
        },
        products: services?.products ?? null,
        cart: services?.cart ?? null,
      }}
    >
      {children}
    </OrderCloudContext.Provider>
  );
}

export function OrderCloudProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommerceProvider eager>
      <OrderCloudProviderContent>{children}</OrderCloudProviderContent>
    </CommerceProvider>
  );
}

export const useOrderCloud = (): OrderCloudContextValue => {
  const context = useContext(OrderCloudContext);
  if (!context)
    throw new Error("useOrderCloud must be used within an OrderCloudProvider");
  return context;
};
