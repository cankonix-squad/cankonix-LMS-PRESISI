import { randomBytes } from 'node:crypto';

/**
 * Certificate number and verification code generation (TASK-054).
 *
 * Pure and dependency-free so the properties that matter can be tested directly:
 *
 * 1. **Unpredictable.** Both values come from `randomBytes`, a CSPRNG. A
 *    sequential certificate number would let anyone enumerate issued documents,
 *    and a guessable verification code would turn the public endpoint into a
 *    directory of every graduate.
 * 2. **Unbiased.** Bytes are mapped to the alphabet with rejection sampling
 *    rather than `% alphabet.length`. Plain modulo over 256 makes the first
 *    `256 % length` symbols more likely, which shrinks the effective entropy of
 *    a short code — a real weakness in a value used as a public lookup key.
 * 3. **Transcribable.** Look-alike characters (`0`/`O`, `1`/`I`/`L`) are removed
 *    from the alphabet, because these values are read off a printed document and
 *    typed by hand.
 */

/** Digits and letters with look-alikes removed (no 0, 1, I, L, O). */
export const READABLE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Length of the random tail of a certificate number. */
export const CERTIFICATE_NUMBER_RANDOM_LENGTH = 10;

/**
 * Length of a verification code.
 *
 * 24 symbols over a 31-symbol alphabet is ~118 bits, which is far beyond
 * guessable and short enough to be printed and typed.
 */
export const VERIFICATION_CODE_LENGTH = 24;

/**
 * Produces a uniformly random token over `alphabet`.
 *
 * `limit` is the largest multiple of the alphabet size that fits in a byte, so
 * every accepted byte maps to a symbol with equal probability.
 */
export function randomToken(
  length: number,
  alphabet: string = READABLE_ALPHABET,
): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error('length must be a positive integer');
  }
  if (alphabet.length < 2 || alphabet.length > 256) {
    throw new Error('alphabet must contain between 2 and 256 symbols');
  }

  const limit = 256 - (256 % alphabet.length);
  let token = '';
  while (token.length < length) {
    // Over-read so the common case needs a single call even with rejections.
    for (const byte of randomBytes(Math.max(length, 16))) {
      if (byte >= limit) continue;
      token += alphabet[byte % alphabet.length];
      if (token.length === length) break;
    }
  }
  return token;
}

/**
 * Human-facing certificate number, e.g. `CERT-2026-K7M2P9QXTV`.
 *
 * The year is carried for readability, not uniqueness: uniqueness comes from the
 * random tail plus the database constraint, never from a counter that could be
 * raced.
 */
export function generateCertificateNumber(
  year: number,
  prefix = 'CERT',
): string {
  return `${prefix}-${year}-${randomToken(CERTIFICATE_NUMBER_RANDOM_LENGTH)}`;
}

/** Public lookup key used by the verification endpoint. */
export function generateVerificationCode(): string {
  return randomToken(VERIFICATION_CODE_LENGTH);
}

/**
 * Normalizes a user-supplied verification code.
 *
 * Codes are printed in a readable alphabet and typed by hand, so case and
 * surrounding whitespace are not meaningful. Separators are stripped too, since
 * a code is often copied with dashes or spaces inserted.
 */
export function normalizeVerificationCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}
