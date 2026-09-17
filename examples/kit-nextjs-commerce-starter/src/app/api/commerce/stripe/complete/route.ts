import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { completeIncomingCheckout } from "@/lib/commerce/checkout/incoming";
import { getStripeClientForApiKey } from "@/lib/commerce/checkout/stripe-client";
import { getStripeCredentialsForClientId } from "@/lib/commerce/checkout/vault";
import {
  isCheckoutSessionEventType,
  readClientIdFromRawEvent,
  readEventTypeFromRawEvent,
} from "@/lib/commerce/checkout/webhook-event";

export const dynamic = "force-dynamic";

const ignored = (reason: string): NextResponse =>
  NextResponse.json({ received: true, ignored: true, reason });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  const rawText = rawBody.toString("utf8");
  const eventType = readEventTypeFromRawEvent(rawText);
  if (!isCheckoutSessionEventType(eventType)) {
    return ignored(eventType ? `Unhandled event type ${eventType}` : "Missing event type");
  }

  const clientId = readClientIdFromRawEvent(rawText);
  if (!clientId) {
    return ignored("Checkout session is missing metadata.ClientID");
  }

  let credentials;
  try {
    credentials = getStripeCredentialsForClientId(clientId);
  } catch {
    return NextResponse.json(
      { error: `No Stripe webhook configuration for client_id ${clientId}` },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripeClientForApiKey(credentials.apiKey).webhooks.constructEvent(
      rawBody,
      signature,
      credentials.webhookSigningSecret,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const verifiedClientId = session.metadata?.ClientID?.trim();
  if (!verifiedClientId || verifiedClientId.toLowerCase() !== clientId.toLowerCase()) {
    return NextResponse.json(
      { error: "Verified metadata.ClientID does not match the signing secret lookup" },
      { status: 400 },
    );
  }

  try {
    const result = await completeIncomingCheckout(session);
    if (result.skipped) {
      console.warn(
        "[stripe/complete] Acknowledged checkout.session event without Incoming pay/submit; ORDERCLOUD_MIDDLEWARE_CLIENT_ID / ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET are not set",
      );
    }
    return NextResponse.json({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fulfillment failed";
    console.error("[stripe/complete]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}