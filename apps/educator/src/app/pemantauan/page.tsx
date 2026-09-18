import { EducatorShell } from '@/components/educator-shell';
import { ProgressMonitor } from '@/features/learning/progress-monitor';

export default function Page() {
  return (
    <EducatorShell>
      <ProgressMonitor />
    </EducatorShell>
  );
}
