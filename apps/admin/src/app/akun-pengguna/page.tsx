import { AdminShell } from '@/components/admin-shell';
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

  // A new account can only be linked to a person that does not have one yet, so
  // the picker is built from the person directory minus the account directory.
  // The person list is fetched with a generous page size and completed with an
  // extra pass, because excluding account owners can leave the first page empty.
  const personOptions = await loadPersonOptions(api, rows);

  return (
    <AdminShell>
      <AccountWorkspace
        result={result}
        filters={{ search, status, page, limit }}
        rows={rows}
        personOptions={personOptions}
      />
    </AdminShell>
  );
}

type AdminApiClient = ReturnType<typeof createAdminApiClient>;
type PersonOption = Awaited<
  ReturnType<AdminApiClient['persons']['list']>
>['data'][number];

const PERSON_OPTION_PAGE_SIZE = 100;

async function loadPersonOptions(
  api: AdminApiClient,
  knownRows: { account: { person: { id: string } } }[],
) {
  const takenIds = new Set(knownRows.map((row) => row.account.person.id));
  const options: PersonOption[] = [];
  let page = 1;
  while (options.length < PERSON_OPTION_PAGE_SIZE) {
    const people = await getOrEmpty(() =>
      api.persons.list({
        status: 'ACTIVE',
        page,
        limit: PERSON_OPTION_PAGE_SIZE,
      }),
    );
    const batch = people.data?.data ?? [];
    for (const person of batch) {
      if (!takenIds.has(person.id)) options.push(person);
    }
    const total = people.data?.total ?? 0;
    if (batch.length === 0 || page * PERSON_OPTION_PAGE_SIZE >= total) break;
    page += 1;
  }
  return options.slice(0, PERSON_OPTION_PAGE_SIZE);
}
