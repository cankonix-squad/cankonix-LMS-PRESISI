/**
 * Keycloak/OIDC resource-server configuration.
 *
 * The API never authenticates users itself: Keycloak answers *who* the caller
 * is, and NestJS still answers *what* the caller may do. This module therefore
 * only carries the material required to validate an already-issued access token.
 */
export type AuthConfig = {
  /** Expected `iss` claim. Must match exactly. */
  issuer: string;
  /** Expected `aud` claim. Required whenever authentication is enabled. */
  audience: string;
  /** JWKS endpoint used to resolve signing keys. Derived from the issuer by default. */
  jwksUri: string;
  /** Allowed leeway for `exp`/`nbf`/`iat` comparisons, in seconds. */
  clockSkewSeconds: number;
  /** How long a fetched JWKS document may be reused, in seconds. */
  jwksCacheSeconds: number;
  /** Network timeout for JWKS retrieval, in milliseconds. */
  jwksRequestTimeoutMs: number;
  /**
   * Minimum interval between `UserAccount.lastLoginAt` writes, in seconds.
   * `0` disables throttling (every authenticated request writes).
   */
  lastLoginThrottleSeconds: number;
};

export const AUTH_CONFIG = Symbol('AUTH_CONFIG');

export const DEFAULT_CLOCK_SKEW_SECONDS = 30;
export const DEFAULT_JWKS_CACHE_SECONDS = 300;
export const DEFAULT_JWKS_REQUEST_TIMEOUT_MS = 5000;
export const DEFAULT_LAST_LOGIN_THROTTLE_SECONDS = 300;

const JWKS_CACHE_SECONDS_MAX = 86_400;
const REQUEST_TIMEOUT_MS_MAX = 60_000;

export type AuthEnvironment = Record<string, string | undefined>;

export type AuthConfigResult = {
  /** `null` means authentication is not configured; protected routes then fail closed. */
  config: AuthConfig | null;
  /** Human-readable configuration problems. Fatal in production. */
  errors: string[];
};

export function loadAuthConfig(env: AuthEnvironment): AuthConfigResult {
  const errors: string[] = [];
  const issuer = env.KEYCLOAK_ISSUER?.trim() ?? '';
  const audience = env.KEYCLOAK_AUDIENCE?.trim() ?? '';
  const jwksUriOverride = env.KEYCLOAK_JWKS_URI?.trim() ?? '';

  if (!issuer && !audience && !jwksUriOverride) {
    return { config: null, errors };
  }

  if (!issuer) {
    errors.push('KEYCLOAK_ISSUER is required when authentication is enabled');
  } else if (!isAbsoluteHttpUrl(issuer)) {
    errors.push('KEYCLOAK_ISSUER must be an absolute http(s) URL');
  }
  if (!audience) {
    errors.push('KEYCLOAK_AUDIENCE is required when authentication is enabled');
  }

  let jwksUri = jwksUriOverride;
  if (jwksUri && !isAbsoluteHttpUrl(jwksUri)) {
    errors.push('KEYCLOAK_JWKS_URI must be an absolute http(s) URL');
  }
  if (!jwksUri && issuer && isAbsoluteHttpUrl(issuer)) {
    jwksUri = `${issuer.replace(/\/+$/, '')}/protocol/openid-connect/certs`;
  }

  const clockSkewSeconds = readNonNegativeInt(
    env.AUTH_CLOCK_SKEW_SECONDS,
    DEFAULT_CLOCK_SKEW_SECONDS,
    'AUTH_CLOCK_SKEW_SECONDS',
    300,
    errors,
  );
  const jwksCacheSeconds = readNonNegativeInt(
    env.AUTH_JWKS_CACHE_SECONDS,
    DEFAULT_JWKS_CACHE_SECONDS,
    'AUTH_JWKS_CACHE_SECONDS',
    JWKS_CACHE_SECONDS_MAX,
    errors,
  );
  const jwksRequestTimeoutMs = readNonNegativeInt(
    env.AUTH_JWKS_TIMEOUT_MS,
    DEFAULT_JWKS_REQUEST_TIMEOUT_MS,
    'AUTH_JWKS_TIMEOUT_MS',
    REQUEST_TIMEOUT_MS_MAX,
    errors,
  );
  const lastLoginThrottleSeconds = readNonNegativeInt(
    env.AUTH_LAST_LOGIN_THROTTLE_SECONDS,
    DEFAULT_LAST_LOGIN_THROTTLE_SECONDS,
    'AUTH_LAST_LOGIN_THROTTLE_SECONDS',
    86_400,
    errors,
  );

  if (errors.length > 0) {
    return { config: null, errors };
  }

  return {
    config: {
      issuer,
      audience,
      jwksUri,
      clockSkewSeconds,
      jwksCacheSeconds,
      jwksRequestTimeoutMs,
      lastLoginThrottleSeconds,
    },
    errors,
  };
}

/**
 * Swagger documentation is a development affordance. It is off by default in
 * production and can be toggled explicitly through `DOCS_ENABLED`.
 */
export function resolveDocsEnabled(env: AuthEnvironment): boolean {
  const explicit = env.DOCS_ENABLED?.trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return env.NODE_ENV !== 'production';
}

function readNonNegativeInt(
  raw: string | undefined,
  fallback: number,
  name: string,
  max: number,
  errors: string[],
): number {
  const value = raw?.trim();
  if (!value) return fallback;
  if (!/^\d+$/.test(value)) {
    errors.push(`${name} must be a non-negative integer`);
    return fallback;
  }
  const parsed = Number(value);
  if (parsed > max) {
    errors.push(`${name} must be at most ${max}`);
    return fallback;
  }
  return parsed;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
