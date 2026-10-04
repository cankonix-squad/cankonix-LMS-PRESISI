import { AdminShell } from '@/components/admin-shell';
import { loadAccountPersonOptions } from '@/features/foundation/account-person-options';
import { AccountWorkspace } from '@/features/foundation/account-management';
import {
  createAdminApiClient,
  getOrEmpty,
  requireAdminPortalAccess,
} from '@/lib/api';

export const metadata = {
  title: 'Akun Pengguna — Admin LMS PRESISI',
};

export default async function AkunPenggunaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPortalAccess();
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search : undefined;
  const status =
    params.status === 'ACTIVE' ||
    params.status === 'INACTIVE' ||
    params.status === 'SUSPENDED'
      ? params.status
      : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const limit = [10, 25, 50].includes(Number(params.limit))
    ? Number(params.limit)
    : 25;
  const api = createAdminApiClient();
  const result = await getOrEmpty(() =>
    api.userAccounts.list({ search, status, page, limit }),
  );
  const rows = result.data?.data
    ? await Promise.all(
        result.data.data.map(async (account) => ({
          account,
          keycloak: (
            await getOrEmpty(() =>
              api.persons.getKeycloakProvisioning(account.person.id),
            )
          ).data,
        })),
      )
    : [];

  const personOptions = await getOrEmpty(() => loadAccountPersonOptions(api));

  return (
    <AdminShell>
      <AccountWorkspace
        result={result}
        filters={{ search, status, page, limit }}
        rows={rows}
        personOptions={personOptions.data ?? []}
        personOptionsError={
          personOptions.error
            ? 'Pilihan individu belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.'
            : null
        }
      />
    </AdminShell>
  );
}
