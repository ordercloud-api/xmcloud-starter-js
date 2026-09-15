import type {
  LineItemSpec,
  PriceMarkupType,
  Spec,
  SpecOption,
} from "ordercloud-javascript-sdk";
import { asFiniteNumber, asNonEmptyString, asRecord } from "../normalization";

export const productSpecOptionControls = [
  "dropdown",
  "buttons",
  "radio",
  "swatches",
  "images",
  "cards",
] as const;
export type ProductSpecOptionControl =
  (typeof productSpecOptionControls)[number];

export const productSpecTextControls = [
  "text",
  "textarea",
  "number",
  "date",
] as const;
export type ProductSpecTextControl = (typeof productSpecTextControls)[number];

export type ProductSpecPresentation = {
  control?: ProductSpecOptionControl;
  textControl?: ProductSpecTextControl;
  label?: string;
  helpText?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
};

export type ProductSpecValidation = {
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  minDate?: string;
  maxDate?: string;
};

export type ProductSpecOptionPresentation = {
  label?: string;
  description?: string;
  color?: string;
  imageUrl?: string;
  badge?: string;
};

export type CommerceProductSpecOption = {
  id: string;
  name: string;
  isOpenText: boolean;
  priceMarkupType?: PriceMarkupType;
  priceMarkup?: number;
  presentation: ProductSpecOptionPresentation;
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
  presentation: ProductSpecPresentation;
  validation: ProductSpecValidation;
};

export type ProductSpecSelection = {
  optionId?: string;
  value?: string;
};
export type ProductSpecSelections = Record<string, ProductSpecSelection>;

const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : undefined;

const nonNegativeInteger = (value: unknown): number | undefined => {
  const number = asFiniteNumber(value, { allowNumericString: true });
  return number !== undefined && number >= 0 ? Math.floor(number) : undefined;
};

const safeImageUrl = (value: unknown): string | undefined => {
  const url = asNonEmptyString(value, { trim: true });
  return url && /^(https?:\/\/|\/(?!\/))/i.test(url) ? url : undefined;
};

const safeColor = (value: unknown): string | undefined => {
  const color = asNonEmptyString(value, { trim: true });
  return color &&
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)
    ? color
    : undefined;
};

const safeDateConstraint = (value: unknown): string | undefined => {
  const date = asNonEmptyString(value, { trim: true });
  return date === "today" || (date && /^\d{4}-\d{2}-\d{2}$/.test(date))
    ? date
    : undefined;
};

const toSpecPresentation = (value: unknown): ProductSpecPresentation => {
  const presentation = asRecord(asRecord(value)?.presentation);
  return {
    control: oneOf(presentation?.control, productSpecOptionControls),
    textControl: oneOf(presentation?.textControl, productSpecTextControls),
    label: asNonEmptyString(presentation?.label, { trim: true }),
    helpText: asNonEmptyString(presentation?.helpText, { trim: true }),
    placeholder: asNonEmptyString(presentation?.placeholder, { trim: true }),
    prefix: asNonEmptyString(presentation?.prefix, { trim: true }),
    suffix: asNonEmptyString(presentation?.suffix, { trim: true }),
  };
};

const toSpecValidation = (value: unknown): ProductSpecValidation => {
  const validation = asRecord(asRecord(value)?.validation);
  return {
    min: asFiniteNumber(validation?.min, { allowNumericString: true }),
    max: asFiniteNumber(validation?.max, { allowNumericString: true }),
    step: asFiniteNumber(validation?.step, { allowNumericString: true }),
    minLength: nonNegativeInteger(validation?.minLength),
    maxLength: nonNegativeInteger(validation?.maxLength),
    minDate: safeDateConstraint(validation?.minDate),
    maxDate: safeDateConstraint(validation?.maxDate),
  };
};

const toOptionPresentation = (
  value: unknown,
): ProductSpecOptionPresentation => {
  const presentation = asRecord(asRecord(value)?.presentation);
  return {
    label: asNonEmptyString(presentation?.label, { trim: true }),
    description: asNonEmptyString(presentation?.description, { trim: true }),
    color: safeColor(presentation?.color),
    imageUrl: safeImageUrl(presentation?.imageUrl),
    badge: asNonEmptyString(presentation?.badge, { trim: true }),
  };
};

const toSpecOption = (
  value: unknown,
): CommerceProductSpecOption | undefined => {
  const option = value as SpecOption;
  const id = asNonEmptyString(option?.ID, { trim: true });
  const name = asNonEmptyString(option?.Value, { trim: true });
  if (!id || !name) return undefined;

  return {
    id,
    name,
    isOpenText: option?.IsOpenText === true,
    priceMarkupType: oneOf(option?.PriceMarkupType, [
      "NoMarkup",
      "AmountPerQuantity",
      "AmountTotal",
      "Percentage",
    ] satisfies readonly PriceMarkupType[]),
    priceMarkup: asFiniteNumber(option?.PriceMarkup),
    presentation: toOptionPresentation(option?.xp),
  };
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
    presentation: toSpecPresentation(spec?.xp),
    validation: toSpecValidation(spec?.xp),
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
      return [spec.id, { optionId: defaultOptionId, value: spec.defaultValue }];
    }),
  );

export const resolveDateConstraint = (value?: string): string | undefined => {
  if (value !== "today") return value;
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

const getValueValidationError = (
  spec: CommerceProductSpec,
  value: string,
): string | undefined => {
  const label = spec.presentation.label ?? spec.name;
  const { validation } = spec;
  const textControl = spec.presentation.textControl ?? "text";

  if (validation.minLength !== undefined && value.length < validation.minLength)
    return `${label} must be at least ${validation.minLength} characters.`;
  if (validation.maxLength !== undefined && value.length > validation.maxLength)
    return `${label} must be at most ${validation.maxLength} characters.`;

  if (textControl === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) return `Enter a valid ${label}.`;
    if (validation.min !== undefined && number < validation.min)
      return `${label} must be at least ${validation.min}.`;
    if (validation.max !== undefined && number > validation.max)
      return `${label} must be at most ${validation.max}.`;
    if (validation.step !== undefined && validation.step > 0) {
      const stepBase = validation.min ?? 0;
      const remainder = Math.abs((number - stepBase) % validation.step);
      if (
        remainder > Number.EPSILON * 10 &&
        Math.abs(remainder - validation.step) > Number.EPSILON * 10
      )
        return `${label} must use increments of ${validation.step}.`;
    }
  }

  if (textControl === "date") {
    const minDate = resolveDateConstraint(validation.minDate);
    const maxDate = resolveDateConstraint(validation.maxDate);
    if (minDate && value < minDate)
      return `${label} must be on or after ${minDate}.`;
    if (maxDate && value > maxDate)
      return `${label} must be on or before ${maxDate}.`;
  }

  return undefined;
};

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
    const label = spec.presentation.label ?? spec.name;
    const value = selection.value?.trim();

    if (spec.required && spec.options.length === 0 && !spec.allowOpenText) {
      errors[spec.id] = `${label} is unavailable.`;
    } else if (spec.required && spec.options.length > 0 && !selectedOption) {
      errors[spec.id] = `Select ${label}.`;
    } else if (
      (spec.required && requiresValue && !value) ||
      (selectedOption?.isOpenText && !value)
    ) {
      errors[spec.id] = `Enter ${label}.`;
    } else if (requiresValue && value) {
      const validationError = getValueValidationError(spec, value);
      if (validationError) errors[spec.id] = validationError;
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
