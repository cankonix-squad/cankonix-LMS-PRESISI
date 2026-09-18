import type { AttendanceStatus } from '@lms/api-client';

/**
 * Shared shapes for the attendance forms.
 *
 * Kept out of `actions.ts` on purpose: a `'use server'` module may only export
 * async functions, so pure helpers and constants live here where both the server
 * actions and (if ever needed) the components can import them.
 */

export type ActionResult =
  { ok: true; message: string } | { ok: false; message: string };

/** Field name prefix for the roster's status inputs. */
export const STATUS_PREFIX = 'status:';

/** Field name prefix carrying the status the row had when the page rendered. */
export const CURRENT_PREFIX = 'current:';

/**
 * Collects `status:<enrollmentId>` fields into attendance writes.
 *
 * Only rows the educator actually changed are sent: the API upserts, but sending
 * an unchanged roster would emit audit noise for participants nobody touched.
 */
export function parseRosterEntries(
  formData: FormData,
  currentStatuses: Record<string, AttendanceStatus>,
): { enrollmentId: string; status: AttendanceStatus }[] {
  const entries: { enrollmentId: string; status: AttendanceStatus }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(STATUS_PREFIX) || typeof value !== 'string') continue;
    const enrollmentId = key.slice(STATUS_PREFIX.length);
    const status = value as AttendanceStatus;
    if (currentStatuses[enrollmentId] === status) continue;
    entries.push({ enrollmentId, status });
  }
  return entries;
}

/** Reads the `current:<enrollmentId>` snapshot the roster form submitted. */
export function parseCurrentStatuses(
  formData: FormData,
): Record<string, AttendanceStatus> {
  const currentStatuses: Record<string, AttendanceStatus> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith(CURRENT_PREFIX) || typeof value !== 'string') continue;
    currentStatuses[key.slice(CURRENT_PREFIX.length)] =
      value as AttendanceStatus;
  }
  return currentStatuses;
}

export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
