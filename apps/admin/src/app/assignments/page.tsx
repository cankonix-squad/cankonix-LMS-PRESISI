import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { AssignmentWorkspace } from '@/features/foundation/assignment-scope-management';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Assignment & Scope — Admin LMS PRESISI',
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');

  const params = await searchParams;
  const search = value(params.search);
  const status =
    params.status === 'ACTIVE' ||
    params.status === 'INACTIVE' ||
    params.status === 'REVOKED'
      ? params.status
      : undefined;
  const roleId = value(params.roleId);
  const scopeType = value(params.scopeType);
  const page = positiveInt(params.page);
  const limit = clamp(positiveInt(params.limit, 25), 10, 50);
  const api = createAdminApiClient();
  const [result, roles, persons] = await Promise.all([
    getOrEmpty(() =>
      api.authorization.assignments({
        roleId,
        status,
        page: 1,
        limit: 100,
      }),
    ),
    getOrEmpty(() => api.authorization.roles({ limit: 100 })),
    getOrEmpty(() => api.persons.list({ limit: 100 })),
  ]);
  const accounts = persons.data?.data
    ? (
        await Promise.all(
          persons.data.data.map(async (person) => ({
            person,
            account: (await getOrEmpty(() => api.persons.getAccount(person.id)))
              .data,
          })),
        )
      ).filter(
        (
          row,
        ): row is typeof row & { account: NonNullable<typeof row.account> } =>
          Boolean(row.account),
      )
    : [];

  return (
    <AdminShell>
      <AssignmentWorkspace
        result={result}
        roles={roles.data?.data ?? []}
        accounts={accounts}
        filters={{ search, status, roleId, scopeType, page, limit }}
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
