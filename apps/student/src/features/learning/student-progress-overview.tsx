import type {
  ClassSubjectProgressSummary,
  LearningProgress,
  LearningActivity,
} from '@lms/api-client';
import { Pill } from '@/components/data-state';

export function StudentProgressOverviewView({
  progressSummaries,
  allProgress,
  activities,
}: {
  progressSummaries: ClassSubjectProgressSummary[];
  allProgress: LearningProgress[];
  activities: LearningActivity[];
}) {
  const completedCount = allProgress.filter(
    (p) => p.status === 'COMPLETED',
  ).length;
  const inProgressCount = allProgress.filter(
    (p) => p.status === 'IN_PROGRESS',
  ).length;
  const totalCount = activities.length;
  const overallPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* High-level Stats Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center">
          <span className="text-2xl font-bold text-sky-400">
            {overallPercent}%
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Kemajuan Pembelajaran
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center">
          <span className="text-2xl font-bold text-emerald-400">
            {completedCount}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Aktivitas Selesai
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center">
          <span className="text-2xl font-bold text-amber-400">
            {inProgressCount}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Sedang Berjalan
          </span>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center">
          <span className="text-2xl font-bold text-slate-200">
            {totalCount}
          </span>
          <span className="block mt-1 text-xs text-slate-400">
            Total Aktivitas
          </span>
        </div>
      </div>

      {/* Progress per Class Subject */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Ringkasan Kemajuan per Mata Pelajaran ({progressSummaries.length})
        </h3>

        {progressSummaries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-400">
            Belum ada ringkasan kemajuan terdata. Aktivitas yang diselesaikan
            akan memperbarui ringkasan ini secara otomatis.
          </div>
        ) : (
          progressSummaries.map((summary) => (
            <div
              key={summary.classSubjectId}
              className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">
                    Mata Pelajaran (ID: {summary.classSubjectId.slice(0, 8)}…)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Aktivitas Selesai: {summary.completedCount} /{' '}
                    {summary.enrollmentCount}
                  </p>
                </div>

                <Pill
                  tone={
                    summary.averageProgressPercent >= 80
                      ? 'green'
                      : summary.averageProgressPercent >= 40
                        ? 'amber'
                        : 'slate'
                  }
                >
                  {summary.averageProgressPercent}% Terpenuhi
                </Pill>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 border border-slate-800 overflow-hidden">
                <div
                  className="bg-sky-500 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, summary.averageProgressPercent))}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
