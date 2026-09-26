import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { GraduationDecisionWorkspace } from '@/features/graduation/decision-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import type { GraduationDecisionOutcome, GraduationDecisionStatus } from '@lms/api-client';

export const metadata = {
  title: 'Keputusan Kelulusan — Admin LMS PRESISI',
};

export default async function KeputusanKelulusanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const status = decisionStatusFilter(params.status);
  const decision = decisionOutcomeFilter(params.decision);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.graduationDecisions.list({ status, decision, page, limit }),
  );

  return (
    <AdminShell>
      <GraduationDecisionWorkspace
        result={result}
        filters={{ status, decision, page, limit }}
      />
    </AdminShell>
  );
}

function decisionStatusFilter(
  input: string | string[] | undefined,
): GraduationDecisionStatus | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['DRAFT', 'APPROVED', 'REVOKED'];
  return allowed.includes(input)
    ? (input as GraduationDecisionStatus)
    : undefined;
}

function decisionOutcomeFilter(
  input: string | string[] | undefined,
): GraduationDecisionOutcome | undefined {
  if (typeof input !== 'string') return undefined;
  const allowed = ['PASS', 'FAIL', 'REMEDIAL', 'WITHDRAWN'];
  return allowed.includes(input)
    ? (input as GraduationDecisionOutcome)
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