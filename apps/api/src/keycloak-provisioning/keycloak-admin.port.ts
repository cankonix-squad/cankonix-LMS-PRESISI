/**
 * Keycloak Admin API port.
 *
 * The provisioning service depends on this narrow interface, never on `fetch`
 * directly. That keeps the failure taxonomy (`UNAVAILABLE` vs `REJECTED`)
 * explicit, makes every branch testable without a live Keycloak, and keeps the
 * Keycloak version a configuration detail.
 */
export type KeycloakAdminUser = {
  id: string;
  username: string;
  email: string | null;
  enabled: boolean;
  /** Keycloak required actions still pending, e.g. `UPDATE_PASSWORD`. */
  requiredActions: string[];
};

export type CreateKeycloakUserInput = {
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  enabled: boolean;
};

export type UpdateKeycloakUserInput = {
  email?: string | null;
  enabled?: boolean;
  firstName?: string | null;
  lastName?: string | null;
};

export type ResetKeycloakPasswordInput = {
  password: string;
  /** `true` = one-time credential the user must change at first login. */
  temporary: boolean;
};

/**
 * How a Keycloak Admin call failed.
 *
 * - `UNAVAILABLE`: the server was unreachable, timed out, or answered 5xx. The
 *   caller must treat the outcome as *unknown* and retry — never as a definitive
 *   rejection.
 * - `REJECTED`: Keycloak answered a definitive 4xx (409 duplicate, 401 bad
 *   credentials). Retrying the identical request is pointless.
 */
export type KeycloakAdminErrorKind = 'UNAVAILABLE' | 'REJECTED';

export class KeycloakAdminError extends Error {
  constructor(
    readonly kind: KeycloakAdminErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'KeycloakAdminError';
  }
}

export interface KeycloakAdminPort {
  findUserByUsername(username: string): Promise<KeycloakAdminUser | null>;
  findUsersByEmail(email: string): Promise<KeycloakAdminUser[]>;
  getUser(id: string): Promise<KeycloakAdminUser | null>;
  createUser(input: CreateKeycloakUserInput): Promise<KeycloakAdminUser>;
  updateUser(id: string, input: UpdateKeycloakUserInput): Promise<void>;
  deleteUser(id: string): Promise<void>;
  resetPassword(id: string, input: ResetKeycloakPasswordInput): Promise<void>;
  /**
   * Whether the port is backed by real credentials. The null object returns
   * `false` so the service can answer `NOT_CONFIGURED` before it attempts a call.
   */
  isConfigured(): boolean;
}

/**
 * DI token. A separate symbol (not the interface) is what lets the module bind
 * the real adapter once and the tests bind a fake.
 */
export const KEYCLOAK_ADMIN = Symbol('KEYCLOAK_ADMIN');
