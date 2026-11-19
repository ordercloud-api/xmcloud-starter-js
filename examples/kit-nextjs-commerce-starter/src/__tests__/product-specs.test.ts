import { describe, expect, it } from "vitest";
import {
  toCommerceProductSpec,
  toProductSpecErrors,
  validateProductSpec,
} from "../lib/commerce/products/specs";

describe("product spec presentation", () => {
  it("normalizes supported Spec and Option XP presentation", () => {
    const mapped = toCommerceProductSpec({
      ID: "COLOR",
      Name: "Color",
      Required: true,
      xp: {
        presentation: {
          control: "swatches",
          label: "Finish",
          helpText: "Choose a finish",
        },
      },
      Options: [
        {
          ID: "NAVY",
          Value: "Navy",
          PriceMarkupType: "Percentage",
          PriceMarkup: 5,
          xp: {
            presentation: {
              label: "Midnight navy",
              color: "#1e3a5f",
              imageUrl: "https://example.com/navy.jpg",
              badge: "Popular",
            },
          },
        },
      ],
    });

    expect(mapped).toMatchObject({
      presentation: {
        control: "swatches",
        label: "Finish",
        helpText: "Choose a finish",
      },
      options: [
        {
          priceMarkupType: "Percentage",
          priceMarkup: 5,
          presentation: {
            label: "Midnight navy",
            color: "#1e3a5f",
            imageUrl: "https://example.com/navy.jpg",
            badge: "Popular",
          },
        },
      ],
    });
  });

  it("rejects unsupported and unsafe presentation values", () => {
    expect(
      toCommerceProductSpec({
        ID: "COLOR",
        Name: "Color",
        xp: { presentation: { control: "carousel" } },
        Options: [
          {
            ID: "RED",
            Value: "Red",
            xp: {
              presentation: {
                color: "url(javascript:bad)",
                imageUrl: "javascript:bad",
              },
            },
          },
        ],
      }),
    ).toMatchObject({
      presentation: { control: undefined },
      options: [{ presentation: { color: undefined, imageUrl: undefined } }],
    });
  });

  it("adds starter XP constraints to the SDK selection result", () => {
    const rawSpec = {
      ID: "ENGRAVING",
      Name: "Engraving",
      Required: true,
      AllowOpenText: true,
      xp: {
        presentation: { label: "Message", textControl: "text" },
        validation: { minLength: 3, maxLength: 8 },
      },
    };

    expect(validateProductSpec(rawSpec, { value: "Hi" })).toEqual({
      specId: "ENGRAVING",
      code: "min-length",
      params: { min: 3 },
    });
    expect(validateProductSpec(rawSpec, { value: "Welcome" })).toBeUndefined();
  });

  it("localizes SDK and starter issue codes for the form UI", () => {
    const spec = toCommerceProductSpec({
      ID: "SIZE",
      Name: "Size",
      Required: true,
      Options: [{ ID: "SMALL", Value: "Small" }],
    });

    expect(
      toProductSpecErrors(spec ? [spec] : [], [
        { specId: "SIZE", code: "required" },
        { specId: "", code: "variant-unavailable" },
      ]),
    ).toEqual({
      fields: { SIZE: "Select Size." },
      message: "This product option combination is unavailable.",
    });
  });
});
