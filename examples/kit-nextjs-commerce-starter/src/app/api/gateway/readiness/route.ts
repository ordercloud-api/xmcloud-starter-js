import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ReadinessReport = {
  ready: boolean;
  checks: {
    testModeConfigured: boolean;
    defaultClientConfigured: boolean;
    middlewareClientId: boolean;
    middlewareClientSecret: boolean;
  };
  notes: string[];
};

const hasValue = (name: string): boolean => Boolean(process.env[name]?.trim());

export async function GET(): Promise<NextResponse<ReadinessReport>> {
  const testModeEnabled = process.env.CHECKOUT_GATEWAY_TEST_MODE?.trim() === 'true';

  const checks = {
    testModeConfigured: !testModeEnabled || hasValue('CHECKOUT_GATEWAY_TEST_JWT_SECRET'),
    defaultClientConfigured:
      hasValue('CHECKOUT_GATEWAY_DEFAULT_CLIENT_ID') &&
      hasValue('CHECKOUT_GATEWAY_DEFAULT_STRIPE_API_KEY') &&
      hasValue('CHECKOUT_GATEWAY_DEFAULT_STRIPE_WEBHOOK_SECRET') &&
      hasValue('CHECKOUT_GATEWAY_DEFAULT_RETURN_URL'),
    middlewareClientId: hasValue('ORDERCLOUD_MIDDLEWARE_CLIENT_ID'),
    middlewareClientSecret: hasValue('ORDERCLOUD_MIDDLEWARE_CLIENT_SECRET'),
  };

  const notes: string[] = [];
  if (!checks.testModeConfigured) {
    notes.push('CHECKOUT_GATEWAY_TEST_MODE is enabled but CHECKOUT_GATEWAY_TEST_JWT_SECRET is unset.');
  }
  if (!checks.defaultClientConfigured) {
    notes.push(
      'Seed a PoC client via CHECKOUT_GATEWAY_DEFAULT_CLIENT_ID / _STRIPE_API_KEY / _STRIPE_WEBHOOK_SECRET / _RETURN_URL, or PUT /api/gateway/config/{client_id}/stripe/{key}.'
    );
  }
  if (!checks.middlewareClientId || !checks.middlewareClientSecret) {
    notes.push('The /stripe/complete webhook needs ORDERCLOUD_MIDDLEWARE_CLIENT_ID / _CLIENT_SECRET to submit orders.');
  }

  const ready = checks.testModeConfigured && checks.middlewareClientId && checks.middlewareClientSecret;

  return NextResponse.json({ ready, checks, notes }, { status: ready ? 200 : 503 });
}
