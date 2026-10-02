import {
  apiErrorStatus,
  createApiClient,
  isApiRequestError,
} from '@lms/api-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type AdminApiClient = ReturnType<typeof createAdminApiClient>;

/**
 * Portal boundary permission for the Admin app.
 *
 * Mirrors `apps/api/src/authorization/portal-permissions.ts`. It is only ever
 * *asked about* here — the LMS decides. The code is data: a role grants it, and
 * this constant carries no role name and no fallback.
 *
 * A role may instead hold the broader `portal.*.access`; the backend's wildcard
 * matcher resolves that, so this app never has to.
 */
export const ADMIN_PORTAL_PERMISSION = 'portal.admin.access';

/**
 * Outcome of a server-side API read.
 *
 * `status` is the HTTP status of the failed call (`0` for a transport error) or
 * `200` on success. Server components pass it down so a client component can
 * tell a missing record apart from a denied or failed read — the difference
 * between "there is no account" and "I am not allowed to see whether there is".
 */
export type LoadResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

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

/**
 * Outcome of resolving whether the current token may operate the Admin portal.
 *
 * The important property: `DENIED` is decided by the LMS, not by the presence of
 * a cookie. Holding a valid Keycloak token says *who* the caller is; it says
 * nothing about *what* they may do. An educator with an ACTIVE PENGAJAR
 * assignment holds a perfectly valid token and must still be refused here.
 */
export type AdminPortalAccess =
  /** LMS answered `allowed: true` for `portal.admin.access`. */
  | 'GRANTED'
  /** LMS answered `allowed: false`: authenticated, but no Admin authorization. */
  | 'DENIED'
  /** No token cookie at all, and no refresh token to mint one from. */
  | 'NO_SESSION'
  /** A token exists but the LMS rejected it (expired / invalid / unmapped). */
  | 'UNAUTHENTICATED'
  /** The LMS could not be reached or errored; fail closed. */
  | 'UNAVAILABLE';

export type AdminPortalAccessResult = {
  status: AdminPortalAccess;
  /** The account id the LMS resolved the token to, when it got that far. */
  accountId: string | null;
};

/** What the Admin app can honestly tell the operator about a refusal. */
export type AdminPortalDenial = Exclude<AdminPortalAccess, 'GRANTED'>;

/**
 * Resolve the caller's portal authorization from the LMS.
 *
 * Two backend calls, in order, because the LMS is the only authority:
 * 1. `GET /me` turns the (already locally validated) token into an account id,
 *    and is the honest test of "is this token still accepted?".
 * 2. `GET /authorization/users/{id}/has-permission/portal.admin.access` asks the
 *    authorization engine — the same engine the API guards use — whether that
 *    account holds the portal permission, honouring wildcards (`portal.*.access`)
 *    and inactive/future assignments.
 *
 * No role name and no token claim is ever inspected, and a failure to ask is a
 * refusal rather than a pass (`UNAVAILABLE`).
 */
export async function getAdminPortalAccess(): Promise<AdminPortalAccessResult> {
  const token = await getAdminAccessToken();
  if (!token) return { status: 'NO_SESSION', accountId: null };
  return evaluateAdminPortalAccess(token);
}

/**
 * Same evaluation, but for a token that is not yet in a cookie.
 *
 * The OIDC callback needs this: it has just exchanged the authorization code and
 * must decide whether to *establish* a session before setting any cookie. An
 * account that fails here never receives an Admin session at all.
 */
export async function evaluateAdminPortalAccess(
  token: string,
): Promise<AdminPortalAccessResult> {
  const api = createApiClient(getApiBaseUrl(), { getAccessToken: () => token });
  let accountId: string;
  try {
    const identity = await api.me();
    accountId = identity.accountId;
  } catch (error) {
    return {
      status:
        isApiRequestError(error) && error.status === 401
          ? 'UNAUTHENTICATED'
          : 'UNAVAILABLE',
      accountId: null,
    };
  }

  try {
    const decision = await api.authorization.hasPermission(
      accountId,
      ADMIN_PORTAL_PERMISSION,
    );
    return {
      status: decision.allowed ? 'GRANTED' : 'DENIED',
      accountId,
    };
  } catch (error) {
    return {
      status:
        isApiRequestError(error) && error.status === 401
          ? 'UNAUTHENTICATED'
          : 'UNAVAILABLE',
      accountId,
    };
  }
}

/** True only when the LMS explicitly granted the portal permission. */
export async function hasAdminPortalAccess(): Promise<boolean> {
  return (await getAdminPortalAccess()).status === 'GRANTED';
}

/**
 * Page-level gate. Returns once access is confirmed; otherwise it navigates and
 * never returns, so a protected page cannot render for an unauthorized caller —
 * and the data loader it wraps is never invoked.
 */
export async function requireAdminPortalAccess(): Promise<void> {
  const access = await getAdminPortalAccess();
  if (access.status === 'GRANTED') return;
  redirect(denialRedirect(access.status));
}

/**
 * Where a refusal lands. `NO_SESSION`/`UNAUTHENTICATED` are "log in" problems;
 * `DENIED`/`UNAVAILABLE` are "you are signed in but not authorized" problems and
 * get the explicit access-denied page rather than a silent bounce to login.
 */
export function denialRedirect(status: AdminPortalDenial): string {
  if (status === 'NO_SESSION' || status === 'UNAUTHENTICATED') return '/login';
  return `/akses-ditolak?reason=${status.toLowerCase()}`;
}

/** Bahasa Indonesia copy for the access-denied page, chosen by the reason. */
export const PORTAL_DENIAL_MESSAGES: Record<
  AdminPortalDenial,
  { title: string; description: string }
> = {
  DENIED: {
    title: 'Anda tidak memiliki akses ke Portal Admin',
    description:
      'Akun Anda berhasil terautentikasi, tetapi tidak memegang permission portal.admin.access (atau portal.*.access) untuk Portal Admin. Peran pendidik atau assignment PENGAJAR bukan izin Admin. Hubungi administrator pusat bila Anda memang memerlukan akses Admin.',
  },
  NO_SESSION: {
    title: 'Sesi tidak ditemukan',
    description:
      'Anda belum masuk. Silakan masuk memakai SSO LMS PRESISI untuk melanjutkan.',
  },
  UNAUTHENTICATED: {
    title: 'Sesi tidak valid atau kedaluwarsa',
    description:
      'Token akses ditolak oleh API. Silakan masuk kembali memakai SSO LMS PRESISI.',
  },
  UNAVAILABLE: {
    title: 'Akses tidak dapat diverifikasi',
    description:
      'API otorisasi tidak dapat dihubungi sehingga akses tidak dapat dipastikan. Demi keamanan, akses ditutup sampai verifikasi berhasil. Silakan coba lagi beberapa saat lagi.',
  },
};

/** Narrow untrusted input (e.g. `?reason=`) to a known denial reason. */
export function toDenialReason(value: unknown): AdminPortalDenial {
  return value === 'no_session' ||
    value === 'unauthenticated' ||
    value === 'unavailable' ||
    value === 'denied'
    ? (value.toUpperCase() as AdminPortalDenial)
    : 'DENIED';
}

export async function getOrEmpty<T>(
  loader: () => Promise<T>,
): Promise<LoadResult<T>> {
  try {
    return { data: await loader(), error: null, status: 200 };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : 'Tidak dapat memuat data API',
      status: apiErrorStatus(error),
    };
  }
}

/**
 * Why a read failed, derived from the HTTP status.
 *
 * `FORBIDDEN` is the important one: an operator who lacks `user_account.read`
 * must see "akses ditolak", never an empty state that looks like "no account".
 */
export type LoadFailureKind =
  'FORBIDDEN' | 'SESSION' | 'NOT_FOUND' | 'SERVER' | 'ERROR';

export function classifyLoadFailure(status: number): LoadFailureKind {
  if (status === 401) return 'SESSION';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status >= 500) return 'SERVER';
  return 'ERROR';
}
