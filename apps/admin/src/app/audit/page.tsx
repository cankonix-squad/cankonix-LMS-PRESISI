import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AuditWorkspace } from '@/features/system/audit-workspace';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Riwayat Audit — Admin LMS PRESISI',
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const action = value(params.action);
  const resourceType = value(params.resourceType);
  const actor = value(params.actor);
  const search = value(params.search);
  const from = value(params.from);
  const to = value(params.to);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 20), 10, 100);

  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.audit.list({
      action,
      resourceType,
      actorUserAccountId: actor,
      search,
      from,
      to,
      page,
      limit,
    }),
  );

  return (
    <AdminShell>
      <AuditWorkspace
        result={result}
        filters={{ action, resourceType, actor, search, from, to, page, limit }}
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
