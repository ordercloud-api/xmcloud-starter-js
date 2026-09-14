import { describe, expect, it } from "vitest";
import {
  toCheckoutStatusResponse,
  toStartCheckoutResponse,
} from "../lib/commerce/checkout/mapper";
import { CheckoutServiceError } from "../lib/commerce/checkout/types";

describe("checkout mapper", () => {
  it("normalizes checkout service responses", () => {
    expect(
      toStartCheckoutResponse({
        attemptId: " attempt-1 ",
        redirectUrl: " https://checkout.example.test/session ",
      }),
    ).toEqual({
      attemptId: "attempt-1",
      redirectUrl: "https://checkout.example.test/session",
    });

    expect(
      toCheckoutStatusResponse({
        attemptId: "attempt-1",
        status: "completed",
        orderId: "order-1",
      }),
    ).toEqual({
      attemptId: "attempt-1",
      status: "completed",
      orderId: "order-1",
    });
  });

  it("rejects malformed or unknown checkout responses at the boundary", () => {
    expect(() => toStartCheckoutResponse({ attemptId: "attempt-1" })).toThrow(
      CheckoutServiceError,
    );
    expect(() =>
      toCheckoutStatusResponse({
        attemptId: "attempt-1",
        status: "refunded",
        orderId: "order-1",
      }),
    ).toThrow("unknown status refunded");
  });
});
