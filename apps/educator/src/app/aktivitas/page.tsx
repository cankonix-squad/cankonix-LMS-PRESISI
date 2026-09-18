import { EducatorShell } from '@/components/educator-shell';
import { ContentLibrary } from '@/features/learning/content-library';

export default function Page() {
  return (
    <EducatorShell>
      <ContentLibrary />
    </EducatorShell>
  );
}
