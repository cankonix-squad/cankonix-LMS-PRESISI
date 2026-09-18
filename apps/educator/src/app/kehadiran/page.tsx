import { EducatorShell } from '@/components/educator-shell';
import { AttendanceBoard } from '@/features/attendance/attendance-board';
import {
  buildRosterRows,
  groupCorrections,
  sortSessionsByStart,
} from '@/features/attendance/attendance-view';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

/**
 * Attendance page (TASK-032).
 *
 * The session is chosen through the URL so this stays a server component: the
 * token, the roster, and the correction history are all resolved on the server,
 * and the browser only renders the result. Each read degrades independently, so
 * one failing dependency does not blank the whole page.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const api = createEducatorApiClient();

  const sessionsResult = await getOrEmpty(() =>
    api.attendance.listSessions({ limit: 20 }),
  );
  const sessions = sortSessionsByStart(sessionsResult.data?.data ?? []);

  const requestedId = params.session;
  const selectedId =
    requestedId && sessions.some((s) => s.id === requestedId)
      ? requestedId
      : sessions[0]?.id;

  const selectedResult = selectedId
    ? await getOrEmpty(() => api.attendance.getSession(selectedId))
    : { data: null, error: null };
  const selected = selectedResult.data;

  const classSubjectResult = selected
    ? await getOrEmpty(() => api.classSubjects.get(selected.classSubjectId))
    : { data: null, error: null };

  const academicClassId = classSubjectResult.data?.academicClassId ?? null;
  const enrollmentsResult = academicClassId
    ? await getOrEmpty(() =>
        api.enrollments.list({
          academicClassId,
          status: 'ACTIVE',
          limit: 100,
        }),
      )
    : { data: null, error: null };

  const correctionsResult = selected
    ? await getOrEmpty(() =>
        api.attendanceCorrections.list({ sessionId: selected.id, limit: 100 }),
      )
    : { data: null, error: null };

  const rows = selected
    ? buildRosterRows(
        (enrollmentsResult.data?.data ?? []).map((enrollment) => ({
          id: enrollment.id,
          label: `Peserta ${enrollment.id.slice(0, 8)}…`,
          enrollmentNumber: enrollment.enrollmentNumber,
        })),
        selected.records,
        groupCorrections(correctionsResult.data?.data ?? []),
      )
    : [];

  return (
    <EducatorShell>
      {sessionsResult.error ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Daftar sesi belum dapat dimuat: {sessionsResult.error}
        </p>
      ) : null}
      {selectedResult.error ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Rincian sesi belum dapat dimuat: {selectedResult.error}
        </p>
      ) : null}
      {enrollmentsResult.error ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Daftar peserta belum dapat dimuat: {enrollmentsResult.error}
        </p>
      ) : null}
      {correctionsResult.error ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          Riwayat koreksi belum dapat dimuat: {correctionsResult.error}
        </p>
      ) : null}

      <AttendanceBoard
        sessions={sessions}
        selected={selected}
        rows={rows}
        correctionsByRecord={groupCorrections(
          correctionsResult.data?.data ?? [],
        )}
        className={academicClassId}
      />
    </EducatorShell>
  );
}
