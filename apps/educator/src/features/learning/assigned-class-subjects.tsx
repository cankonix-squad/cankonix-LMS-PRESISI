import type { ClassSubject } from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { DataBlock, Pill } from '@/components/data-state';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

const statusTones: Record<
  ClassSubject['status'],
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  PLANNED: 'slate',
  ACTIVE: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
};

/**
 * Lists the class subjects in scope for this educator.
 *
 * The client sends no educator filter: "which class subjects may I see" is an
 * authorization question and is answered by the API. Adding a client-side
 * `educatorPersonId` here would be exactly the "no business logic duplication"
 * rule this task forbids.
 */
export async function AssignedClassSubjects() {
  const api = createEducatorApiClient();
  const classSubjects = await getOrEmpty(() =>
    api.classSubjects.list({ limit: 20 }),
  );

  return (
    <SectionCard
      id="kelas"
      title="Kelas Diampu"
      description="Daftar class subject yang menjadi tanggung jawab Anda. Cakupan data ditentukan API, bukan filter di browser."
    >
      <DataBlock
        result={classSubjects}
        empty="Belum ada kelas yang ditugaskan."
      >
        {(data) => (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.data.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">
                    {item.id.slice(0, 8)}…
                  </p>
                  <Pill tone={statusTones[item.status]}>{item.status}</Pill>
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-400">
                  <dt>Academic class</dt>
                  <dd className="truncate text-slate-300">
                    {item.academicClassId.slice(0, 8)}…
                  </dd>
                  <dt>Subject</dt>
                  <dd className="truncate text-slate-300">
                    {item.subjectId.slice(0, 8)}…
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </DataBlock>
    </SectionCard>
  );
}
