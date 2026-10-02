import { AdminShell } from '@/components/admin-shell';
import { PersonWorkspace } from '@/features/foundation/person-management';
import {
  createAdminApiClient,
  getOrEmpty,
  requireAdminPortalAccess,
} from '@/lib/api';

export const metadata = {
  title: 'Personel — Admin LMS PRESISI',
};

export default async function PersonelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPortalAccess();
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
          // Provisioning status is only meaningful for a person that already has
          // a UserAccount, so the extra call is skipped otherwise.
          const keycloak = account.data
            ? await getOrEmpty(() =>
                api.persons.getKeycloakProvisioning(person.id),
              )
            : { data: null, error: null, status: 0 };
          return {
            person,
            account: account.data,
            // A failed account read (e.g. 403 without `user_account.read`) must
            // travel with the row so the UI can say "akses ditolak" instead of
            // showing the person as if no account exists.
            accountError: account.error
              ? { message: account.error, status: account.status }
              : null,
            placements: placements.data ?? [],
            keycloak: keycloak.data,
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
