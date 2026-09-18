import type { Enrollment, ClassSubject } from '@lms/api-client';
import { Pill } from '@/components/data-state';

export function StudentEnrollmentsView({
  enrollments,
  classSubjects,
}: {
  enrollments: Enrollment[];
  classSubjects: ClassSubject[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">
            Belum ada pendaftaran kelas aktif yang terdata.
          </div>
        ) : (
          enrollments.map((enr) => {
            const subjectsInClass = classSubjects.filter(
              (cs) => cs.academicClassId === enr.academicClassId,
            );
            return (
              <div
                key={enr.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm transition hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-slate-400">
                      {enr.enrollmentNumber ?? enr.id.slice(0, 8)}
                    </span>
                    <Pill
                      tone={
                        enr.status === 'ACTIVE'
                          ? 'green'
                          : enr.status === 'COMPLETED'
                            ? 'blue'
                            : 'slate'
                      }
                    >
                      {enr.status}
                    </Pill>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-slate-100">
                    Kelas Terdaftar
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Batch ID: {enr.educationBatchId.slice(0, 8)}… • Kelas:{' '}
                    {enr.academicClassId
                      ? enr.academicClassId.slice(0, 8)
                      : 'Umum'}
                  </p>

                  <div className="mt-4 border-t border-slate-800/80 pt-3">
                    <span className="text-xs font-medium text-slate-300">
                      Mata Pelajaran ({subjectsInClass.length}):
                    </span>
                    {subjectsInClass.length === 0 ? (
                      <p className="mt-1 text-xs italic text-slate-500">
                        Belum ada mata pelajaran terhubung.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {subjectsInClass.map((cs) => (
                          <li
                            key={cs.id}
                            className="flex items-center justify-between rounded-lg bg-slate-950/60 px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate text-slate-300">
                              Subjek {cs.subjectId.slice(0, 8)}…
                            </span>
                            <Pill
                              tone={cs.status === 'ACTIVE' ? 'green' : 'slate'}
                            >
                              {cs.status}
                            </Pill>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex gap-2 border-t border-slate-800 pt-3">
                  <a
                    href={`/materi`}
                    className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 py-2 text-center text-xs font-medium text-sky-200 transition hover:border-sky-400 hover:bg-sky-500/20"
                  >
                    Buka Materi & Pertemuan
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
