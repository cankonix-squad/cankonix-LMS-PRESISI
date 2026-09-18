import { StudentShell, SectionCard } from '@/components/student-shell';
import { StudentProgressOverviewView } from '@/features/learning/student-progress-overview';
import { createStudentApiClient, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createStudentApiClient();

  const [activities, allProgress] = await Promise.all([
    getOrEmpty(() => api.learningActivities.list({ limit: 100 })),
    getOrEmpty(() =>
      api.learningProgress.listClassSubjectProgress({ limit: 200 }),
    ),
  ]);

  return (
    <StudentShell>
      <SectionCard
        id="student-kemajuan"
        title="Kemajuan Belajar Saya"
        description="Pantau pencapaian penyelesaian aktivitas pembelajaran dan statistik pemenuhan target mata pelajaran."
      >
        <StudentProgressOverviewView
          progressSummaries={[]}
          allProgress={allProgress.data?.data ?? []}
          activities={activities.data?.data ?? []}
        />
      </SectionCard>
    </StudentShell>
  );
}
