import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  if (!code || !state || state !== cookieStore.get('lms_oidc_state')?.value)
    return new NextResponse('Invalid OIDC callback', { status: 400 });
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  if (!issuer || !clientId)
    return new NextResponse('OIDC is not configured', { status: 500 });
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const redirectUri = new URL('/api/auth/callback', `${protocol}://${host}`).toString();
  const tokenResponse = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code, redirect_uri: redirectUri }),
    cache: 'no-store',
  });
  if (!tokenResponse.ok)
    return new NextResponse('OIDC token exchange failed', { status: 502 });
  const token = (await tokenResponse.json()) as { access_token?: string; expires_in?: number };
  if (!token.access_token) return new NextResponse('OIDC token missing', { status: 502 });
  const response = NextResponse.redirect(new URL('/', `${protocol}://${host}`));
  response.cookies.set('lms_access_token', token.access_token, {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: token.expires_in ?? 300, path: '/',
  });
  response.cookies.delete('lms_oidc_state');
  return response;
}
