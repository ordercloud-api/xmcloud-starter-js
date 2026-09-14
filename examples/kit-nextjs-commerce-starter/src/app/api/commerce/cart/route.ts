import { NextRequest, NextResponse } from "next/server";
import { getOrderCloudAuthCookieName } from "@/lib/commerce/browser-config";
import { getCart } from "@/lib/commerce/cart/service";

export const dynamic = "force-dynamic";

const readAccessTokenFromCookie = (request: NextRequest): string | null => {
  const rawCookie = request.cookies.get(getOrderCloudAuthCookieName())?.value;
  if (!rawCookie) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookie)) as {
      accessToken?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof parsed.accessToken !== "string" ||
      !parsed.accessToken.trim() ||
      typeof parsed.expiresAt !== "number" ||
      !Number.isFinite(parsed.expiresAt) ||
      parsed.expiresAt <= Date.now() + 60_000
    ) {
      return null;
    }
    return parsed.accessToken;
  } catch {
    return null;
  }
};

const readAccessTokenFromAuthorizationHeader = (
  request: NextRequest,
): string | null => {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer" || !token.trim()) {
    return null;
  }

  return token.trim();
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const shopperToken =
    readAccessTokenFromAuthorizationHeader(request) ??
    readAccessTokenFromCookie(request);
  if (!shopperToken) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const payload = await getCart(shopperToken);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load cart";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
