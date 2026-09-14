import { NextRequest, NextResponse } from 'next/server';
import { readBearerToken } from '@/lib/commerce/auth/bearer-token';
import { assertAdminAccessToClient, GatewayAuthError } from '@/lib/gateway/admin-auth';
import { setStripeConfigValue, type StripeConfigKey } from '@/lib/gateway/config-store';
import { JwtVerificationError } from '@/lib/gateway/jwt';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ clientId: string; configKey: string }> };

const VALID_KEYS = new Set<StripeConfigKey>(['api_key', 'webhook_signing_secret', 'return_url']);

// PoC of the OrderCloud Checkout Gateway's `/config/{client_id}/stripe/...` admin endpoints (see
// storefront-checkout-gateway.contract.md). Secrets are write-only: there is no matching GET.
export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { clientId, configKey } = await context.params;

  if (!VALID_KEYS.has(configKey as StripeConfigKey)) {
    return NextResponse.json({ error: `Unsupported config key: ${configKey}` }, { status: 404 });
  }

  const adminToken = readBearerToken(request);
  if (!adminToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { value?: unknown } | null;
  const value = typeof payload?.value === 'string' ? payload.value.trim() : '';
  if (!value) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 });
  }

  try {
    await assertAdminAccessToClient(adminToken, clientId);
  } catch (error) {
    if (error instanceof GatewayAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof JwtVerificationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    throw error;
  }

  setStripeConfigValue(clientId, configKey as StripeConfigKey, value);

  return new NextResponse(null, { status: 204 });
}
