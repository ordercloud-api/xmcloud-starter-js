import "server-only";
import type { Order } from "ordercloud-javascript-sdk";
import { orderCloudRequest } from "@/lib/commerce/auth/client";
import { isMiddlewareConfigured } from "@/lib/commerce/auth/config";
import { completeIncomingCheckout } from "./incoming";
import { getStripeClientForApiKey } from "./stripe-client";
import { getStripeCredentialsForClientId } from "./vault";
import {
  isTerminalCheckoutStatus,
  toGatewayCheckoutStatus,
  type GatewayCheckoutStatus,
} from "./status";

type OrderXp = {
  CheckoutStatus?: string;
  stripeSessionId?: string;
};

const outgoingPath = (orderId: string, suffix = ""): string =>
  `/v1/orders/Outgoing/${encodeURIComponent(orderId)}${suffix}`;

const isIgnorableSubmitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : "";
  return /already submitted|not unsubmitted|role/i.test(message);
};

const orderMissingStripeTax = (order: Order<OrderXp>): boolean => !(Number(order.TaxCost) > 0);

export const syncShopperCheckoutFromStripe = async (
  order: Order<OrderXp>,
  shopperToken: string,
  clientId: string,
  stripeSessionId?: string,
): Promise<GatewayCheckoutStatus> => {
  const current = toGatewayCheckoutStatus(order.xp?.CheckoutStatus);
  const shouldBackfillTax = isMiddlewareConfigured() && orderMissingStripeTax(order);
  if (isTerminalCheckoutStatus(current) && !shouldBackfillTax) return current;

  const orderId = order.ID?.trim();
  const sessionId = stripeSessionId?.trim() || order.xp?.stripeSessionId?.trim();
  if (!orderId || !sessionId || !clientId.trim()) return current;

  const credentials = getStripeCredentialsForClientId(clientId);
  const session = await getStripeClientForApiKey(credentials.apiKey).checkout.sessions.retrieve(
    sessionId,
  );

  const paid = session.payment_status === "paid" || session.status === "complete";
  const nextStatus: GatewayCheckoutStatus = paid
    ? "Completed"
    : session.status === "expired"
      ? "Failed"
      : current;
  if (nextStatus === "Pending") return current;

  if (isMiddlewareConfigured()) {
    await completeIncomingCheckout(session, { shopperToken });
    return nextStatus;
  }

  if (paid && (order.Status === "Unsubmitted" || !order.Status)) {
    try {
      await orderCloudRequest(outgoingPath(orderId, "/submit"), { method: "POST" }, shopperToken);
    } catch (error) {
      if (!isIgnorableSubmitError(error)) {
        console.warn("[stripe/status] Outgoing submit skipped:", error instanceof Error ? error.message : error);
      }
    }
  }

  await orderCloudRequest(
    outgoingPath(orderId),
    {
      method: "PATCH",
      body: JSON.stringify({ xp: { CheckoutStatus: nextStatus } }),
    },
    shopperToken,
  );

  return nextStatus;
};
