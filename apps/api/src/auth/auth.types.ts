import { UserAccountStatusDto } from '../user-accounts/dto/user-account-status.dto';

/** Verified, minimally decoded claims extracted from a Keycloak access token. */
export type AuthClaims = {
  /** Keycloak subject. Mapped to `UserAccount.externalAuthId`. */
  subject: string;
  issuer: string;
  audience: string[];
  expiresAt: number | null;
  notBefore: number | null;
  issuedAt: number | null;
};

/**
 * The authenticated caller as understood by the LMS.
 *
 * Deliberately carries no roles or permissions: Keycloak answers identity, while
 * authorization (Permission + Scope) is resolved by the NestJS authorization
 * modules in later tasks.
 */
export type AuthenticatedPrincipal = {
  accountId: string;
  personId: string;
  personnelNumber: string;
  fullName: string;
  username: string | null;
  email: string | null;
  accountStatus: UserAccountStatusDto;
};

export type AuthenticatedHttpRequest = {
  headers: Record<string, string | string[] | undefined>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  /** Attached by the guard once the bearer token has been accepted. */
  user?: AuthenticatedPrincipal;
};
