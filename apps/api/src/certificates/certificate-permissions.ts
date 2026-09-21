/**
 * Permission vocabulary for certificates (TASK-054).
 *
 * Follows `<domain>.<resource>.<action>` from `docs/04-authorization-model.md`.
 * No role name is inspected anywhere in this module.
 *
 * Template authoring is separated from issuance because they are different
 * authorities: designing the certificate an institution prints is an
 * administrative act, while issuing one against a named graduate is the act that
 * creates a public claim. `ISSUE` is therefore its own code rather than being
 * folded into `certificate.manage`.
 *
 * `REVOKE` (TASK-055) is a third authority, separate again from issuance.
 * Revoking tells the world that a document an institution already put its name
 * to is no longer valid, so it should be grantable to a compliance or supervisory
 * function without also handing over the ability to create certificates.
 */
export const CERTIFICATE_PERMISSIONS = {
  /** Read certificate templates. */
  TEMPLATE_READ: 'certificate.template.read',
  /** Create templates and move them through DRAFT → ACTIVE → ARCHIVED. */
  TEMPLATE_MANAGE: 'certificate.template.manage',
  /** Read issued certificates. */
  READ: 'certificate.read',
  /** Issue a certificate from an approved decision. */
  ISSUE: 'certificate.issue',
  /** Withdraw an issued certificate without deleting it. */
  REVOKE: 'certificate.revoke',
} as const;

export type CertificatePermission =
  (typeof CERTIFICATE_PERMISSIONS)[keyof typeof CERTIFICATE_PERMISSIONS];

export const CERTIFICATE_PERMISSION_CODES: readonly CertificatePermission[] =
  Object.values(CERTIFICATE_PERMISSIONS);
