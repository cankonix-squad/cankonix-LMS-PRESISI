import { StudentShell, SectionCard } from '@/components/student-shell';
import { StudentMeetingActivitiesClient } from '@/features/learning/student-meeting-activities';
import { createStudentApiClient, getOrEmpty } from '@/lib/api';

export default async function Page() {
  const api = createStudentApiClient();

  const [enrollments, meetings, activities, contents, progressList] =
    await Promise.all([
      getOrEmpty(() => api.enrollments.list({ limit: 50 })),
      getOrEmpty(() => api.learningMeetings.list({ limit: 50 })),
      getOrEmpty(() => api.learningActivities.list({ limit: 100 })),
      getOrEmpty(() => api.learningActivityContents.list({ limit: 200 })),
      getOrEmpty(() =>
        api.learningProgress.listClassSubjectProgress({ limit: 200 }),
      ),
    ]);

  return (
    <StudentShell>
      <SectionCard
        id="student-materi"
        title="Pertemuan & Materi Pembelajaran"
        description="Pelajari modul, tonton video, atau akses pranala bahan ajar pada setiap pertemuan kelas Anda."
      >
        <StudentMeetingActivitiesClient
          enrollments={enrollments.data?.data ?? []}
          meetings={meetings.data?.data ?? []}
          activities={activities.data?.data ?? []}
          contents={contents.data?.data ?? []}
          progressList={progressList.data?.data ?? []}
        />
      </SectionCard>
    </StudentShell>
  );
}
