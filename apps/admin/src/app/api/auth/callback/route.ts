import { NextResponse } from 'next/server';
import { denialRedirect, evaluateAdminPortalAccess } from '@/lib/api';

/**
 * Keycloak OIDC callback.
 *
 * Authorization happens HERE, before any Admin session cookie is written. The
 * previous version accepted any token Keycloak signed, which let an account
 * holding only an educator (PENGAJAR) assignment into the Admin portal. A valid
 * token proves identity, not Admin authorization.
 *
 * The decision is delegated to the LMS (`/me` + `has-permission`); nothing here
 * inspects a role name or a token claim. Unverifiable access fails closed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = readCookie(request, 'lms_oidc_state');
  if (!code || !state || !expectedState || state !== expectedState) {
    return new NextResponse('Invalid OIDC callback', { status: 400 });
  }

  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  if (!issuer || !clientId) {
    return new NextResponse('OIDC is not configured', { status: 500 });
  }

  const host =
    request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  if (!host) return new NextResponse('Missing forwarded host', { status: 400 });
  const baseUrl = `${protocol}://${host}`;
  const redirectUri = new URL('/api/auth/callback', baseUrl).toString();
  const secureCookie = protocol === 'https';

  const tokenResponse = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });
  if (!tokenResponse.ok) {
    return new NextResponse('OIDC token exchange failed', { status: 502 });
  }

  const token = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
  };
  if (!token.access_token) {
    return new NextResponse('OIDC token missing', { status: 502 });
  }

  // Ask the LMS whether this identity may operate the Admin portal. Only an
  // explicit grant establishes a session; a denial never sets a cookie.
  const access = await evaluateAdminPortalAccess(token.access_token);
  if (access.status !== 'GRANTED') {
    const denied = NextResponse.redirect(
      new URL(denialRedirect(access.status), baseUrl),
    );
    denied.cookies.delete('lms_oidc_state');
    return denied;
  }

  const response = NextResponse.redirect(new URL('/', baseUrl));
  response.cookies.set('lms_access_token', token.access_token, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: 'lax',
    maxAge: token.expires_in ?? 300,
    path: '/',
  });
  if (token.refresh_token) {
    response.cookies.set('lms_refresh_token', token.refresh_token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: 'lax',
      maxAge: token.refresh_expires_in ?? 1800,
      path: '/',
    });
  }
  response.cookies.delete('lms_oidc_state');
  return response;
}

/** Read one cookie out of the request header without a Next request context. */
function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}
