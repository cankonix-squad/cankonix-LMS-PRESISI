import { createApiClient } from '@lms/api-client';
import { cookies } from 'next/headers';

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;

export function createAdminApiClient() {
  return createApiClient(getApiBaseUrl(), {
    getAccessToken: getAdminAccessToken,
  });
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
}

export async function getAdminAccessToken() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('lms_access_token')?.value;
  if (accessToken) return accessToken;

  const refreshToken = cookieStore.get('lms_refresh_token')?.value;
  const issuer = process.env.LMS_OIDC_ISSUER;
  const clientId = process.env.LMS_OIDC_CLIENT_ID;
  if (!refreshToken || !issuer || !clientId) return null;

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken,
    }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
  };
  if (!token.access_token) return null;

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
  try {
    cookieStore.set('lms_access_token', token.access_token, {
      ...options,
      maxAge: token.expires_in ?? 300,
    });
    if (token.refresh_token) {
      cookieStore.set('lms_refresh_token', token.refresh_token, {
        ...options,
        maxAge: token.refresh_expires_in ?? 1800,
      });
    }
  } catch {
    // Server Components can read the refreshed token but cannot set cookies.
  }
  return token.access_token;
}

export async function hasAdminSession() {
  return Boolean((await cookies()).get('lms_access_token')?.value);
}

export async function getOrEmpty<T>(loader: () => Promise<T>): Promise<{
  data: T | null;
  error: string | null;
}> {
  try {
    return { data: await loader(), error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Tidak dapat memuat data API',
    };
  }
}
