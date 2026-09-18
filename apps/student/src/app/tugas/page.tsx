import { StudentShell, SectionCard } from '@/components/student-shell';
import { StudentAssignmentBoardClient } from '@/features/learning/student-assignment-board';
import { createStudentApiClient, currentTimeMs, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createStudentApiClient();
  const now = currentTimeMs();

  const [enrollments, assignments, submissions] = await Promise.all([
    getOrEmpty(() => api.enrollments.list({ limit: 50 })),
    getOrEmpty(() => api.assignments.list({ limit: 50 })),
    getOrEmpty(() => api.submissions.list({ limit: 50 })),
  ]);

  return (
    <StudentShell>
      <SectionCard
        id="student-tugas"
        title="Tugas & Penilaian Saya"
        description="Pantau tenggat waktu tugas, kumpulkan lembar jawaban, dan lihat catatan serta umpan balik dari tenaga pendidik."
      >
        <StudentAssignmentBoardClient
          enrollments={enrollments.data?.data ?? []}
          assignments={assignments.data?.data ?? []}
          submissions={submissions.data?.data ?? []}
          now={now}
        />
      </SectionCard>
    </StudentShell>
  );
}
