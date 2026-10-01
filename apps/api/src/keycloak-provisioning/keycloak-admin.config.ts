import { Logger } from '@nestjs/common';

/**
 * Keycloak Admin API configuration.
 *
 * The LMS provisions the Keycloak *identity* (username, email, initial/temporary
 * password) from the Admin UI, while authorization (Permission + Scope) stays
 * entirely in the LMS. This configuration therefore only carries the service
 * credentials needed to call the Keycloak Admin API.
 *
 * Secrets come from the environment and are never persisted in the LMS database,
 * never returned by an API response, and never sent to a frontend bundle. A
 * frontend only ever posts a password to the LMS API, which forwards it to
 * Keycloak once and forgets it.
 *
 * Configuration is optional: an API without it still serves every non-provisioning
 * feature, but the provisioning endpoints fail closed with a clear 503 instead of
 * pretending an account was created.
 */
export type KeycloakAdminConfig = {
  /** Base URL of the Keycloak server, e.g. `https://auth.example.id`. */
  baseUrl: string;
  /** Realm the LMS accounts live in. */
  realm: string;
  /** Confidential client used for the `client_credentials` service account. */
  clientId: string;
  clientSecret: string;
  /**
   * Optional administrative username/password (`password` grant).
   * Used only when client credentials are absent; a deployment should prefer the
   * service account so no human credential lives in the API environment.
   */
  adminUsername?: string;
  adminPassword?: string;
  /** Whether a newly set password is a temporary/one-time credential. */
  resetPasswordTemporary: boolean;
  /** Network timeout for Admin API calls, in milliseconds. */
  requestTimeoutMs: number;
};

export type KeycloakAdminConfigLoadResult = {
  /** `null` means provisioning is not configured and the endpoints fail closed. */
  config: KeycloakAdminConfig | null;
  /** Human-readable configuration problems. Fatal only when provisioning is required. */
  errors: string[];
};

export const DEFAULT_KEYCLOAK_ADMIN_TIMEOUT_MS = 8000;
const KEYCLOAK_ADMIN_TIMEOUT_MS_MAX = 60_000;

/**
 * Derives the realm name from a Keycloak issuer URL
 * (`https://host/realms/<realm>` -> `<realm>`).
 * Returns `null` when the URL does not contain a realm segment.
 */
export function realmFromIssuer(issuer: string): string | null {
  try {
    const segments = new URL(issuer).pathname.split('/').filter(Boolean);
    const index = segments.lastIndexOf('realms');
    if (index === -1 || index === segments.length - 1) return null;
    return segments[index + 1] ?? null;
  } catch {
    return null;
  }
}

/** Origin of an issuer URL (`https://host/realms/x` -> `https://host`). */
export function originFromIssuer(issuer: string): string | null {
  try {
    return new URL(issuer).origin;
  } catch {
    return null;
  }
}

function readTimeout(env: NodeJS.ProcessEnv, errors: string[]): number {
  const raw = env.KEYCLOAK_ADMIN_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_KEYCLOAK_ADMIN_TIMEOUT_MS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    errors.push('KEYCLOAK_ADMIN_TIMEOUT_MS must be a positive integer');
    return DEFAULT_KEYCLOAK_ADMIN_TIMEOUT_MS;
  }
  return Math.min(value, KEYCLOAK_ADMIN_TIMEOUT_MS_MAX);
}

export function loadKeycloakAdminConfig(
  env: NodeJS.ProcessEnv = process.env,
): KeycloakAdminConfigLoadResult {
  const errors: string[] = [];

  const issuer = env.KEYCLOAK_ISSUER?.trim() ?? '';
  const baseUrl =
    env.KEYCLOAK_ADMIN_BASE_URL?.trim() ||
    env.KEYCLOAK_SERVER_URL?.trim() ||
    (issuer ? originFromIssuer(issuer) : null) ||
    '';
  const realm =
    env.KEYCLOAK_ADMIN_REALM?.trim() ||
    (issuer ? realmFromIssuer(issuer) : null) ||
    '';

  const clientId = env.KEYCLOAK_ADMIN_CLIENT_ID?.trim() ?? '';
  const clientSecret = env.KEYCLOAK_ADMIN_CLIENT_SECRET?.trim() ?? '';
  const adminUsername = env.KEYCLOAK_ADMIN_USERNAME?.trim() || undefined;
  const adminPassword = env.KEYCLOAK_ADMIN_PASSWORD?.trim() || undefined;

  const hasServiceAccount = Boolean(clientId && clientSecret);
  const hasPasswordGrant = Boolean(adminUsername && adminPassword);

  // "Is provisioning configured at all?" is answered by the presence of any
  // credential material or an explicit base URL. A partially filled
  // configuration is reported rather than silently downgraded.
  const touched =
    hasServiceAccount ||
    hasPasswordGrant ||
    Boolean(
      env.KEYCLOAK_ADMIN_BASE_URL?.trim() ||
      env.KEYCLOAK_ADMIN_CLIENT_ID?.trim() ||
      env.KEYCLOAK_ADMIN_CLIENT_SECRET?.trim() ||
      env.KEYCLOAK_ADMIN_USERNAME?.trim(),
    );

  if (!touched) {
    return { config: null, errors };
  }

  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    errors.push(
      'KEYCLOAK_ADMIN_BASE_URL (or KEYCLOAK_ISSUER) must be an absolute http(s) URL',
    );
  }
  if (!realm) {
    errors.push(
      'KEYCLOAK_ADMIN_REALM (or KEYCLOAK_ISSUER) must resolve a realm',
    );
  }
  if (!hasServiceAccount && !hasPasswordGrant) {
    errors.push(
      'configure either KEYCLOAK_ADMIN_CLIENT_ID + KEYCLOAK_ADMIN_CLIENT_SECRET or KEYCLOAK_ADMIN_USERNAME + KEYCLOAK_ADMIN_PASSWORD',
    );
  }
  if (clientId && !clientSecret) {
    errors.push(
      'KEYCLOAK_ADMIN_CLIENT_SECRET is required with KEYCLOAK_ADMIN_CLIENT_ID',
    );
  }
  if (adminUsername && !adminPassword) {
    errors.push(
      'KEYCLOAK_ADMIN_PASSWORD is required with KEYCLOAK_ADMIN_USERNAME',
    );
  }

  const requestTimeoutMs = readTimeout(env, errors);
  if (errors.length > 0) return { config: null, errors };

  return {
    config: {
      baseUrl: baseUrl.replace(/\/+$/, ''),
      realm,
      clientId,
      clientSecret,
      adminUsername,
      adminPassword,
      resetPasswordTemporary:
        env.KEYCLOAK_ADMIN_RESET_PASSWORD_TEMPORARY !== 'false',
      requestTimeoutMs,
    },
    errors: [],
  };
}

export function warnUnconfiguredKeycloakAdmin(errors: string[]): void {
  const detail =
    errors.length > 0 ? errors.join('; ') : 'configuration is incomplete';
  new Logger('Bootstrap').warn(
    `Keycloak user provisioning is not configured (${detail}). Provisioning endpoints will refuse requests.`,
  );
}
