import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReadinessReport = {
  ready: boolean;
  webhookReady: boolean;
  checks: {
    stripeSecretKey: boolean;
    stripeWebhookSecret: boolean;
    stripeConnectedAccountId: boolean;
    appUrl: boolean;
    middlewareClientId: boolean;
    middlewareClientSecret: boolean;
    orderCloudBuyerClientId: boolean;
    orderCloudBuyerId: boolean;
  };
  notes: string[];
};

const hasValue = (name: string): boolean => Boolean(process.env[name]?.trim());

export async function GET(): Promise<NextResponse<ReadinessReport>> {
  const checks = {
    stripeSecretKey: hasValue('STRIPE_SECRET_KEY'),
    stripeWebhookSecret: hasValue('STRIPE_WEBHOOK_SECRET'),
    stripeConnectedAccountId: hasValue('STRIPE_CONNECTED_ACCOUNT_ID'),
    appUrl: hasValue('NEXT_PUBLIC_SITE_URL') || hasValue('NEXT_PUBLIC_BASE_URL') || hasValue('NEXT_PUBLIC_APP_URL'),
    middlewareClientId: hasValue('ORDERCLOUD_MIDDLEWARE_CLIENT_ID'),
    middlewareClientSecret: hasValue('ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET'),
    orderCloudBuyerClientId: hasValue('ORDERCLOUD_BUYER_CLIENT_ID'),
    orderCloudBuyerId: hasValue('ORDERCLOUD_DEFAULT_BUYER_ID'),
  };

  const notes: string[] = [];

  if (!checks.stripeSecretKey || !checks.stripeWebhookSecret || !checks.stripeConnectedAccountId) {
    notes.push('Connect checkout cannot start until Stripe server variables are present.');
  }

  if (!checks.appUrl) {
    notes.push('Success/cancel redirects require NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_BASE_URL / NEXT_PUBLIC_APP_URL).');
  }

  if (!checks.middlewareClientId || !checks.middlewareClientSecret) {
    notes.push('Webhook cannot submit OrderCloud order without middleware client credentials.');
  }

  if (!checks.orderCloudBuyerClientId || !checks.orderCloudBuyerId) {
    notes.push('Shopper auth and cart/product flows need ORDERCLOUD_BUYER_CLIENT_ID and ORDERCLOUD_DEFAULT_BUYER_ID.');
  }

  const ready =
    checks.stripeSecretKey &&
    checks.stripeWebhookSecret &&
    checks.stripeConnectedAccountId &&
    checks.appUrl;

  const webhookReady = checks.middlewareClientId && checks.middlewareClientSecret;

  return NextResponse.json(
    {
      ready,
      webhookReady,
      checks,
      notes,
    },
    { status: ready ? 200 : 503 }
  );
}
