import { StudentShell, SectionCard } from '@/components/student-shell';
import { StudentDashboardView } from '@/features/learning/student-dashboard';
import { createStudentApiClient, currentTimeMs, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createStudentApiClient();
  const now = currentTimeMs();

  const [enrollments, classSubjects, meetings, assignments, submissions] =
    await Promise.all([
      getOrEmpty(() => api.enrollments.list({ limit: 50 })),
      getOrEmpty(() => api.classSubjects.list({ limit: 50 })),
      getOrEmpty(() => api.learningMeetings.list({ limit: 50 })),
      getOrEmpty(() => api.assignments.list({ limit: 50 })),
      getOrEmpty(() => api.submissions.list({ limit: 50 })),
    ]);

  return (
    <StudentShell>
      <SectionCard
        id="student-dashboard"
        title="Dashboard Pembelajaran"
        description="Ringkasan kelas, jadwal pertemuan, dan tugas yang membutuhkan tindakan Anda."
      >
        <StudentDashboardView
          enrollments={enrollments.data?.data ?? []}
          classSubjects={classSubjects.data?.data ?? []}
          meetings={meetings.data?.data ?? []}
          assignments={assignments.data?.data ?? []}
          submissions={submissions.data?.data ?? []}
          now={now}
        />
      </SectionCard>
    </StudentShell>
  );
}
