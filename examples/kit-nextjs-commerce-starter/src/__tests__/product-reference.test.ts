import { describe, expect, it } from "vitest";
import {
  normalizeProductSource,
  parseProductReference,
  resolveProductId,
  serializeProductReference,
} from "../lib/commerce/products/reference";

describe("product references", () => {
  it("round trips picker values", () => {
    const reference = { id: "SKU/123" };
    expect(parseProductReference(serializeProductReference(reference))).toEqual(
      reference,
    );
  });

  it("does not accept structured references", () => {
    expect(
      parseProductReference('{"id":"SKU-123","name":"Headphones"}'),
    ).toBeUndefined();
  });

  it("accepts plain IDs", () => {
    expect(parseProductReference("SKU-123")).toEqual({ id: "SKU-123" });
  });

  it("normalizes the two supported product sources", () => {
    expect(normalizeProductSource("OrderCloud Picker")).toBe(
      "ordercloud-picker",
    );
    expect(normalizeProductSource("Last URL Segment")).toBe("last-url-segment");
    expect(normalizeProductSource("")).toBeUndefined();
    expect(normalizeProductSource("Something Else")).toBeUndefined();
  });

  it("uses the decoded final route segment in URL mode", () => {
    expect(
      resolveProductId({
        source: "last-url-segment",
        routePath: ["catalog", "SKU%2F123"],
        selectedProduct: { id: "PICKED-123" },
        isAuthoring: false,
      }),
    ).toBe("SKU/123");
  });

  it.each(["*", ",-w-,"])(
    "uses the preview product ID for the Sitecore wildcard segment %s while authoring",
    (wildcardSegment) => {
      const previewProduct = { id: "PREVIEW-123" };
      expect(
        resolveProductId({
          source: "last-url-segment",
          routePath: ["catalog", wildcardSegment],
          previewProduct,
          isAuthoring: true,
        }),
      ).toBe("PREVIEW-123");
      expect(
        resolveProductId({
          source: "last-url-segment",
          routePath: ["catalog", wildcardSegment],
          previewProduct,
          isAuthoring: false,
        }),
      ).toBeUndefined();
    },
  );

  it("uses Product ID in picker mode", () => {
    expect(
      resolveProductId({
        source: "ordercloud-picker",
        routePath: ["catalog", "ignored"],
        selectedProduct: { id: "PICKED-123" },
        isAuthoring: false,
      }),
    ).toBe("PICKED-123");
  });

  it("does not fall back to the URL when picker mode has no Product ID", () => {
    expect(
      resolveProductId({
        source: "ordercloud-picker",
        routePath: ["catalog", "URL-123"],
        isAuthoring: false,
      }),
    ).toBeUndefined();
  });
});
