"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOrderCloud } from "@/contexts/OrderCloudContext";
import { useRoutePath } from "@/contexts/RoutePathContext";
import { hasOrderCloudStatus } from "@/lib/commerce/client";
import type { CommerceProduct } from "@/lib/commerce/products/types";
import {
  resolveProductId,
  type ProductReference,
  type ProductSource,
} from "@/lib/commerce/products/reference";

export type ProductDataStatus =
  | "loading-session"
  | "loading-product"
  | "ready"
  | "not-found"
  | "configuration-error"
  | "error";

export type ProductDataContextValue = {
  productId?: string;
  product: CommerceProduct | null;
  status: ProductDataStatus;
  error: Error | null;
  retry: () => void;
};

const ProductDataContext = createContext<ProductDataContextValue | null>(null);

export const ProductDataProvider = ({
  source,
  selectedProduct,
  previewProduct,
  isAuthoring,
  children,
}: {
  source?: ProductSource;
  selectedProduct?: ProductReference;
  previewProduct?: ProductReference;
  isAuthoring: boolean;
  children: ReactNode;
}) => {
  const routePath = useRoutePath();
  const {
    products,
    status: sessionStatus,
    error: sessionError,
  } = useOrderCloud();
  const [loadedProduct, setLoadedProduct] = useState<CommerceProduct | null>(
    null,
  );
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [loadStatus, setLoadStatus] =
    useState<ProductDataStatus>("loading-session");
  const [refreshSeed, setRefreshSeed] = useState(0);
  const productId = resolveProductId({
    source,
    routePath: [...routePath],
    selectedProduct,
    previewProduct,
    isAuthoring,
  });

  useEffect(() => {
    setLoadedProduct(null);
    setLoadError(null);

    if (!productId) {
      setLoadStatus("configuration-error");
      return;
    }

    if (sessionStatus === "loading") {
      setLoadStatus("loading-session");
      return;
    }

    if (sessionStatus === "error") {
      setLoadError(
        sessionError ?? new Error("Unable to start the OrderCloud session"),
      );
      setLoadStatus("error");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoadStatus("loading-product");

    void products
      .get(productId, { signal: controller.signal })
      .then((nextProduct) => {
        if (!active) return;
        setLoadedProduct(nextProduct);
        setLoadStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        const normalizedError =
          error instanceof Error ? error : new Error("Unable to load product");
        setLoadError(normalizedError);
        setLoadStatus(
          hasOrderCloudStatus(error, 404)
            ? "not-found"
            : "error",
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productId, products, refreshSeed, sessionError, sessionStatus]);

  const retry = useCallback(() => setRefreshSeed((value) => value + 1), []);

  const value = useMemo<ProductDataContextValue>(
    () => ({
      productId,
      product: loadedProduct,
      status: loadStatus,
      error: loadError,
      retry,
    }),
    [loadError, loadedProduct, loadStatus, productId, retry],
  );

  return (
    <ProductDataContext.Provider value={value}>
      {children}
    </ProductDataContext.Provider>
  );
};

export const useProductContext = (): ProductDataContextValue | null =>
  useContext(ProductDataContext);
