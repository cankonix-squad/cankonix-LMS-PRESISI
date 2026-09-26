import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { GraduationWorkspace } from '@/features/graduation/graduation-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { GraduationRuleStatus } from '@lms/api-client';

export const metadata = {
  title: 'Kelulusan — Admin LMS PRESISI',
};

export default async function KelulusanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const code = value(params.code);
  const status = ruleStatusFilter(params.status);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.graduation.listRules({ code, status, page, limit }),
  );

  return (
    <AdminShell>
      <GraduationWorkspace
        result={result}
        filters={{ code, status, page, limit }}
      />
    </AdminShell>
  );
}

function value(input: string | string[] | undefined) {
  return typeof input === 'string' && input.trim() ? input.trim() : undefined;
}

function ruleStatusFilter(
  input: string | string[] | undefined,
): GraduationRuleStatus | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
  return allowed.includes(input)
    ? (input as GraduationRuleStatus)
    : undefined;
}

function positiveInt(input: string | string[] | undefined, fallback = 1) {
  if (typeof input !== 'string') return fallback;
  const parsed = Number(input);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}