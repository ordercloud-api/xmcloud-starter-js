import type { CommerceCartItemSpec } from "./types";

export const formatMoney = (amount?: number, currency?: string): string => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};

export const lineTotal = (
  quantity: number,
  unitPrice?: number,
): number | undefined => {
  if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice)) {
    return undefined;
  }
  return quantity * unitPrice;
};

export const toCartItemSpecLabels = (
  specs?: CommerceCartItemSpec[],
): string[] =>
  (specs ?? []).flatMap((spec) => {
    const name = spec.name?.trim();
    const value = spec.value?.trim();
    if (name && value) return [`${name}: ${value}`];
    if (value) return [value];
    if (name) return [name];
    return [];
  });
