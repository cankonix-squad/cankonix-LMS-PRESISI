import { EducatorShell } from '@/components/educator-shell';
import { AssignedClassSubjects } from '@/features/learning/assigned-class-subjects';

export default function Page() {
  return (
    <EducatorShell>
      <AssignedClassSubjects />
    </EducatorShell>
  );
}
