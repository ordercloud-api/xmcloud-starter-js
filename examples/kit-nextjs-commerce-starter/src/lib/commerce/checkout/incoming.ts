import "server-only";
import type Stripe from "stripe";
import type { AccessToken, ListPage, Order, Payment } from "ordercloud-javascript-sdk";
import { orderCloudRequest, orderCloudTokenRequest } from "@/lib/commerce/auth/client";
import { commerceAuthConfig } from "@/lib/commerce/auth/config";
import {
  isTerminalCheckoutStatus,
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

let cachedMiddlewareToken: { token: string; expiresAt: number } | null = null;

const getMiddlewareToken = async (): Promise<string> => {
  if (cachedMiddlewareToken && cachedMiddlewareToken.expiresAt > Date.now() + 30_000) {
    return cachedMiddlewareToken.token;
  }

  if (!commerceAuthConfig.middlewareClientId || !commerceAuthConfig.middlewareClientSecret) {
    throw new Error(
      "Missing ORDERCLOUD_MIDDLEWARE_CLIENT_ID / ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET for gateway order fulfillment",
    );
  }

  const params = new URLSearchParams();
  params.set("grant_type", "client_credentials");
  params.set("client_id", commerceAuthConfig.middlewareClientId);
  params.set("client_secret", commerceAuthConfig.middlewareClientSecret);
  params.set("scope", commerceAuthConfig.middlewareScope);

  const token = await orderCloudTokenRequest<AccessToken>(params);
  if (!token.access_token || !token.expires_in) {
    throw new Error("OrderCloud token response did not include an access token");
  }

  cachedMiddlewareToken = {
    token: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return cachedMiddlewareToken.token;
};

const incomingPath = (orderId: string, suffix = ""): string =>
  `/v1/orders/Incoming/${encodeURIComponent(orderId)}${suffix}`;

const stripePaymentIntentId = (session: Stripe.Checkout.Session): string | null => {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
};

const setIncomingCheckoutStatus = async (
  orderId: string,
  status: GatewayCheckoutStatus,
  costs?: { taxCost?: number; shippingCost?: number },
): Promise<void> => {
  const token = await getMiddlewareToken();
  await orderCloudRequest(
    incomingPath(orderId),
    {
      method: "PATCH",
      body: JSON.stringify({
        ...(costs?.taxCost != null ? { TaxCost: costs.taxCost } : {}),
        ...(costs?.shippingCost != null ? { ShippingCost: costs.shippingCost } : {}),
        xp: { CheckoutStatus: status },
      }),
    },
    token,
  );
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
): Promise<{ orderId: string; idempotent: boolean }> => {
  const orderId = session.metadata?.OrderID?.trim();
  if (!orderId) {
    throw new Error("Event session is missing metadata.OrderID");
  }

  const token = await getMiddlewareToken();
  const order = await orderCloudRequest<Order<IncomingOrderXp>>(
    incomingPath(orderId),
    { method: "GET" },
    token,
  );

  if (isTerminalCheckoutStatus(order.xp?.CheckoutStatus)) {
    return { orderId, idempotent: true };
  }

  const paid =
    session.payment_status === "paid" || session.status === "complete";

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
    await setIncomingCheckoutStatus(orderId, "Pending", {
      taxCost: (session.total_details?.amount_tax ?? 0) / 100,
      shippingCost: (session.total_details?.amount_shipping ?? 0) / 100,
    });
    await createIncomingPayment(orderId, {
      accepted: true,
      amount: (session.amount_total ?? 0) / 100,
      stripeSessionId: session.id,
      stripePaymentIntentId: stripePaymentIntentId(session),
    });
    if (order.Status === "Unsubmitted" || !order.Status) {
      await orderCloudRequest(incomingPath(orderId, "/submit"), { method: "POST" }, token);
    }
  }

  await setIncomingCheckoutStatus(orderId, "Completed");
  return { orderId, idempotent: alreadyPaid };
};
