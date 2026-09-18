/**
 * Permission code vocabulary.
 *
 * Codes are data, not branches: business logic must never test a role code and
 * must never test a permission code either. A permission code is only ever
 * granted to, or resolved from, a role. This module exists so the shape of the
 * vocabulary is validated and seeded consistently — nothing here authorizes.
 *
 * Shape: `<domain>.<resource>.<action>`, e.g. `academic.class_subject.manage`.
 * `*` replaces one resource or action segment (`portal.*.access`,
 * `assessment.grade.*`) and marks a deliberately broad permission.
 */
export const PERMISSION_CODE_PATTERN =
  /^[a-z][a-z0-9_]*\.([a-z][a-z0-9_]*|\*)\.([a-z][a-z0-9_]*|\*)$/;

/** Wildcard action, reserved for deliberately broad system-role permissions. */
export const PERMISSION_WILDCARD_ACTION = '*';

/** Normalized role codes: leading letter, then uppercase letters/digits/underscores. */
export const ROLE_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * Accepted role-code input shape. Case is not significant: the service
 * normalizes to uppercase before validating against `ROLE_CODE_PATTERN`.
 */
export const ROLE_CODE_INPUT_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

const MAX_PERMISSION_CODE_LENGTH = 100;
const MAX_ROLE_CODE_LENGTH = 64;

/** Uppercases and trims a role code. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Normalizes a permission code to `<domain>.<resource>.<action>`.
 *
 * Codes are case-sensitive by design: `academic.program.read` and
 * `academic.program.READ` are different codes, so only whitespace is trimmed.
 */
export function normalizePermissionCode(code: string): string {
  return code.trim();
}

/** Structural check for `<domain>.<resource>.<action>` (wildcards allowed). */
export function isValidPermissionCode(code: string): boolean {
  return (
    code.length > 0 &&
    code.length <= MAX_PERMISSION_CODE_LENGTH &&
    PERMISSION_CODE_PATTERN.test(code)
  );
}

/**
 * Structural check for role codes. Role codes are opaque labels for humans;
 * they carry no meaning to the authorization engine.
 */
export function isValidRoleCode(code: string): boolean {
  return (
    code.length >= 2 &&
    code.length <= MAX_ROLE_CODE_LENGTH &&
    ROLE_CODE_PATTERN.test(code)
  );
}
