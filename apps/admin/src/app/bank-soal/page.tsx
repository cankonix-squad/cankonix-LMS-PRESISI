import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { QuestionBankWorkspace } from '@/features/assessment/question-bank-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Bank Soal — Admin LMS PRESISI',
};

export default async function BankSoalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const search = value(params.search);
  const curriculumId = value(params.curriculumId);
  const subjectId = value(params.subjectId);
  const status =
    params.status === 'ACTIVE' || params.status === 'INACTIVE'
      ? params.status
      : undefined;
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);
  const api = createAdminApiClient();
  const [banks, curricula] = await Promise.all([
    getOrEmpty(() =>
      api.questionBanks.list({
        search,
        curriculumId,
        subjectId,
        status,
        page,
        limit,
      }),
    ),
    getOrEmpty(() =>
      api.curricula.list({ status: 'ACTIVE', limit: 100 }),
    ),
  ]);

  return (
    <AdminShell>
      <QuestionBankWorkspace
        result={banks}
        curricula={curricula.data?.data ?? []}
        filters={{
          search,
          curriculumId,
          subjectId,
          status,
          page,
          limit,
        }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}