import { NextResponse } from 'next/server';
import { getOrderCloudAuthCookieName } from '@/lib/commerce/browser-config';
import { requestAnonymousOrderCloudToken } from '@/lib/commerce/client';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  try {
    const { accessToken, expiresIn } = await requestAnonymousOrderCloudToken();
    const maxAge = Math.max(1, Math.floor(expiresIn));
    const tokenCookie = encodeURIComponent(
      JSON.stringify({ accessToken, expiresAt: Date.now() + maxAge * 1000 })
    );
    const response = NextResponse.json({ ok: true, accessToken, expiresIn: maxAge });
    response.cookies.set({
      name: getOrderCloudAuthCookieName(),
      value: tokenCookie,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge,
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create anonymous token';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
