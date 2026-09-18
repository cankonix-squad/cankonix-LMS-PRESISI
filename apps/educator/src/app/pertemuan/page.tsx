import { EducatorShell } from '@/components/educator-shell';
import { MeetingActivityEditor } from '@/features/learning/meeting-activity-editor';

export default function Page() {
  return (
    <EducatorShell>
      <MeetingActivityEditor />
    </EducatorShell>
  );
}
