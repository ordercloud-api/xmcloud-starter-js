import type { LineItemSpec, Spec, SpecOption } from "ordercloud-javascript-sdk";
import { asNonEmptyString, asRecord } from "../normalization";

export type CommerceProductSpecOption = {
  id: string;
  name: string;
  isOpenText: boolean;
};

export type CommerceProductSpec = {
  id: string;
  name: string;
  required: boolean;
  allowOpenText: boolean;
  definesVariant: boolean;
  defaultOptionId?: string;
  defaultValue?: string;
  options: CommerceProductSpecOption[];
};

export type ProductSpecSelection = {
  optionId?: string;
  value?: string;
};

export type ProductSpecSelections = Record<string, ProductSpecSelection>;

const toSpecOption = (
  value: unknown,
): CommerceProductSpecOption | undefined => {
  const option = value as SpecOption;
  const id = asNonEmptyString(option?.ID, { trim: true });
  const name = asNonEmptyString(option?.Value, { trim: true });
  if (!id || !name) return undefined;

  return { id, name, isOpenText: option?.IsOpenText === true };
};

export const toCommerceProductSpec = (
  value: unknown,
): CommerceProductSpec | undefined => {
  const spec = value as Spec;
  const id = asNonEmptyString(spec?.ID, { trim: true });
  const name = asNonEmptyString(spec?.Name, { trim: true });
  if (!id || !name) return undefined;

  const options = Array.isArray(spec?.Options)
    ? spec.Options.flatMap((option) => {
        const mapped = toSpecOption(option);
        return mapped ? [mapped] : [];
      })
    : [];

  return {
    id,
    name,
    required: spec?.Required === true,
    allowOpenText: spec?.AllowOpenText === true,
    definesVariant: spec?.DefinesVariant === true,
    defaultOptionId: asNonEmptyString(spec?.DefaultOptionID, { trim: true }),
    defaultValue: asNonEmptyString(spec?.DefaultValue, { trim: true }),
    options,
  };
};

export const getInitialSpecSelections = (
  specs: CommerceProductSpec[],
): ProductSpecSelections =>
  Object.fromEntries(
    specs.map((spec) => {
      const defaultOptionId = spec.options.some(
        (option) => option.id === spec.defaultOptionId,
      )
        ? spec.defaultOptionId
        : undefined;
      return [
        spec.id,
        {
          optionId: defaultOptionId,
          value: spec.defaultValue,
        },
      ];
    }),
  );

export const validateSpecSelections = (
  specs: CommerceProductSpec[],
  selections: ProductSpecSelections,
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const spec of specs) {
    const selection = selections[spec.id] ?? {};
    const selectedOption = spec.options.find(
      (option) => option.id === selection.optionId,
    );
    const requiresValue =
      (spec.options.length === 0 && spec.allowOpenText) ||
      selectedOption?.isOpenText === true;

    if (spec.required && spec.options.length === 0 && !spec.allowOpenText) {
      errors[spec.id] = `${spec.name} is unavailable.`;
    } else if (spec.required && spec.options.length > 0 && !selectedOption) {
      errors[spec.id] = `Select ${spec.name}.`;
    } else if (spec.required && requiresValue && !selection.value?.trim()) {
      errors[spec.id] = `Enter ${spec.name}.`;
    } else if (selectedOption?.isOpenText && !selection.value?.trim()) {
      errors[spec.id] = `Enter ${spec.name}.`;
    }
  }

  return errors;
};

export const toLineItemSpecs = (
  specs: CommerceProductSpec[],
  selections: ProductSpecSelections,
): LineItemSpec[] =>
  specs.flatMap((spec) => {
    const selection = selections[spec.id] ?? {};
    const optionId = asNonEmptyString(selection.optionId, { trim: true });
    const value = asNonEmptyString(selection.value, { trim: true });
    if (!optionId && !value) return [];

    return [{ SpecID: spec.id, OptionID: optionId, Value: value }];
  });
