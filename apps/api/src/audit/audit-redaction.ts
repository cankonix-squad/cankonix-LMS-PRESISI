/**
 * Redaction of secrets before they can reach the audit trail.
 *
 * Audit entries store state snapshots, and state snapshots originate from API
 * input. A future domain that accepts a credential, token, or provider secret
 * would otherwise copy it into an immutable, widely-readable table. Because
 * audit rows can never be edited afterwards, redaction must happen on the way
 * *in* — a mistake is not fixable by a later UPDATE.
 *
 * Two entry points intentionally exist:
 * - `redactAuditValue` is used at write time, so a secret is never persisted.
 * - the read path applies the same function again, so payloads written by an
 *   older build (or by a domain that forgot to redact) are still masked.
 */

/**
 * Field names whose values are always replaced, matched case-insensitively and
 * allowing separators, so `apiKey`, `api_key`, and `API-KEY` all match.
 *
 * Kept as whole-word-ish patterns rather than `includes` so ordinary fields such
 * as `keyboardLayout` or `tokenType` are not accidentally masked.
 */
const SECRET_KEY_PATTERNS: readonly RegExp[] = [
  /^password$/,
  /^passwd$/,
  /^passphrase$/,
  /^secret$/,
  /^clientsecret$/,
  /^token$/,
  /^accesstoken$/,
  /^refreshtoken$/,
  /^idtoken$/,
  /^apikey$/,
  /^authorization$/,
  /^privatekey$/,
  /^credentials$/,
  /^credential$/,
  /^signingkey$/,
  /^encryptionkey$/,
  /^salt$/,
];

export const REDACTED_VALUE = '[REDACTED]';

/**
 * Maximum serialized size of a stored snapshot.
 *
 * Audit is a history, not a data store: an oversized `before`/`after` (for
 * example an entire nested aggregate) would bloat the table and slow the read
 * path. Values beyond this budget are replaced by a marker that keeps the entry
 * honest about what was dropped.
 */
const MAX_SNAPSHOT_BYTES = 16 * 1024;

const TRUNCATED_VALUE = '[TRUNCATED: payload exceeded audit snapshot limit]';

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function isSecretKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return SECRET_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Recursively replaces secret-looking values with {@link REDACTED_VALUE}.
 *
 * A depth bound prevents a cyclic or adversarially deep payload from becoming an
 * unbounded traversal; anything past the bound is replaced rather than dropped so
 * the entry still records that a value existed.
 */
function redact(value: unknown, depth: number): unknown {
  if (depth > 12) return REDACTED_VALUE;

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value instanceof Date) return value.toISOString();

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      result[key] = isSecretKey(key) ? REDACTED_VALUE : redact(item, depth + 1);
    }
    return result;
  }

  return value;
}

/**
 * Applies redaction and the size budget to one snapshot.
 *
 * Returns `null` for `null`/`undefined` so an absent snapshot stays absent rather
 * than becoming `{}`.
 */
export function redactAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;

  const redacted = redact(value, 0);

  let serialized: string;
  try {
    serialized = JSON.stringify(redacted) ?? 'null';
  } catch {
    // A value with a throwing `toJSON` must never break the audit write.
    return TRUNCATED_VALUE;
  }

  if (Buffer.byteLength(serialized, 'utf8') > MAX_SNAPSHOT_BYTES) {
    return TRUNCATED_VALUE;
  }

  return redacted;
}

/**
 * True when a field name would be redacted. Exported for tests and for domain
 * services that want to assert their payloads are safe before writing.
 */
export function isRedactedFieldName(key: string): boolean {
  return isSecretKey(key);
}
