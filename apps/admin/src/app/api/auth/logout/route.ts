import { NextResponse } from 'next/server';

/**
 * End the Keycloak SSO session and return the operator to the LMS.
 *
 * Keycloak only accepts `post_logout_redirect_uri` when the value is registered
 * on the client (`attributes."post.logout.redirect.uris"`), otherwise it refuses
 * the redirect and shows its own logout page. The deploy workflow is what
 * registers that allow-list; this route simply states the intended target.
 */
export async function GET(request: Request) {
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const baseUrl = `${protocol}://${host}`;
  const homeUrl = new URL('/', baseUrl);
  const logoutUrl =
    issuer && clientId
      ? new URL(`${issuer}/protocol/openid-connect/logout`)
      : homeUrl;
  if (issuer && clientId) {
    logoutUrl.searchParams.set('client_id', clientId);
    logoutUrl.searchParams.set('post_logout_redirect_uri', homeUrl.toString());
  }
  const response = NextResponse.redirect(logoutUrl);
  response.cookies.delete('lms_access_token');
  response.cookies.delete('lms_refresh_token');
  response.cookies.delete('lms_oidc_state');
  return response;
}
