import type { Variant } from "ordercloud-javascript-sdk";
import { asNonEmptyString } from "../normalization";
import type { CommerceProductSpec, ProductSpecSelections } from "./specs";

export type CommerceProductVariant = {
  id: string;
  active: boolean;
  specs: Record<string, string>;
};

export type ProductSpecOptionAvailability = Record<
  string,
  Record<string, boolean>
>;

export const toCommerceProductVariant = (
  value: unknown,
): CommerceProductVariant | undefined => {
  const variant = value as Variant;
  const id = asNonEmptyString(variant?.ID, { trim: true });
  if (!id) return undefined;

  const specs = Object.fromEntries(
    (Array.isArray(variant.Specs) ? variant.Specs : []).flatMap((spec) => {
      const specId = asNonEmptyString(spec?.SpecID, { trim: true });
      const optionId = asNonEmptyString(spec?.OptionID, { trim: true });
      return specId && optionId ? [[specId, optionId]] : [];
    }),
  );

  return { id, active: variant.Active !== false, specs };
};

const getVariantSpecs = (specs: CommerceProductSpec[]) =>
  specs.filter((spec) => spec.definesVariant);

const variantMatchesSelections = (
  variant: CommerceProductVariant,
  variantSpecs: CommerceProductSpec[],
  selections: ProductSpecSelections,
  ignoredSpecId?: string,
): boolean =>
  variant.active &&
  variantSpecs.every((spec) => {
    if (spec.id === ignoredSpecId) return true;
    const selectedOptionId = selections[spec.id]?.optionId;
    return !selectedOptionId || variant.specs[spec.id] === selectedOptionId;
  });

export const resolveSelectedVariant = (
  specs: CommerceProductSpec[],
  selections: ProductSpecSelections,
  variants: CommerceProductVariant[],
): CommerceProductVariant | undefined => {
  const variantSpecs = getVariantSpecs(specs);
  if (variantSpecs.length === 0) return undefined;
  if (variantSpecs.some((spec) => !selections[spec.id]?.optionId))
    return undefined;

  return variants.find((variant) =>
    variantMatchesSelections(variant, variantSpecs, selections),
  );
};

export const getVariantOptionAvailability = (
  specs: CommerceProductSpec[],
  selections: ProductSpecSelections,
  variants: CommerceProductVariant[],
): ProductSpecOptionAvailability => {
  const variantSpecs = getVariantSpecs(specs);
  return Object.fromEntries(
    variantSpecs.map((spec) => [
      spec.id,
      Object.fromEntries(
        spec.options.map((option) => [
          option.id,
          variants.some(
            (variant) =>
              variant.specs[spec.id] === option.id &&
              variantMatchesSelections(
                variant,
                variantSpecs,
                selections,
                spec.id,
              ),
          ),
        ]),
      ),
    ]),
  );
};

export const getInitialProductSelections = (
  specs: CommerceProductSpec[],
  variants: CommerceProductVariant[],
  initialSelections: ProductSpecSelections,
): ProductSpecSelections => {
  const variantSpecs = getVariantSpecs(specs);
  if (variantSpecs.length === 0) return initialSelections;

  const exactDefault = resolveSelectedVariant(
    specs,
    initialSelections,
    variants,
  );
  if (exactDefault) return initialSelections;

  const selectedVariant = variants
    .filter((variant) =>
      variantSpecs.every((spec) => Boolean(variant.specs[spec.id])),
    )
    .sort((left, right) => {
      const defaultMatches = (variant: CommerceProductVariant) =>
        variantSpecs.filter(
          (spec) =>
            initialSelections[spec.id]?.optionId === variant.specs[spec.id],
        ).length;
      return (
        defaultMatches(right) - defaultMatches(left) ||
        left.id.localeCompare(right.id)
      );
    })[0];

  if (!selectedVariant) return initialSelections;

  return {
    ...initialSelections,
    ...Object.fromEntries(
      variantSpecs.map((spec) => [
        spec.id,
        { optionId: selectedVariant.specs[spec.id] },
      ]),
    ),
  };
};
