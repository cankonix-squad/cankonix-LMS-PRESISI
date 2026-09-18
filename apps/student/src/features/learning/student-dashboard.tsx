import type {
  Enrollment,
  ClassSubject,
  LearningMeeting,
  Assignment,
  AssignmentSubmission,
} from '@lms/api-client';
import { Pill, formatDateTime } from '@/components/data-state';
import { StudentEnrollmentsView } from './student-enrollments';

export function StudentDashboardView({
  enrollments,
  classSubjects,
  meetings,
  assignments,
  submissions,
  now,
}: {
  enrollments: Enrollment[];
  classSubjects: ClassSubject[];
  meetings: LearningMeeting[];
  assignments: Assignment[];
  submissions: AssignmentSubmission[];
  now: number;
}) {
  const pendingAssignments = assignments.filter((a) => {
    const hasSubmission = submissions.some((s) => s.assignmentId === a.id);
    return a.status === 'PUBLISHED' && !hasSubmission;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Status Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xl font-bold text-sky-400 sm:text-2xl">
            {enrollments.length}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Kelas Terdaftar
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xl font-bold text-emerald-400 sm:text-2xl">
            {meetings.length}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Pertemuan Aktif
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xl font-bold text-amber-400 sm:text-2xl">
            {pendingAssignments.length}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Tugas Belum Dikirim
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <span className="text-xl font-bold text-slate-200 sm:text-2xl">
            {submissions.length}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Total Pengiriman
          </span>
        </div>
      </div>

      {/* Pending Tasks / Urgent Deadlines */}
      {pendingAssignments.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/10 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
              ⚠️ Tugas Menunggu Pengiriman ({pendingAssignments.length})
            </h3>
            <a
              href="/tugas"
              className="text-xs font-semibold text-sky-400 hover:underline"
            >
              Lihat Semua Tugas →
            </a>
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {pendingAssignments.slice(0, 4).map((asg) => {
              const isPastDue = asg.dueAt
                ? new Date(asg.dueAt).getTime() < now
                : false;
              return (
                <div
                  key={asg.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/80 p-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {asg.title}
                      </span>
                      <Pill tone={isPastDue ? 'red' : 'amber'}>
                        {isPastDue ? 'Terlewat' : 'Mendatang'}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Tenggat: {formatDateTime(asg.dueAt)}
                    </p>
                  </div>
                  <div className="mt-2 text-right">
                    <a
                      href="/tugas"
                      className="text-xs font-medium text-sky-400 hover:underline"
                    >
                      Kumpulkan Tugas →
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Enrolled Classes */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-100 sm:text-lg">
          Daftar Pendaftaran Kelas
        </h3>
        <StudentEnrollmentsView
          enrollments={enrollments}
          classSubjects={classSubjects}
        />
      </div>
    </div>
  );
}
