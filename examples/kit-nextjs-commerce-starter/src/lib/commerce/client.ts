import { CommerceError } from "@sitecore-content-sdk/commerce";
import { OrderCloudError } from "ordercloud-javascript-sdk";

export const hasOrderCloudStatus = (
  error: unknown,
  status: number,
): boolean => {
  if (error instanceof CommerceError) return error.status === status;
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    status?: unknown;
    isOrderCloudError?: unknown;
  };
  return (
    candidate.status === status &&
    (error instanceof OrderCloudError || candidate.isOrderCloudError === true)
  );
};
