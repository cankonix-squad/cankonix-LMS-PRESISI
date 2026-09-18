'use client';

import { useActionState } from 'react';
import type {
  AttendanceCorrection,
  AttendanceSessionStatus,
  AttendanceStatus,
} from '@lms/api-client';
import { Pill, SubmitButton, formatDateTime } from '@/components/data-state';
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_TONES,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_TONES,
  isSessionEditable,
  type RosterRow,
} from './attendance-view';
import {
  applyCorrectionAction,
  changeSessionStatusAction,
  saveRosterAction,
} from './actions';

/**
 * One form per concern, each with its own action state.
 *
 * The roster form and the session-lifecycle form are deliberately separate: a
 * refused correction-or-write must not obscure whether the session was closed.
 * Neither form retries or "optimistically" reports success — the message shown is
 * always the API's answer.
 */
export function AttendanceSessionPanel({
  sessionId,
  className,
  title,
  status,
  startAt,
  endAt,
  rows,
}: {
  sessionId: string;
  className: string | null;
  title: string | null;
  status: AttendanceSessionStatus;
  startAt: string;
  endAt: string;
  rows: RosterRow[];
}) {
  const editable = isSessionEditable(status);
  const [rosterState, saveRoster, savingRoster] = useActionState(
    saveRosterAction,
    null,
  );
  const [lifecycleState, changeStatus, changingStatus] = useActionState(
    changeSessionStatusAction,
    null,
  );

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {title ?? 'Sesi Kehadiran'}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {formatDateTime(startAt)} — {formatDateTime(endAt)}
          </p>
          {className ? (
            <p className="mt-1 text-xs text-slate-500">
              Kelas subjek {className}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill tone={SESSION_STATUS_TONES[status]}>
            {SESSION_STATUS_LABELS[status]}
          </Pill>
          <form action={changeStatus} className="flex items-center gap-2">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input
              type="hidden"
              name="status"
              value={status === 'OPEN' ? 'CLOSED' : 'OPEN'}
            />
            <button
              type="submit"
              disabled={changingStatus || status === 'CANCELLED'}
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-sky-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'OPEN' ? 'Tutup sesi' : 'Buka kembali'}
            </button>
          </form>
        </div>
      </header>

      {lifecycleState ? (
        <p
          role="status"
          className={
            lifecycleState.ok
              ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
              : 'rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100'
          }
        >
          {lifecycleState.message}
        </p>
      ) : null}

      {!editable ? (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          Sesi {SESSION_STATUS_LABELS[status].toLowerCase()} — kehadiran tidak
          dapat diubah langsung. Gunakan koreksi pada catatan peserta; setiap
          koreksi menyimpan status sebelumnya, alasan, dan pelakunya.
        </p>
      ) : null}

      <form action={saveRoster} className="flex flex-col gap-3">
        <input type="hidden" name="sessionId" value={sessionId} />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Peserta</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.enrollmentId}
                  className="border-b border-slate-800/60"
                >
                  <td className="py-2 pr-3">
                    <span className="text-slate-200">
                      {row.participantName}
                    </span>
                    {row.enrollmentNumber ? (
                      <span className="ml-2 text-xs text-slate-500">
                        {row.enrollmentNumber}
                      </span>
                    ) : null}
                    {row.corrected ? (
                      <span className="ml-2 align-middle">
                        <Pill tone="amber">dikoreksi</Pill>
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="hidden"
                      name={`current:${row.enrollmentId}`}
                      value={row.status}
                    />
                    <select
                      name={`status:${row.enrollmentId}`}
                      defaultValue={row.status}
                      disabled={!editable}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-400 disabled:opacity-50"
                    >
                      {ATTENDANCE_STATUSES.map((option) => (
                        <option key={option} value={option}>
                          {ATTENDANCE_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <Pill tone={ATTENDANCE_STATUS_TONES[row.status]}>
                      {ATTENDANCE_STATUS_LABELS[row.status]}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 px-3 py-4 text-center text-xs text-slate-400">
            Belum ada peserta terdaftar pada kelas ini.
          </p>
        ) : null}

        {rosterState ? (
          <p
            role="status"
            className={
              rosterState.ok
                ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100'
                : 'rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100'
            }
          >
            {rosterState.message}
          </p>
        ) : null}

        {editable && rows.length > 0 ? (
          <div>
            <SubmitButton disabled={savingRoster}>
              {savingRoster ? 'Menyimpan…' : 'Simpan daftar hadir'}
            </SubmitButton>
            <span className="ml-3 text-xs text-slate-500">
              Hanya baris yang berubah yang dikirim ke API.
            </span>
          </div>
        ) : null}
      </form>
    </div>
  );
}

export function CorrectionForm({
  recordId,
  currentStatus,
}: {
  recordId: string;
  currentStatus: AttendanceStatus;
}) {
  const [state, submit, pending] = useActionState(applyCorrectionAction, null);
  const alternatives = ATTENDANCE_STATUSES.filter((s) => s !== currentStatus);

  return (
    <form action={submit} className="flex flex-col gap-2">
      <input type="hidden" name="recordId" value={recordId} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-400">
          Status baru
          <select
            name="newStatus"
            defaultValue={alternatives[0] ?? 'PRESENT'}
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-400"
          >
            {alternatives.map((option) => (
              <option key={option} value={option}>
                {ATTENDANCE_STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[14rem] flex-1 text-xs text-slate-400">
          Alasan koreksi (wajib)
          <input
            name="reason"
            required
            minLength={5}
            maxLength={1000}
            placeholder="Contoh: surat keterangan sakit diterima setelah sesi ditutup"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-sky-400"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Menyimpan…' : 'Simpan koreksi'}
        </button>
      </div>
      {state ? (
        <p
          role="status"
          className={
            state.ok ? 'text-xs text-emerald-200' : 'text-xs text-rose-200'
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Correction history for one participant.
 *
 * Rendered oldest-last from the API's own history rows, so the chain of
 * `previous → new` transitions is visible and nothing is inferred locally.
 */
export function CorrectionHistory({
  corrections,
}: {
  corrections: AttendanceCorrection[];
}) {
  if (corrections.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Belum ada koreksi untuk peserta ini.
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {corrections.map((correction) => (
        <li
          key={correction.id}
          className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={ATTENDANCE_STATUS_TONES[correction.previousStatus]}>
              {ATTENDANCE_STATUS_LABELS[correction.previousStatus]}
            </Pill>
            <span className="text-slate-500">→</span>
            <Pill tone={ATTENDANCE_STATUS_TONES[correction.newStatus]}>
              {ATTENDANCE_STATUS_LABELS[correction.newStatus]}
            </Pill>
            <span className="text-slate-500">
              {formatDateTime(correction.createdAt)}
            </span>
            <Pill tone={correction.status === 'APPLIED' ? 'green' : 'amber'}>
              {correction.status}
            </Pill>
          </div>
          <p className="mt-1 text-slate-300">{correction.reason}</p>
        </li>
      ))}
    </ol>
  );
}
