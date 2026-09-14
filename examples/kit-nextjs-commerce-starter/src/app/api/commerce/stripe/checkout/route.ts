import { NextRequest, NextResponse } from "next/server";
import { Me } from "ordercloud-javascript-sdk";
import { readOrderCloudClientId } from "@/lib/commerce/auth/shopper-jwt";
import { readBearerToken } from "@/lib/commerce/auth/bearer-token";
import {
  configureOrderCloudSdk,
  hasOrderCloudStatus,
} from "@/lib/commerce/client";
import { getCart, markCartCheckoutPending } from "@/lib/commerce/cart/service";
import { createHostedCheckoutSession } from "@/lib/commerce/checkout/session";
import { getStripeCredentialsForClientId } from "@/lib/commerce/checkout/vault";

export const dynamic = "force-dynamic";

const isSameOriginRequest = (request: NextRequest): boolean => {
  const origin = request.headers.get("origin");
  return !!origin && origin === request.nextUrl.origin;
};

const getErrorStatus = (message: string): number => {
  if (message === "Authentication required") return 401;
  if (message === "Cart is empty" || message === "Cart is missing an OrderCloud order id") {
    return 400;
  }
  if (message.startsWith("Missing required checkout configuration")) return 503;
  if (
    message === "Invalid OrderCloud access token" ||
    message === "OrderCloud access token is missing cid"
  ) {
    return 401;
  }
  return 502;
};

const verifyShopperToken = async (shopperToken: string): Promise<void> => {
  configureOrderCloudSdk();
  try {
    await Me.Get({ accessToken: shopperToken });
  } catch (error) {
    if (hasOrderCloudStatus(error, 401) || hasOrderCloudStatus(error, 403)) {
      throw new Error("Authentication required");
    }
    throw error;
  }
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const shopperToken = readBearerToken(request);
  if (!shopperToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    await verifyShopperToken(shopperToken);
    const clientId = readOrderCloudClientId(shopperToken);
    const credentials = getStripeCredentialsForClientId(clientId);
    const cart = await getCart(shopperToken);
    const checkout = await createHostedCheckoutSession(
      cart,
      credentials,
      clientId,
    );
    await markCartCheckoutPending(shopperToken, {
      clientId,
      stripeSessionId: checkout.sessionId,
    });
    return NextResponse.json(
      {
        orderId: checkout.orderId,
        redirectUrl: checkout.url,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
