import { describe, expect, it } from "vitest";
import type { CommerceProductSpec } from "../lib/commerce/products/specs";
import {
  getInitialProductSelections,
  getVariantOptionAvailability,
  resolveSelectedVariant,
  toCommerceProductVariant,
  type CommerceProductVariant,
} from "../lib/commerce/products/variants";

const spec = (
  id: string,
  optionIds: string[],
  definesVariant: boolean,
  defaultOptionId?: string,
): CommerceProductSpec => ({
  id,
  name: id,
  required: definesVariant,
  allowOpenText: false,
  definesVariant,
  defaultOptionId,
  options: optionIds.map((optionId) => ({
    id: optionId,
    name: optionId,
    isOpenText: false,
    presentation: {},
  })),
  presentation: {},
  validation: {},
});

const specs = [
  spec("COLOR", ["RED", "BLUE"], true, "RED"),
  spec("SIZE", ["S", "M"], true, "M"),
  spec("MONOGRAM", ["NONE", "CUSTOM"], false, "NONE"),
];

const variants: CommerceProductVariant[] = [
  { id: "blue-m", active: true, specs: { COLOR: "BLUE", SIZE: "M" } },
  { id: "red-s", active: true, specs: { COLOR: "RED", SIZE: "S" } },
  { id: "blue-s", active: true, specs: { COLOR: "BLUE", SIZE: "S" } },
];

describe("product variants", () => {
  it("normalizes a generated OrderCloud variant", () => {
    expect(
      toCommerceProductVariant({
        ID: "red-small",
        Active: true,
        Specs: [
          { SpecID: "COLOR", OptionID: "RED" },
          { SpecID: "SIZE", OptionID: "S" },
        ],
      }),
    ).toEqual({
      id: "red-small",
      active: true,
      specs: { COLOR: "RED", SIZE: "S" },
    });
  });

  it("does not apply variant rules to a product with pure specs", () => {
    const pureSpecs = [spec("LACE-PACK", ["STANDARD", "TRAIL"], false)];
    expect(getVariantOptionAvailability(pureSpecs, {}, [])).toEqual({});
    expect(resolveSelectedVariant(pureSpecs, {}, [])).toBeUndefined();
  });

  it("resolves every combination when no generated variants are disabled", () => {
    const allVariants: CommerceProductVariant[] = [
      { id: "red-s", active: true, specs: { COLOR: "RED", SIZE: "S" } },
      { id: "red-m", active: true, specs: { COLOR: "RED", SIZE: "M" } },
      { id: "blue-s", active: true, specs: { COLOR: "BLUE", SIZE: "S" } },
      { id: "blue-m", active: true, specs: { COLOR: "BLUE", SIZE: "M" } },
    ];

    expect(
      getVariantOptionAvailability(
        specs,
        { COLOR: { optionId: "RED" }, SIZE: { optionId: "M" } },
        allVariants,
      ),
    ).toEqual({
      COLOR: { RED: true, BLUE: true },
      SIZE: { S: true, M: true },
    });
  });

  it("disables only options that cannot form an active combination", () => {
    expect(
      getVariantOptionAvailability(
        specs,
        { COLOR: { optionId: "RED" }, SIZE: { optionId: "S" } },
        variants,
      ),
    ).toEqual({
      COLOR: { RED: true, BLUE: true },
      SIZE: { S: true, M: false },
    });
    expect(
      resolveSelectedVariant(
        specs,
        { COLOR: { optionId: "RED" }, SIZE: { optionId: "M" } },
        variants,
      ),
    ).toBeUndefined();
  });

  it("chooses a valid generated variant when the combined defaults are disabled", () => {
    expect(
      getInitialProductSelections(specs, variants, {
        COLOR: { optionId: "RED" },
        SIZE: { optionId: "M" },
        MONOGRAM: { optionId: "NONE" },
      }),
    ).toEqual({
      COLOR: { optionId: "BLUE" },
      SIZE: { optionId: "M" },
      MONOGRAM: { optionId: "NONE" },
    });
  });

  it("ignores ordinary specs while resolving a mixed product variant", () => {
    expect(
      resolveSelectedVariant(
        specs,
        {
          COLOR: { optionId: "BLUE" },
          SIZE: { optionId: "M" },
          MONOGRAM: { optionId: "CUSTOM", value: "COD" },
        },
        variants,
      )?.id,
    ).toBe("blue-m");
  });
});
