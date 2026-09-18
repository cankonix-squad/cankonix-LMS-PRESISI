import type {
  AttendanceCorrection,
  AttendanceSession,
  AttendanceSessionDetail,
} from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { EmptyState, Pill, formatDateTime } from '@/components/data-state';
import {
  ATTENDANCE_METHOD_LABELS,
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_TONES,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_TONES,
  type RosterRow,
} from './attendance-view';
import {
  AttendanceSessionPanel,
  CorrectionForm,
  CorrectionHistory,
} from './attendance-session-panel';

/**
 * Attendance board (TASK-032).
 *
 * The selected session is addressed by URL (`?session=<id>`) and rendered on the
 * server, so the API token never reaches the browser and a reload always shows
 * the API's own state. Nothing is cached optimistically: after a mutation the
 * educator reloads and sees what the API recorded.
 */
export function AttendanceBoard({
  sessions,
  selected,
  rows,
  correctionsByRecord,
  className,
}: {
  sessions: AttendanceSession[];
  selected: AttendanceSessionDetail | null;
  rows: RosterRow[];
  correctionsByRecord: Record<string, AttendanceCorrection[]>;
  className: string | null;
}) {
  if (sessions.length === 0) {
    return (
      <SectionCard
        id="kehadiran"
        title="Kehadiran"
        description="Daftar sesi kehadiran pada kelas yang menjadi tanggung jawab Anda."
      >
        <EmptyState>
          Belum ada sesi kehadiran pada cakupan ini. Sesi dibuat melalui API
          `/api/v1/attendance/sessions`.
        </EmptyState>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      id="kehadiran"
      title="Kehadiran"
      description="Pilih sesi, tandai kehadiran peserta, lalu tutup sesi. Setelah sesi ditutup, perubahan hanya melalui koreksi beralasan yang tercatat sebagai riwayat."
    >
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Daftar sesi" className="flex flex-col gap-2">
          {sessions.map((session) => {
            const isSelected = session.id === selected?.id;
            return (
              <a
                key={session.id}
                href={`/kehadiran?session=${session.id}`}
                aria-current={isSelected ? 'true' : undefined}
                className={`rounded-2xl border px-3 py-2 text-sm transition ${
                  isSelected
                    ? 'border-sky-400/60 bg-sky-500/10 text-sky-100'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-sky-400/40'
                }`}
              >
                <span className="block font-medium">
                  {session.title ?? 'Sesi Kehadiran'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {formatDateTime(session.startAt)} ·{' '}
                  {ATTENDANCE_METHOD_LABELS[session.method]}
                </span>
                <span className="mt-2 inline-block">
                  <Pill tone={SESSION_STATUS_TONES[session.status]}>
                    {SESSION_STATUS_LABELS[session.status]}
                  </Pill>
                </span>
              </a>
            );
          })}
        </nav>

        <div className="flex flex-col gap-6">
          {selected ? (
            <AttendanceSessionPanel
              sessionId={selected.id}
              className={className}
              title={selected.title}
              status={selected.status}
              startAt={selected.startAt}
              endAt={selected.endAt}
              rows={rows}
            />
          ) : (
            <EmptyState>Pilih satu sesi untuk melihat daftar hadir.</EmptyState>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-200">
              Koreksi & riwayat per peserta
            </h3>
            {rows.filter((row) => row.record).length === 0 ? (
              <EmptyState>
                Belum ada catatan kehadiran pada sesi ini, jadi belum ada yang
                dapat dikoreksi.
              </EmptyState>
            ) : (
              <ul className="flex flex-col gap-3">
                {rows
                  .filter((row) => row.record)
                  .map((row) => (
                    <li
                      key={row.record!.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-200">
                          {row.participantName}
                        </span>
                        <span className="flex items-center gap-2">
                          <Pill
                            tone={ATTENDANCE_STATUS_TONES[row.record!.status]}
                          >
                            {ATTENDANCE_STATUS_LABELS[row.record!.status]}
                          </Pill>
                          <Pill tone={row.corrected ? 'amber' : 'slate'}>
                            {row.corrected ? 'pernah dikoreksi' : 'asli'}
                          </Pill>
                        </span>
                      </div>
                      <div className="mt-3">
                        <CorrectionForm
                          recordId={row.record!.id}
                          currentStatus={row.record!.status}
                        />
                      </div>
                      <div className="mt-3">
                        <CorrectionHistory
                          corrections={
                            correctionsByRecord[row.record!.id] ?? []
                          }
                        />
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
