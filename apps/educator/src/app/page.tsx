import { EducatorShell } from '@/components/educator-shell';
import { EducatorDashboard } from '@/features/learning/dashboard';

export default function Page() {
  return (
    <EducatorShell>
      <EducatorDashboard />
    </EducatorShell>
  );
}
