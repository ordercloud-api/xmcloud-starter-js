import { NextRequest, NextResponse } from "next/server";
import type { Order } from "ordercloud-javascript-sdk";
import { orderCloudRequest } from "@/lib/commerce/auth/client";
import { readBearerToken } from "@/lib/commerce/auth/bearer-token";
import { JwtVerificationError, verifyOrderCloudJwt } from "@/lib/commerce/auth/verify-jwt";
import { toGatewayCheckoutStatus } from "@/lib/commerce/checkout/status";

export const dynamic = "force-dynamic";

type OrderXp = { CheckoutStatus?: string };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const shopperToken = readBearerToken(request);
  if (!shopperToken) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    await verifyOrderCloudJwt(shopperToken);
  } catch (error) {
    const message =
      error instanceof JwtVerificationError ? error.message : "Token verification failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  try {
    const order = await orderCloudRequest<Order<OrderXp>>(
      `/v1/orders/Outgoing/${encodeURIComponent(orderId)}`,
      { method: "GET" },
      shopperToken,
    );

    return NextResponse.json({
      orderId: order.ID ?? orderId,
      checkoutStatus: toGatewayCheckoutStatus(order.xp?.CheckoutStatus),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load order status";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
