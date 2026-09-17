import { afterEach, describe, expect, it, vi } from "vitest";
import { Cart, OrderCloudError } from "ordercloud-javascript-sdk";
import type { CommerceRequest } from "../lib/commerce/client";
import { CartService } from "../lib/commerce/cart/service";

const request: CommerceRequest = (operation) =>
  operation({ accessToken: "test-token" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CartService", () => {
  it("loads and normalizes the active cart and its line items together", async () => {
    vi.spyOn(Cart, "Get").mockResolvedValue({
      ID: "cart-1",
      Status: "Unsubmitted",
      Currency: "USD",
      Subtotal: 25,
      Total: 27,
      IsCalculated: true,
    } as never);
    vi.spyOn(Cart, "ListLineItems").mockResolvedValue({
      Items: [
        {
          ID: "line-1",
          ProductID: "SKU-1",
          Product: { Name: "Configured product" },
          Quantity: 2,
          UnitPrice: 12.5,
        },
      ],
    } as never);
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
  });

  it("includes selected specs when adding a product", async () => {
    const createLineItem = vi
      .spyOn(Cart, "CreateLineItem")
      .mockResolvedValue({} as never);
    const service = new CartService(request);

    await service.addItem({
      productId: "SKU-123",
      quantity: 2,
      specs: [
        { SpecID: "SIZE", OptionID: "SMALL" },
        { SpecID: "ENGRAVING", Value: "Codex" },
      ],
    });

    expect(createLineItem).toHaveBeenCalledWith(
      {
        ProductID: "SKU-123",
        Quantity: 2,
        Specs: [
          { SpecID: "SIZE", OptionID: "SMALL", Value: undefined },
          { SpecID: "ENGRAVING", OptionID: undefined, Value: "Codex" },
        ],
      },
      { accessToken: "test-token" },
    );
  });

  it("deletes a leftover cart and retries add after a 409", async () => {
    const conflict = new OrderCloudError({
      response: {
        status: 409,
        statusText: "Conflict",
        data: {
          Errors: [{ ErrorCode: "ObjectExists", Message: "Object already exists" }],
        },
      },
    });
    const createLineItem = vi
      .spyOn(Cart, "CreateLineItem")
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue({} as never);
    const removeCart = vi.spyOn(Cart, "Delete").mockResolvedValue(undefined as never);
    const service = new CartService(request);

    await service.addItem({ productId: "SKU-123", quantity: 1 });

    expect(removeCart).toHaveBeenCalledWith({ accessToken: "test-token" });
    expect(createLineItem).toHaveBeenCalledTimes(2);
  });

  it("marks checkout as pending on the unsubmitted cart", async () => {
    const patch = vi.spyOn(Cart, "Patch").mockResolvedValue({} as never);
    const service = new CartService(request);

    await service.markCheckoutPending({
      clientId: "buyer-client-id",
      stripeSessionId: "cs_test_123",
    });

    expect(patch).toHaveBeenCalledWith(
      {
        xp: {
          CheckoutStatus: "Pending",
          ocClientId: "buyer-client-id",
          stripeSessionId: "cs_test_123",
        },
      },
      { accessToken: "test-token" },
    );
  });
});
