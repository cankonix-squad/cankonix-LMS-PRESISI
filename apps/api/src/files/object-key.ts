import { randomUUID } from 'node:crypto';

/**
 * Object key derivation and filename sanitization (TASK-022).
 *
 * The rule that drives this file: **a client filename must never influence the
 * storage path.** A client name is untrusted input; if it reaches the key, an
 * attacker controls where bytes land (`../../`, absolute paths, collisions,
 * unicode look-alikes). So the key is built from server-side values only, and
 * the client name is reduced to a display label that is stored as metadata.
 *
 * The extension is the one exception, and it is constrained twice: it must match
 * `^[a-z0-9]{1,8}$` and it must be in the map below. Anything else means "no
 * extension", which is always safe because the MIME type is stored separately
 * and used for responses.
 */

/** Longest object key we will generate or accept. */
export const MAX_OBJECT_KEY_LENGTH = 512;

/** Longest display filename we persist as metadata. */
export const MAX_ORIGINAL_NAME_LENGTH = 255;

/** Namespaces are a server-side vocabulary, not client input. */
export const FILE_NAMESPACES = {
  LEARNING_CONTENT: 'learning-content',
  ASSIGNMENT_SUBMISSION: 'assignment-submission',
  QUESTION_ASSET: 'question-asset',
  CERTIFICATE: 'certificate',
  PERSON_AVATAR: 'person-avatar',
  AUDIT_EXPORT: 'audit-export',
} as const;

export type FileNamespace =
  (typeof FILE_NAMESPACES)[keyof typeof FILE_NAMESPACES];

const ALLOWED_NAMESPACES = new Set<string>(Object.values(FILE_NAMESPACES));

/**
 * MIME → extension. Preferred over the client extension because the MIME type
 * has already passed the upload policy, so it is the trustworthy signal.
 */
const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/zip': 'zip',
  'video/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
};

const EXTENSION_PATTERN = /^[a-z0-9]{1,8}$/;

export type BuildObjectKeyInput = {
  namespace: string;
  /** Key partition. `null` means a system-owned file. */
  ownerUserId?: string | null;
  /** Untrusted client name. Only its extension may be consulted, as a fallback. */
  originalName?: string | null;
  /** MIME type already validated against the upload policy. */
  mimeType: string;
  /** Injectable clock so tests are deterministic. */
  now?: Date;
  /** Injectable id so tests are deterministic. */
  id?: string;
};

/**
 * Builds `<namespace>/<owner|system>/<yyyy>/<mm>/<uuid>[.<ext>]`.
 *
 * The date partition keeps listings and lifecycle rules cheap (a retention job
 * scans a prefix instead of the whole bucket), and the uuid removes any chance
 * of a collision between two clients uploading the same name.
 */
export function buildObjectKey(input: BuildObjectKeyInput): string {
  const namespace = assertNamespace(input.namespace);
  const owner = input.ownerUserId
    ? assertUuidSegment(input.ownerUserId, 'ownerUserId')
    : 'system';
  const now = input.now ?? new Date();
  const year = String(now.getUTCFullYear()).padStart(4, '0');
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const id = input.id ?? randomUUID();
  const extension = resolveExtension(input.mimeType, input.originalName);

  const key = `${namespace}/${owner}/${year}/${month}/${id}${
    extension ? `.${extension}` : ''
  }`;

  if (key.length > MAX_OBJECT_KEY_LENGTH) {
    throw new Error('Generated object key exceeds the maximum length');
  }

  return key;
}

/**
 * Extension for the stored object. The whitelisted MIME type wins; the client
 * extension is only consulted when the MIME type is unknown, and even then it
 * must match the strict pattern.
 */
export function resolveExtension(
  mimeType: string,
  originalName?: string | null,
): string | null {
  const mapped = MIME_EXTENSIONS[mimeType];
  if (mapped) {
    return mapped;
  }

  const candidate = extensionOf(originalName);
  if (candidate && EXTENSION_PATTERN.test(candidate)) {
    return candidate;
  }

  return null;
}

/**
 * Reduces a client filename to a safe display label.
 *
 * Only the basename survives, path separators and control characters (including
 * the bidi overrides used to disguise an extension) are stripped, and the result
 * is length-capped with the extension preserved. The output is metadata only; it
 * is never used to build a key or a URL path.
 */
export function sanitizeOriginalName(name: string): string {
  const basename = name.split(/[\\/]/).pop() ?? '';
  const cleaned = basename
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\u202a-\u202e\u2066-\u2069]/g, '')
    .trim();

  const safe = cleaned.replace(/[^\p{L}\p{N}._ -]/gu, '_').trim();
  // A name made only of dots carries no information and is a path-traversal
  // primitive, so it is replaced wholesale.
  if (!safe || /^\.+$/.test(safe)) {
    return 'unnamed';
  }

  if (safe.length <= MAX_ORIGINAL_NAME_LENGTH) {
    return safe;
  }

  const extension = extensionOf(safe);
  if (!extension) {
    return safe.slice(0, MAX_ORIGINAL_NAME_LENGTH);
  }

  const suffix = `.${extension}`;
  return safe.slice(0, MAX_ORIGINAL_NAME_LENGTH - suffix.length) + suffix;
}

/**
 * Validates a key that arrives from outside the service.
 *
 * Used whenever a caller references an already-stored object (a content row
 * pointing at an uploaded file, for example). Rejects traversal, absolute paths,
 * empty segments, backslashes and anything outside the key alphabet, so a caller
 * can never make the API sign a URL for a location this service did not create.
 */
export function assertSafeObjectKey(key: string): string {
  if (!key || key.length > MAX_OBJECT_KEY_LENGTH) {
    throw new Error('Object key is empty or too long');
  }
  if (key.includes('\\') || key.includes('..')) {
    throw new Error('Object key must not contain path traversal sequences');
  }
  if (key.startsWith('/') || key.endsWith('/') || key.includes('//')) {
    throw new Error('Object key must not have empty path segments');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(key)) {
    throw new Error('Object key contains unsupported characters');
  }

  const segments = key.split('/');
  if (segments.length < 2) {
    throw new Error('Object key must include at least one namespace segment');
  }
  for (const segment of segments) {
    if (segment === '.' || segment.length === 0) {
      throw new Error('Object key must not contain relative segments');
    }
  }

  return key;
}

export function isSafeObjectKey(key: string): boolean {
  try {
    assertSafeObjectKey(key);
    return true;
  } catch {
    return false;
  }
}

/** True when the key sits inside the given namespace. */
export function belongsToNamespace(key: string, namespace: string): boolean {
  return key.startsWith(`${namespace}/`);
}

function assertNamespace(namespace: string): string {
  if (!ALLOWED_NAMESPACES.has(namespace)) {
    throw new Error(
      `Unknown file namespace ${namespace}; namespaces are a server-side vocabulary`,
    );
  }
  return namespace;
}

function assertUuidSegment(value: string, field: string): string {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) {
    throw new Error(`${field} must be a UUID`);
  }
  return value;
}

function extensionOf(name?: string | null): string | null {
  if (!name) {
    return null;
  }
  const index = name.lastIndexOf('.');
  if (index <= 0 || index === name.length - 1) {
    return null;
  }
  return name.slice(index + 1).toLowerCase();
}
