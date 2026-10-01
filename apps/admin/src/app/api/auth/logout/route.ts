import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const loginUrl = new URL('/login', `${protocol}://${host}`);
  const logoutUrl =
    issuer && clientId
      ? new URL(`${issuer}/protocol/openid-connect/logout`)
      : loginUrl;
  if (issuer && clientId) {
    logoutUrl.searchParams.set('client_id', clientId);
  }
  const response = NextResponse.redirect(logoutUrl);
  response.cookies.delete('lms_access_token');
  response.cookies.delete('lms_refresh_token');
  response.cookies.delete('lms_oidc_state');
  return response;
}
