import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import ProductContainerContent from "../components/commerce/ProductContainerContent";
import { Default as ProductInfo } from "../components/product-info/ProductInfo";
import { Default as ProductImageGallery } from "../components/product-image-gallery/ProductImageGallery";
import { Default as SpecForm } from "../components/spec-form/SpecForm";
import { Default as AddToCart } from "../components/add-to-cart/AddToCart";
import type { ComponentProps } from "../lib/component-props";

type ProductProviderCapture = {
  productId?: string;
  select?: (value: unknown) => unknown;
  validateSpec?: (spec: unknown, selection: unknown) => unknown;
};

const state = vi.hoisted(() => ({
  providerProps: undefined as ProductProviderCapture | undefined,
  routePath: ["Products", "ava-edge-001"] as readonly string[],
  product: {
    productId: "ava-edge-001",
    product: {
      id: "ava-edge-001",
      name: "Ava Edge",
      description: "A configurable product.",
      price: 120,
      currency: "USD",
      images: [{ url: "/ava-edge.jpg" }],
    },
    rawProduct: { ID: "ava-edge-001", Name: "Ava Edge" },
    status: "success",
    isLoading: false,
    isSuccess: true,
    isNotFound: false,
    isError: false,
    isRefetching: false,
    error: null,
    refetch: vi.fn(),
  },
  options: {
    specs: [
      {
        ID: "SIZE",
        Name: "Size",
        Required: true,
        Options: [{ ID: "8", Value: "8" }],
      },
    ],
    variants: [],
    hasVariantSpecs: false,
    optionAvailability: {},
    status: "success",
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  selection: {
    selections: { SIZE: { optionId: "8" } },
    selectedVariant: undefined,
    issues: [],
    visibleIssues: [],
    isComplete: true,
    setSelection: vi.fn(),
    resetSelections: vi.fn(),
    validate: vi.fn(() => true),
    getLineItemDraft: vi.fn(() => ({
      ProductID: "ava-edge-001",
      Specs: [{ SpecID: "SIZE", OptionID: "8" }],
    })),
  },
  cart: {
    addItem: vi.fn(),
  },
  resetSession: vi.fn(),
}));

vi.mock("@sitecore-content-sdk/nextjs/commerce", () => ({
  ProductProvider: ({
    children,
    ...props
  }: ProductProviderCapture & { children?: ReactNode }) => {
    state.providerProps = props;
    return children;
  },
  useProduct: () => state.product,
  useProductOptions: () => state.options,
  useProductSelection: () => state.selection,
}));

vi.mock("@/contexts/RoutePathContext", () => ({
  useRoutePath: () => state.routePath,
}));

vi.mock("@/contexts/OrderCloudContext", () => ({
  useOrderCloud: () => ({
    cart: state.cart,
    startFreshAnonymousSession: state.resetSession,
  }),
}));

const page = (isEditing = false) =>
  ({
    mode: {
      isEditing,
      isPreview: false,
      isDesignLibrary: false,
    },
    layout: {
      sitecore: {
        route: null,
      },
    },
  }) as ComponentProps["page"];

const componentProps = (isEditing = false): ComponentProps => ({
  rendering: {} as ComponentProps["rendering"],
  params: {},
  page: page(isEditing),
});

beforeEach(() => {
  state.providerProps = undefined;
  vi.clearAllMocks();
});

describe("product detail component migration", () => {
  it("resolves the ProductContainer route and supplies starter mapping", () => {
    renderToStaticMarkup(
      <ProductContainerContent isAuthoring={false} source="last-url-segment">
        <span>child</span>
      </ProductContainerContent>,
    );

    expect(state.providerProps?.productId).toBe("ava-edge-001");
    expect(
      state.providerProps?.select?.({
        ID: "P-1",
        Name: "Mapped product",
        PriceSchedule: {
          Currency: "USD",
          PriceBreaks: [{ Quantity: 1, Price: 42 }],
        },
      }),
    ).toMatchObject({
      id: "P-1",
      name: "Mapped product",
      price: 42,
      currency: "USD",
    });
    expect(state.providerProps?.validateSpec).toBeTypeOf("function");
  });

  it("renders product, gallery and option components from SDK hooks", () => {
    const html = [
      renderToStaticMarkup(<ProductInfo {...componentProps()} />),
      renderToStaticMarkup(<ProductImageGallery {...componentProps()} />),
      renderToStaticMarkup(<SpecForm {...componentProps()} />),
    ].join("");

    expect(html).toContain("Ava Edge");
    expect(html).toContain("A configurable product.");
    expect(html).toContain("ava-edge.jpg");
    expect(html).toContain("Size");
    expect(html).toContain("8");
  });

  it("enables add-to-cart for a complete selection and disables it while authoring", () => {
    const liveHtml = renderToStaticMarkup(<AddToCart {...componentProps()} />);
    const authoringHtml = renderToStaticMarkup(
      <AddToCart {...componentProps(true)} />,
    );

    expect(liveHtml).toContain("Add to cart");
    expect(liveHtml).not.toContain('type="submit" disabled');
    expect(authoringHtml).toContain('type="submit" disabled=""');
  });
});
