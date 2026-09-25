import "server-only";

import { timingSafeEqual } from "node:crypto";

export const isValidEditingSecret = (provided: string | null): boolean => {
  const configured = process.env.SITECORE_EDITING_SECRET?.trim();
  if (!configured || !provided) return false;

  const configuredBytes = Buffer.from(configured);
  const providedBytes = Buffer.from(provided);
  return (
    configuredBytes.length === providedBytes.length &&
    timingSafeEqual(configuredBytes, providedBytes)
  );
};
