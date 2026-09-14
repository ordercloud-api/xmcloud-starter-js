import { asNonEmptyString, asRecord } from "../normalization";
import {
  CheckoutServiceError,
  type CheckoutStatusResponse,
  type StartCheckoutResponse,
} from "./types";

const invalidResponse = (message: string): never => {
  throw new CheckoutServiceError(message, 502);
};

const requireString = (
  record: Record<string, unknown>,
  field: string,
  responseName: string,
): string =>
  asNonEmptyString(record[field], { trim: true }) ??
  invalidResponse(
    `Checkout service returned an invalid ${responseName}: missing ${field}`,
  );

export const toStartCheckoutResponse = (
  value: unknown,
): StartCheckoutResponse => {
  const response =
    asRecord(value) ??
    invalidResponse("Checkout service returned an invalid start response");

  return {
    attemptId: requireString(response, "attemptId", "start response"),
    redirectUrl: requireString(response, "redirectUrl", "start response"),
  };
};

const checkoutStatuses = new Set<CheckoutStatusResponse["status"]>([
  "pending",
  "completed",
  "failed",
  "expired",
]);

export const toCheckoutStatusResponse = (
  value: unknown,
): CheckoutStatusResponse => {
  const response =
    asRecord(value) ??
    invalidResponse("Checkout service returned an invalid status response");
  const status = requireString(response, "status", "status response");
  if (!checkoutStatuses.has(status as CheckoutStatusResponse["status"])) {
    return invalidResponse(
      `Checkout service returned an invalid status response: unknown status ${status}`,
    );
  }

  return {
    attemptId: requireString(response, "attemptId", "status response"),
    status: status as CheckoutStatusResponse["status"],
    orderId: requireString(response, "orderId", "status response"),
  };
};
