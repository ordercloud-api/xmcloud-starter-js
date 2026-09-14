export interface StringNormalizationOptions {
  trim?: boolean;
}

export interface NumberNormalizationOptions {
  allowNumericString?: boolean;
}

export const asNonEmptyString = (
  value: unknown,
  options: StringNormalizationOptions = {},
): string | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return options.trim ? trimmed : value;
};

export const asFiniteNumber = (
  value: unknown,
  options: NumberNormalizationOptions = {},
): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (
    !options.allowNumericString ||
    typeof value !== "string" ||
    !value.trim()
  ) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const asRecord = (
  value: unknown,
): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
