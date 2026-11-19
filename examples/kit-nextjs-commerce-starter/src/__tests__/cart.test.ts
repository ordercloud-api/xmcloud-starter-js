import { afterEach, describe, expect, it, vi } from "vitest";
import type { OrderCloudApiPath } from "@sitecore-content-sdk/commerce";
import { CartService } from "../lib/commerce/cart/service";

type Request = <T>(path: OrderCloudApiPath, init?: RequestInit) => Promise<T>;

afterEach(() => vi.restoreAllMocks());

describe("CartService", () => {
  it("loads and normalizes the active cart through the proxy service", async () => {
    const request = vi.fn<Request>().mockImplementation(async (path) => {
      if (path === "/v1/cart") {
        return {
          ID: "cart-1",
          Status: "Unsubmitted",
          Currency: "USD",
          Subtotal: 25,
          Total: 27,
          IsCalculated: true,
        };
      }
      return {
        Items: [
          {
            ID: "line-1",
            ProductID: "SKU-1",
            Product: { Name: "Configured product" },
            Quantity: 2,
            UnitPrice: 12.5,
          },
        ],
      };
    }) as Request;
    const service = new CartService(request);

    await expect(service.get()).resolves.toEqual({
      id: "cart-1",
      status: "Unsubmitted",
      currency: "USD",
      subtotal: 25,
      taxCost: undefined,
      total: 27,
      isCalculated: true,
      items: [
        {
          id: "line-1",
          productId: "SKU-1",
          name: "Configured product",
          quantity: 2,
          unitPrice: 12.5,
        },
      ],
    });
    expect(request).toHaveBeenCalledWith("/v1/cart", { method: "GET" });
    expect(request).toHaveBeenCalledWith("/v1/cart/lineitems?pageSize=100", {
      method: "GET",
    });
  });

  it("serializes selected specs through the proxy service", async () => {
    const request = vi.fn<Request>().mockResolvedValue(undefined) as Request;
    const service = new CartService(request);

    await service.addItem({
      productId: "SKU-123",
      quantity: 2,
      specs: [
        { SpecID: "SIZE", OptionID: "SMALL" },
        { SpecID: "ENGRAVING", Value: "Codex" },
      ],
    });

    expect(request).toHaveBeenCalledWith("/v1/cart/lineitems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: "SKU-123",
        Quantity: 2,
        Specs: [
          { SpecID: "SIZE", OptionID: "SMALL" },
          { SpecID: "ENGRAVING", Value: "Codex" },
        ],
      }),
    });
  });

  it("updates and removes line items with encoded paths", async () => {
    const request = vi.fn<Request>().mockResolvedValue(undefined) as Request;
    const service = new CartService(request);

    await service.updateItem({ lineItemId: "line/1", quantity: 3 });
    await service.removeItem("line/1");

    expect(request).toHaveBeenCalledWith("/v1/cart/lineitems/line%2F1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Quantity: 3 }),
    });
    expect(request).toHaveBeenCalledWith("/v1/cart/lineitems/line%2F1", {
      method: "DELETE",
    });
  });

  it("marks checkout as pending on the unsubmitted cart", async () => {
    const request = vi.fn<Request>().mockResolvedValue(undefined) as Request;
    const service = new CartService(request);

    await service.markCheckoutPending({
      clientId: "buyer-client-id",
      stripeSessionId: "cs_test_123",
    });

    expect(request).toHaveBeenCalledWith("/v1/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        xp: {
          CheckoutStatus: "Pending",
          ocClientId: "buyer-client-id",
          stripeSessionId: "cs_test_123",
        },
      }),
    });
  });
});
