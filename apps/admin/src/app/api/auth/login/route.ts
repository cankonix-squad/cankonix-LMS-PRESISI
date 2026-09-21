import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  if (!issuer || !clientId)
    return new NextResponse('OIDC is not configured', { status: 500 });
  const state = crypto.randomUUID();
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const redirectUri = new URL('/api/auth/callback', `${protocol}://${host}`).toString();
  const url = new URL(`${issuer}/protocol/openid-connect/auth`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  const response = NextResponse.redirect(url);
  response.cookies.set('lms_oidc_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
