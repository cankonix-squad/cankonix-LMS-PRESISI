/**
 * Provisioning lifecycle answer for one `UserAccount`.
 *
 * Deliberately disjoint: a state never means two things, so the UI can render one
 * honest badge instead of inferring from a mix of booleans.
 */
export const KeycloakProvisioningStatusDto = {
  /** Linked to an enabled Keycloak user with no pending required action. */
  READY: 'READY',
  /** Linked and present, but the user must set a password before first login. */
  ACTIVATION_REQUIRED: 'ACTIVATION_REQUIRED',
  /** No Keycloak identity is linked yet. */
  NOT_PROVISIONED: 'NOT_PROVISIONED',
  /**
   * No link is stored, but a Keycloak user with the same username exists and is
   * not bound to another LMS account. Connecting it avoids a duplicate.
   */
  ADOPTABLE: 'ADOPTABLE',
  /** A Keycloak username/email match belongs to a different LMS account. */
  LINK_CONFLICT: 'LINK_CONFLICT',
  /** The stored subject no longer exists in Keycloak (or was disabled). */
  STALE_LINK: 'STALE_LINK',
  /** Provisioning is not configured on the API. */
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  /** Keycloak could not be reached; the outcome is unknown and retry may help. */
  ERROR: 'ERROR',
} as const;

export type KeycloakProvisioningStatusDto =
  (typeof KeycloakProvisioningStatusDto)[keyof typeof KeycloakProvisioningStatusDto];

/**
 * Operator actions the UI may offer.
 *
 * These are hints computed by the API from the *server* state, not an
 * authorization decision: the API still enforces `user_account.manage` on every
 * mutation, so a stale button is a UX bug rather than a security hole.
 */
export const KeycloakProvisioningActionDto = {
  /** Create a new Keycloak user for the account. */
  PROVISION: 'PROVISION',
  /** Bind the existing same-username Keycloak user to this account. */
  LINK_EXISTING: 'LINK_EXISTING',
  /** Set or reset the password (optionally as a one-time credential). */
  SET_PASSWORD: 'SET_PASSWORD',
  /** Re-enable a disabled Keycloak user. */
  ENABLE: 'ENABLE',
  /** Retry after a transient failure. */
  RETRY: 'RETRY',
} as const;

export type KeycloakProvisioningActionDto =
  (typeof KeycloakProvisioningActionDto)[keyof typeof KeycloakProvisioningActionDto];

export const KEYCLOAK_PROVISIONING_SUMMARY = {
  READY: 'Akun siap login.',
  ACTIVATION_REQUIRED:
    'Akun ada di Keycloak, tetapi pengguna harus mengatur password saat login pertama.',
  NOT_PROVISIONED:
    'UserAccount belum memiliki identitas Keycloak, sehingga belum dapat login.',
  ADOPTABLE:
    'Ditemukan user Keycloak dengan username yang sama. Hubungkan agar tidak membuat duplikat.',
  LINK_CONFLICT:
    'Username atau email sudah terhubung ke UserAccount lain. Selesaikan konflik sebelum melanjutkan.',
  STALE_LINK:
    'Identitas Keycloak yang tersimpan tidak ditemukan lagi. Hubungkan ulang.',
  NOT_CONFIGURED:
    'Provisioning Keycloak belum dikonfigurasi pada API, sehingga akun belum dapat dibuat.',
  ERROR:
    'Keycloak tidak dapat dihubungi. Status belum dapat dipastikan; coba lagi.',
} as const;
