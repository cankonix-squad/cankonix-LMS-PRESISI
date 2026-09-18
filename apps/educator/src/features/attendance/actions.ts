'use server';

import type { AttendanceStatus } from '@lms/api-client';
import { createEducatorApiClient } from '@/lib/api';
import {
  type ActionResult,
  parseCurrentStatuses,
  parseRosterEntries,
  readString,
} from './form-state';

/**
 * Server actions for the educator attendance surface.
 *
 * They run on the server, so the API token never enters the browser bundle, and
 * they delegate straight to the API client: no attendance rule is re-implemented
 * in the UI. The API still decides whether the session is open, whether the
 * participant is eligible, and whether the caller may correct a record — which is
 * why every action surfaces the API's message instead of assuming success.
 *
 * Only async functions may be exported from this module; pure helpers and
 * constants live in `form-state.ts`.
 */

/**
 * Saves the whole roster in one call.
 *
 * One request means one bulk write, so a partially saved roster is impossible:
 * either every marked row is recorded or the API rejected the batch and the
 * educator sees why.
 */
export async function saveRosterAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const sessionId = readString(formData, 'sessionId');
  if (!sessionId) {
    return { ok: false, message: 'Sesi kehadiran tidak diketahui.' };
  }

  const entries = parseRosterEntries(formData, parseCurrentStatuses(formData));
  if (entries.length === 0) {
    return {
      ok: true,
      message: 'Tidak ada perubahan kehadiran untuk disimpan.',
    };
  }

  const api = createEducatorApiClient();
  const result = await api.attendance.bulkRecord(sessionId, {
    records: entries,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  return {
    ok: true,
    message: `${result.data.length} catatan kehadiran tersimpan.`,
  };
}

export async function changeSessionStatusAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const sessionId = readString(formData, 'sessionId');
  const status = readString(formData, 'status');
  if (!sessionId || (status !== 'OPEN' && status !== 'CLOSED')) {
    return { ok: false, message: 'Permintaan perubahan sesi tidak valid.' };
  }

  const api = createEducatorApiClient();
  const result = await api.attendance.changeSessionStatus(sessionId, status);
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message:
      status === 'CLOSED'
        ? 'Sesi ditutup. Perubahan berikutnya harus melalui koreksi.'
        : 'Sesi dibuka kembali.',
  };
}

/**
 * Applies a correction. The reason is mandatory here as well as in the API, but
 * the API remains the authority: this check only avoids a pointless round trip.
 */
export async function applyCorrectionAction(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const recordId = readString(formData, 'recordId');
  const newStatus = readString(formData, 'newStatus') as AttendanceStatus;
  const reason = readString(formData, 'reason');

  if (!recordId || !newStatus) {
    return { ok: false, message: 'Catatan kehadiran tidak valid.' };
  }
  if (reason.length < 5) {
    return {
      ok: false,
      message: 'Alasan koreksi wajib diisi (minimal 5 karakter).',
    };
  }

  const api = createEducatorApiClient();
  const result = await api.attendanceCorrections.apply(recordId, {
    newStatus,
    reason,
  });
  if (!result.ok) return { ok: false, message: result.message };

  return {
    ok: true,
    message: `Koreksi tersimpan: ${result.data.correction.previousStatus} → ${result.data.correction.newStatus}.`,
  };
}
