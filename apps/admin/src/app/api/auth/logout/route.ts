import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  const loginUrl = new URL('/login', request.url);
  const logoutUrl =
    issuer && clientId
      ? new URL(`${issuer}/protocol/openid-connect/logout`)
      : loginUrl;
  if (issuer && clientId) {
    logoutUrl.searchParams.set('client_id', clientId);
    logoutUrl.searchParams.set('post_logout_redirect_uri', loginUrl.toString());
  }
  const response = NextResponse.redirect(logoutUrl);
  response.cookies.delete('lms_access_token');
  response.cookies.delete('lms_refresh_token');
  response.cookies.delete('lms_oidc_state');
  return response;
}
