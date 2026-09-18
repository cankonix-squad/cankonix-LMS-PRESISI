import type {
  ClassSubjectProgressSummary,
  LearningProgress,
} from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { DataBlock, Pill } from '@/components/data-state';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

const progressTones = {
  NOT_STARTED: 'slate',
  IN_PROGRESS: 'amber',
  COMPLETED: 'green',
} as const;

/**
 * Progress monitoring for the educator's scope.
 *
 * Reads the pre-aggregated class-subject summary that TASK-023 maintains, rather
 * than recomputing per-participant progress from the raw activity list. The
 * aggregate is the API's read model and the UI consumes it as-is.
 */
export async function ProgressMonitor() {
  const api = createEducatorApiClient();
  const [classSubjects, progress] = await Promise.all([
    getOrEmpty(() => api.classSubjects.list({ limit: 10 })),
    getOrEmpty(() =>
      api.learningProgress.listClassSubjectProgress({ limit: 20 }),
    ),
  ]);

  return (
    <SectionCard
      id="pemantauan"
      title="Pemantauan Progres"
      description="Ringkasan progres per kelas dan catatan progres per aktivitas. Data berasal dari aggregate yang dipelihara API."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            Ringkasan per kelas
          </h3>
          <DataBlock
            result={classSubjects}
            empty="Belum ada kelas untuk dipantau."
          >
            {(data) => (
              <ul className="flex flex-col gap-2">
                {data.data.map((subject) => (
                  <ClassSubjectSummaryRow
                    key={subject.id}
                    classSubjectId={subject.id}
                  />
                ))}
              </ul>
            )}
          </DataBlock>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">
            Catatan progres aktivitas
          </h3>
          <DataBlock result={progress} empty="Belum ada catatan progres.">
            {({ data }) => (
              <ul className="flex flex-col gap-2">
                {data.map((item: LearningProgress) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-300">
                      {item.progressPercent}% · aktivitas{' '}
                      {item.activityId.slice(0, 8)}…
                    </span>
                    <Pill tone={progressTones[item.status]}>{item.status}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </DataBlock>
        </div>
      </div>
    </SectionCard>
  );
}

async function ClassSubjectSummaryRow({
  classSubjectId,
}: {
  classSubjectId: string;
}) {
  const api = createEducatorApiClient();
  const summary = await getOrEmpty(() =>
    api.learningProgress.listByClassSubject(classSubjectId, { limit: 1 }),
  );

  if (summary.error) {
    return (
      <li className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100">
        Kelas {classSubjectId.slice(0, 8)}…: {summary.error}
      </li>
    );
  }

  const aggregate: ClassSubjectProgressSummary | null =
    summary.data?.classSubject ?? summary.data?.data[0] ?? null;

  if (!aggregate) {
    return (
      <li className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-400">
        Kelas {classSubjectId.slice(0, 8)}…: belum ada data progres.
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm">
      <span className="text-slate-300">
        Kelas {classSubjectId.slice(0, 8)}…
      </span>
      <span className="text-xs text-slate-400">
        {aggregate.completedCount}/{aggregate.enrollmentCount} selesai ·
        rata-rata {aggregate.averageProgressPercent}%
      </span>
    </li>
  );
}
