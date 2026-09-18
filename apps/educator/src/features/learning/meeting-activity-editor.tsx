import type { LearningActivityStatus, LearningMeeting } from '@lms/api-client';
import { SectionCard } from '@/components/educator-shell';
import { DataBlock, Pill, formatDateTime } from '@/components/data-state';
import { createEducatorApiClient, getOrEmpty } from '@/lib/api';

const meetingTones: Record<
  LearningMeeting['status'],
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  PLANNED: 'slate',
  PUBLISHED: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
};

const activityTones: Record<
  LearningActivityStatus,
  'slate' | 'green' | 'red' | 'blue' | 'amber'
> = {
  DRAFT: 'slate',
  PUBLISHED: 'green',
  CLOSED: 'amber',
  ARCHIVED: 'red',
};

/**
 * Meeting and activity editor surface.
 *
 * Reads meetings, then each meeting's activities. The API is the security
 * boundary: this component never decides who may read or write, it only renders
 * what came back and offers the mutations the API already permits.
 */
export async function MeetingActivityEditor() {
  const api = createEducatorApiClient();
  const meetings = await getOrEmpty(() =>
    api.learningMeetings.list({ limit: 10 }),
  );

  return (
    <SectionCard
      id="pertemuan"
      title="Pertemuan & Aktivitas"
      description="Setiap pertemuan memuat daftar aktivitasnya. Perubahan status aktivitas divalidasi lifecycle di backend."
    >
      <DataBlock result={meetings} empty="Belum ada pertemuan.">
        {({ data }) => (
          <div className="flex flex-col gap-4">
            {data.map((meeting) => (
              <MeetingBlock key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </DataBlock>
    </SectionCard>
  );
}

async function MeetingBlock({ meeting }: { meeting: LearningMeeting }) {
  const api = createEducatorApiClient();
  const activities = await getOrEmpty(() =>
    api.learningActivities.list({ meetingId: meeting.id, limit: 20 }),
  );

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-100">
            {meeting.meetingNo}. {meeting.title}
          </p>
          <p className="text-xs text-slate-500">
            {formatDateTime(meeting.scheduledAt)} ·{' '}
            {meeting.topic ?? 'Tanpa topik'}
          </p>
        </div>
        <Pill tone={meetingTones[meeting.status]}>{meeting.status}</Pill>
      </header>

      <div className="mt-3 border-t border-slate-800 pt-3">
        <DataBlock
          result={activities}
          empty="Pertemuan ini belum memiliki aktivitas."
        >
          {({ data }) => (
            <ul className="flex flex-col gap-2">
              {data.map((activity) => (
                <li
                  key={activity.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {activity.sequenceNo}. {activity.title}
                    {activity.isRequired ? (
                      <span className="ml-2 text-xs text-rose-300">wajib</span>
                    ) : null}
                  </span>
                  <Pill tone={activityTones[activity.status]}>
                    {activity.status}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </DataBlock>
      </div>
    </article>
  );
}
