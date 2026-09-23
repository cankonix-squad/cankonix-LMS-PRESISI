import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import { PersonWorkspace } from '@/features/foundation/person-management';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';

export const metadata = {
  title: 'Personel — Admin LMS PRESISI',
};

export default async function PersonelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await hasAdminSession())) redirect('/login');
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status =
    params.status === 'ACTIVE' || params.status === 'INACTIVE'
      ? params.status
      : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = [10, 25, 50].includes(Number(params.limit))
    ? Number(params.limit)
    : 25;
  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.persons.list({ search, status, page, limit }),
  );
  const organizations = await getOrEmpty(() =>
    api.organizations.list({ limit: 100 }),
  );
  const rows = result.data?.data
    ? await Promise.all(
        result.data.data.map(async (person) => {
          const [account, placements] = await Promise.all([
            getOrEmpty(() => api.persons.getAccount(person.id)),
            getOrEmpty(() => api.persons.listOrganizations(person.id)),
          ]);
          return {
            person,
            account: account.data,
            placements: placements.data ?? [],
          };
        }),
      )
    : [];
  return (
    <AdminShell>
      <PersonWorkspace
        result={result}
        filters={{ search, status, page, limit }}
        rows={rows}
        organizations={organizations.data?.data ?? []}
      />
    </AdminShell>
  );
}
