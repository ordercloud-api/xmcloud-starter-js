import "server-only";
import type Stripe from "stripe";
import type { ListPage, Order, Payment } from "ordercloud-javascript-sdk";
import { orderCloudRequest, requestMiddlewareOrderCloudToken } from "@/lib/commerce/auth/client";
import { isMiddlewareConfigured } from "@/lib/commerce/auth/config";
import {
  isTerminalCheckoutStatus,
  toGatewayCheckoutStatus,
  type GatewayCheckoutStatus,
} from "./status";

type IncomingOrderXp = {
  CheckoutStatus?: GatewayCheckoutStatus | string;
  stripeSessionId?: string;
  ocClientId?: string;
};

type IncomingPaymentXp = {
  stripeSessionId?: string;
  stripePaymentIntentId?: string | null;
};

export type CompleteIncomingOptions = {
  /** Buyer token used to submit Outgoing when the seller cannot yet see Incoming. */
  shopperToken?: string;
};

type StripeOrderCosts = {
  taxCost: number;
  shippingCost: number;
};

let cachedMiddlewareToken: { token: string; expiresAt: number } | null = null;

const getMiddlewareToken = async (): Promise<string> => {
  if (cachedMiddlewareToken && cachedMiddlewareToken.expiresAt > Date.now() + 30_000) {
    return cachedMiddlewareToken.token;
  }

  const tokenResponse = await requestMiddlewareOrderCloudToken();
  cachedMiddlewareToken = {
    token: tokenResponse.accessToken,
    expiresAt: Date.now() + tokenResponse.expiresIn * 1000,
  };
  return cachedMiddlewareToken.token;
};

const incomingPath = (orderId: string, suffix = ""): string =>
  `/v1/orders/Incoming/${encodeURIComponent(orderId)}${suffix}`;

const outgoingSubmitPath = (orderId: string): string =>
  `/v1/orders/Outgoing/${encodeURIComponent(orderId)}/submit`;

const stripePaymentIntentId = (session: Stripe.Checkout.Session): string | null => {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
};

const toStripeOrderCosts = (session: Stripe.Checkout.Session): StripeOrderCosts => ({
  taxCost: (session.total_details?.amount_tax ?? 0) / 100,
  shippingCost: (session.total_details?.amount_shipping ?? 0) / 100,
});

const needsStripeCostSync = (order: Order<IncomingOrderXp>, costs: StripeOrderCosts): boolean =>
  (costs.taxCost > 0 && !(Number(order.TaxCost) > 0)) ||
  (costs.shippingCost > 0 && !(Number(order.ShippingCost) > 0));

const isNotFoundError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /object not found|not found/i.test(message);
};

const isIgnorableSubmitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : "";
  return /already submitted|not unsubmitted/i.test(message);
};

const hasStripeCosts = (costs?: { taxCost?: number; shippingCost?: number }): boolean =>
  (costs?.taxCost ?? 0) > 0 || (costs?.shippingCost ?? 0) > 0;

const getIncomingOrder = async (
  orderId: string,
  token: string,
): Promise<Order<IncomingOrderXp>> =>
  orderCloudRequest<Order<IncomingOrderXp>>(incomingPath(orderId), { method: "GET" }, token);

const submitOutgoingAsShopper = async (orderId: string, shopperToken: string): Promise<void> => {
  try {
    await orderCloudRequest(outgoingSubmitPath(orderId), { method: "POST" }, shopperToken);
  } catch (error) {
    if (!isIgnorableSubmitError(error)) throw error;
  }
};

/**
 * Unsubmitted buyer carts are often invisible on Incoming. Submit Outgoing first so
 * the seller can PATCH Stripe TaxCost onto the order.
 */
const resolveIncomingOrder = async (
  orderId: string,
  middlewareToken: string,
  shopperToken?: string,
): Promise<Order<IncomingOrderXp>> => {
  try {
    return await getIncomingOrder(orderId, middlewareToken);
  } catch (error) {
    if (!shopperToken || !isNotFoundError(error)) throw error;
    await submitOutgoingAsShopper(orderId, shopperToken);
    return await getIncomingOrder(orderId, middlewareToken);
  }
};

const setIncomingCheckoutStatus = async (
  orderId: string,
  status: GatewayCheckoutStatus,
  costs?: { taxCost?: number; shippingCost?: number },
): Promise<void> => {
  const token = await getMiddlewareToken();
  const patchOrder = async (includeCosts: boolean): Promise<void> => {
    await orderCloudRequest(
      incomingPath(orderId),
      {
        method: "PATCH",
        body: JSON.stringify({
          ...(includeCosts && costs?.taxCost != null ? { TaxCost: costs.taxCost } : {}),
          ...(includeCosts && costs?.shippingCost != null ? { ShippingCost: costs.shippingCost } : {}),
          xp: { CheckoutStatus: status },
        }),
      },
      token,
    );
  };

  try {
    await patchOrder(true);
  } catch (error) {
    if (!costs || hasStripeCosts(costs)) throw error;
    console.warn(
      "[stripe/complete] Incoming cost PATCH failed; continuing without TaxCost/ShippingCost:",
      error instanceof Error ? error.message : error,
    );
    await patchOrder(false);
  }
};

const createIncomingPayment = async (
  orderId: string,
  input: {
    accepted: boolean;
    amount: number;
    stripeSessionId: string;
    stripePaymentIntentId?: string | null;
  },
): Promise<void> => {
  const token = await getMiddlewareToken();
  await orderCloudRequest(
    incomingPath(orderId, "/payments"),
    {
      method: "POST",
      body: JSON.stringify({
        Type: "CreditCard",
        Accepted: input.accepted,
        Amount: input.amount,
        xp: {
          stripeSessionId: input.stripeSessionId,
          stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        },
      }),
    },
    token,
  );
};

export const completeIncomingCheckout = async (
  session: Stripe.Checkout.Session,
  options?: CompleteIncomingOptions,
): Promise<{ orderId: string; idempotent: boolean; skipped?: boolean }> => {
  const orderId = session.metadata?.OrderID?.trim();
  if (!orderId) {
    throw new Error("Event session is missing metadata.OrderID");
  }

  if (!isMiddlewareConfigured()) {
    return { orderId, idempotent: false, skipped: true };
  }

  const token = await getMiddlewareToken();
  const order = await resolveIncomingOrder(orderId, token, options?.shopperToken);
  const costs = toStripeOrderCosts(session);

  if (costs.taxCost > 0 || costs.shippingCost > 0) {
    console.info(
      `[stripe/complete] Syncing Stripe costs onto Incoming ${orderId}: tax=${costs.taxCost} shipping=${costs.shippingCost}`,
    );
  }

  if (isTerminalCheckoutStatus(order.xp?.CheckoutStatus)) {
    if (needsStripeCostSync(order, costs)) {
      await setIncomingCheckoutStatus(
        orderId,
        toGatewayCheckoutStatus(order.xp?.CheckoutStatus),
        costs,
      );
    }
    return { orderId, idempotent: true };
  }

  const paid = session.payment_status === "paid" || session.status === "complete";

  if (!paid) {
    await createIncomingPayment(orderId, {
      accepted: false,
      amount: (session.amount_total ?? 0) / 100,
      stripeSessionId: session.id,
    });
    await setIncomingCheckoutStatus(orderId, "Failed");
    return { orderId, idempotent: false };
  }

  const payments = await orderCloudRequest<ListPage<Payment<IncomingPaymentXp>>>(
    incomingPath(orderId, "/payments"),
    { method: "GET" },
    token,
  );
  const alreadyPaid = (payments.Items ?? []).some(
    (payment) => payment.xp?.stripeSessionId === session.id,
  );

  if (!alreadyPaid) {
    await setIncomingCheckoutStatus(orderId, "Pending", costs);
    await createIncomingPayment(orderId, {
      accepted: true,
      amount: (session.amount_total ?? 0) / 100,
      stripeSessionId: session.id,
      stripePaymentIntentId: stripePaymentIntentId(session),
    });
    if (order.Status === "Unsubmitted" || !order.Status) {
      await orderCloudRequest(incomingPath(orderId, "/submit"), { method: "POST" }, token);
    }
  } else if (needsStripeCostSync(order, costs)) {
    await setIncomingCheckoutStatus(orderId, "Pending", costs);
  }

  await setIncomingCheckoutStatus(orderId, "Completed", costs);
  return { orderId, idempotent: alreadyPaid };
};
