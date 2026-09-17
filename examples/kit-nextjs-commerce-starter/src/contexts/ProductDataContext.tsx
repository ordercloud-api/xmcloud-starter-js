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
import {
  getInitialSpecSelections,
  validateSpecSelections,
  type CommerceProductSpec,
  type ProductSpecSelection,
  type ProductSpecSelections,
} from "@/lib/commerce/products/specs";
import {
  getInitialProductSelections,
  getVariantOptionAvailability,
  resolveSelectedVariant,
  type CommerceProductVariant,
  type ProductSpecOptionAvailability,
} from "@/lib/commerce/products/variants";

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
  specs: CommerceProductSpec[];
  specsStatus: "loading" | "ready" | "error";
  specsError: string | null;
  retrySpecs: () => void;
  variants: CommerceProductVariant[];
  variantsStatus: "loading" | "ready" | "error";
  variantsError: string | null;
  hasVariantSpecs: boolean;
  selectedVariant?: CommerceProductVariant;
  optionAvailability: ProductSpecOptionAvailability;
  selections: ProductSpecSelections;
  areSpecSelectionsValid: boolean;
  validationErrors: Record<string, string>;
  updateSelection: (specId: string, selection: ProductSpecSelection) => void;
  setValidationErrors: (errors: Record<string, string>) => void;
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
  const [specs, setSpecs] = useState<CommerceProductSpec[]>([]);
  const [specsStatus, setSpecsStatus] =
    useState<ProductDataContextValue["specsStatus"]>("loading");
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [variants, setVariants] = useState<CommerceProductVariant[]>([]);
  const [variantsStatus, setVariantsStatus] =
    useState<ProductDataContextValue["variantsStatus"]>("loading");
  const [variantsError, setVariantsError] = useState<string | null>(null);
  const [specsRefreshSeed, setSpecsRefreshSeed] = useState(0);
  const [selections, setSelections] = useState<ProductSpecSelections>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
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
        setLoadStatus(hasOrderCloudStatus(error, 404) ? "not-found" : "error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [productId, products, refreshSeed, sessionError, sessionStatus]);

  useEffect(() => {
    setSpecs([]);
    setVariants([]);
    setSelections({});
    setSpecsError(null);
    setVariantsError(null);
    setValidationErrors({});

    if (!productId || loadStatus !== "ready") {
      setSpecsStatus("loading");
      setVariantsStatus("loading");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setSpecsStatus("loading");
    setVariantsStatus("loading");

    void products
      .listSpecs(productId, { signal: controller.signal })
      .then(async (nextSpecs) => {
        if (!active) return;
        const hasVariants = nextSpecs.some((spec) => spec.definesVariant);
        const nextVariants = hasVariants
          ? await products.listVariants(productId, {
              signal: controller.signal,
            })
          : [];
        if (!active) return;
        const initialSelections = getInitialSpecSelections(nextSpecs);
        setSpecs(nextSpecs);
        setVariants(nextVariants);
        setSelections(
          getInitialProductSelections(
            nextSpecs,
            nextVariants,
            initialSelections,
          ),
        );
        setSpecsStatus("ready");
        setVariantsStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return;
        setSpecsError(
          error instanceof Error
            ? error.message
            : "Unable to load product options",
        );
        setSpecsStatus("error");
        setVariantsError(
          error instanceof Error
            ? error.message
            : "Unable to load product variants",
        );
        setVariantsStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [loadStatus, productId, products, specsRefreshSeed]);

  const retry = useCallback(() => setRefreshSeed((value) => value + 1), []);
  const retrySpecs = useCallback(
    () => setSpecsRefreshSeed((value) => value + 1),
    [],
  );
  const updateSelection = useCallback(
    (specId: string, selection: ProductSpecSelection) => {
      setSelections((current) => ({ ...current, [specId]: selection }));
      setValidationErrors((current) => {
        const next = { ...current };
        delete next[specId];
        return next;
      });
    },
    [],
  );
  const areSpecSelectionsValid = useMemo(() => {
    if (
      specsStatus !== "ready" ||
      variantsStatus !== "ready" ||
      Object.keys(validateSpecSelections(specs, selections)).length > 0
    )
      return false;

    return (
      !specs.some((spec) => spec.definesVariant) ||
      Boolean(resolveSelectedVariant(specs, selections, variants))
    );
  }, [selections, specs, specsStatus, variants, variantsStatus]);
  const hasVariantSpecs = useMemo(
    () => specs.some((spec) => spec.definesVariant),
    [specs],
  );
  const selectedVariant = useMemo(
    () => resolveSelectedVariant(specs, selections, variants),
    [selections, specs, variants],
  );
  const optionAvailability = useMemo(
    () => getVariantOptionAvailability(specs, selections, variants),
    [selections, specs, variants],
  );

  const value = useMemo<ProductDataContextValue>(
    () => ({
      productId,
      product: loadedProduct,
      status: loadStatus,
      error: loadError,
      retry,
      specs,
      specsStatus,
      specsError,
      retrySpecs,
      variants,
      variantsStatus,
      variantsError,
      hasVariantSpecs,
      selectedVariant,
      optionAvailability,
      selections,
      areSpecSelectionsValid,
      validationErrors,
      updateSelection,
      setValidationErrors,
    }),
    [
      loadError,
      loadedProduct,
      loadStatus,
      productId,
      areSpecSelectionsValid,
      retry,
      retrySpecs,
      variants,
      variantsError,
      variantsStatus,
      hasVariantSpecs,
      selectedVariant,
      optionAvailability,
      selections,
      specs,
      specsError,
      specsStatus,
      updateSelection,
      validationErrors,
    ],
  );

  return (
    <ProductDataContext.Provider value={value}>
      {children}
    </ProductDataContext.Provider>
  );
};

export const useProductContext = (): ProductDataContextValue | null =>
  useContext(ProductDataContext);
