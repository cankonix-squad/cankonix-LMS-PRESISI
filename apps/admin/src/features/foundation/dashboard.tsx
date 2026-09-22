import type {
  ApiListResponse,
  Organization,
  Permission,
  Person,
  Role,
  RoleAssignment,
  UserAccount,
} from '@lms/api-client';
import { SectionCard } from '@/components/admin-shell';
import { EmptyState, ErrorState, Pill } from '@/components/data-state';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import { CreateOrganizationForm } from './create-organization-form';
import { CreatePersonAccountForm } from './create-person-account-form';

export async function FoundationDashboard() {
  const hasSession = await hasAdminSession();
  if (!hasSession) return <LoginRequiredState />;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <OrganizationPanel />
      <PersonAccountPanel />
      <RolePermissionPanel />
      <AssignmentScopePanel />
    </div>
  );
}

export async function OrganizationPanel() {
  const api = createAdminApiClient();
  const organizations = await getOrEmpty(() =>
    api.organizations.list({ limit: 8 }),
  );

  return (
    <SectionCard
      id="organizations"
      title="Organization"
      description="Daftar unit organisasi dan form dasar. Hierarchy tetap divalidasi server."
    >
      <CreateOrganizationForm />
      <OrganizationList result={organizations} />
    </SectionCard>
  );
}

export async function PersonAccountPanel() {
  const api = createAdminApiClient();
  const persons = await getOrEmpty(() => api.persons.list({ limit: 8 }));
  const personAccounts =
    persons.data?.data.length && !persons.error
      ? await loadPersonAccounts(api, persons.data.data)
      : new Map<string, DataResult<UserAccount>>();

  return (
    <SectionCard
      id="persons"
      title="Person & User Account"
      description="Ringkasan personel foundation. Person dan user account tetap domain berbeda."
    >
      <CreatePersonAccountForm />
      <PersonList result={persons} accounts={personAccounts} />
    </SectionCard>
  );
}

export async function RolePermissionPanel() {
  const api = createAdminApiClient();
  const [roles, permissions] = await Promise.all([
    getOrEmpty(() => api.authorization.roles({ limit: 8 })),
    getOrEmpty(() => api.authorization.permissions({ limit: 8 })),
  ]);

  return (
    <SectionCard
      id="roles"
      title="Role & Permission"
      description="Katalog RBAC berbasis permission. UI tidak melakukan hardcoded role branching."
    >
      <RolePermissionList roles={roles} permissions={permissions} />
    </SectionCard>
  );
}

export async function AssignmentScopePanel() {
  const api = createAdminApiClient();
  const assignments = await getOrEmpty(() =>
    api.authorization.assignments({ limit: 8 }),
  );

  return (
    <SectionCard
      id="assignments"
      title="Assignment & Scope"
      description="Role assignment dan scope efektif. Backend tetap security boundary."
    >
      <AssignmentList result={assignments} />
    </SectionCard>
  );
}

function LoginRequiredState() {
  return (
    <SectionCard
      id="session"
      title="Masuk Diperlukan"
      description="Dashboard Admin membaca API protected dengan token aman hasil login SSO."
      className="mx-auto max-w-3xl"
    >
      <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4">
        <p className="text-sm leading-6 text-sky-50">
          Klik tombol masuk untuk autentikasi lewat SSO LMS PRESISI. Setelah
          callback berhasil, token disimpan sebagai cookie HTTP-only dan dipakai
          server-side untuk membaca API foundation.
        </p>
        <a
          href="/api/auth/login"
          className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
        >
          Masuk ke Admin LMS PRESISI
        </a>
      </div>
    </SectionCard>
  );
}

function OrganizationList({
  result,
}: {
  result: DataResult<ApiListResponse<Organization>>;
}) {
  if (result.error) return <ErrorState message={result.error} />;
  const items = result.data?.data ?? [];
  if (items.length === 0)
    return <EmptyState>Belum ada data organisasi.</EmptyState>;
  return (
    <div className="space-y-3">
      {items.map((org) => (
        <article
          key={org.id}
          className="rounded-2xl border border-slate-800 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-slate-100">{org.name}</p>
              <p className="mt-1 text-xs text-slate-500">{org.code}</p>
            </div>
            <Pill tone={org.status === 'ACTIVE' ? 'green' : 'red'}>
              {org.status}
            </Pill>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Parent: {org.parentId ?? 'Root'} · Type:{' '}
            {org.organizationType ?? '-'}
          </p>
        </article>
      ))}
    </div>
  );
}

function PersonList({
  result,
  accounts,
}: {
  result: DataResult<ApiListResponse<Person>>;
  accounts: Map<string, DataResult<UserAccount>>;
}) {
  if (result.error) return <ErrorState message={result.error} />;
  const items = result.data?.data ?? [];
  if (items.length === 0)
    return <EmptyState>Belum ada data personel.</EmptyState>;
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/60 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">NRP</th>
            <th className="px-4 py-3">Akun</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {items.map((person) => (
            <tr key={person.id}>
              <td className="px-4 py-3">{person.fullName}</td>
              <td className="px-4 py-3 text-slate-400">
                {person.personnelNumber}
              </td>
              <td className="px-4 py-3">
                <PersonAccountCell account={accounts.get(person.id)} />
              </td>
              <td className="px-4 py-3">
                <Pill tone={person.status === 'ACTIVE' ? 'green' : 'red'}>
                  {person.status}
                </Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PersonAccountCell({
  account,
}: {
  account: DataResult<UserAccount> | undefined;
}) {
  if (!account) return <Pill tone="slate">Belum dicek</Pill>;
  if (account.error) return <Pill tone="red">Belum ada akun</Pill>;
  if (!account.data) return <Pill tone="red">Belum ada akun</Pill>;
  return (
    <div className="flex flex-col gap-1">
      <Pill tone={account.data.status === 'ACTIVE' ? 'green' : 'red'}>
        {account.data.status}
      </Pill>
      <span className="max-w-48 truncate text-xs text-slate-500">
        {account.data.username ?? account.data.email ?? account.data.id}
      </span>
    </div>
  );
}

function RolePermissionList({
  roles,
  permissions,
}: {
  roles: DataResult<ApiListResponse<Role>>;
  permissions: DataResult<ApiListResponse<Permission>>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Roles</h3>
        {roles.error ? (
          <ErrorState message={roles.error} />
        ) : (
          <RoleList roles={roles.data?.data ?? []} />
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium text-slate-300">Permissions</h3>
        {permissions.error ? (
          <ErrorState message={permissions.error} />
        ) : (
          <PermissionList permissions={permissions.data?.data ?? []} />
        )}
      </div>
    </div>
  );
}

function RoleList({ roles }: { roles: Role[] }) {
  if (roles.length === 0) return <EmptyState>Belum ada role.</EmptyState>;
  return (
    <div className="space-y-2">
      {roles.map((role) => (
        <div key={role.id} className="rounded-xl border border-slate-800 p-3">
          <div className="flex justify-between gap-3">
            <p className="font-medium">{role.name}</p>
            {role.isSystem ? <Pill tone="blue">SYSTEM</Pill> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{role.code}</p>
        </div>
      ))}
    </div>
  );
}

function PermissionList({ permissions }: { permissions: Permission[] }) {
  if (permissions.length === 0)
    return <EmptyState>Belum ada permission.</EmptyState>;
  return (
    <div className="flex flex-wrap gap-2">
      {permissions.map((permission) => (
        <Pill key={permission.id}>{permission.code}</Pill>
      ))}
    </div>
  );
}

function AssignmentList({
  result,
}: {
  result: DataResult<ApiListResponse<RoleAssignment>>;
}) {
  if (result.error) return <ErrorState message={result.error} />;
  const items = result.data?.data ?? [];
  if (items.length === 0)
    return <EmptyState>Belum ada assignment role.</EmptyState>;
  return (
    <div className="space-y-3">
      {items.map((assignment) => (
        <article
          key={assignment.id}
          className="rounded-2xl border border-slate-800 p-4"
        >
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium">
                {assignment.role?.name ?? assignment.roleId}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                User: {assignment.userAccountId}
              </p>
            </div>
            <Pill tone={assignment.status === 'ACTIVE' ? 'green' : 'red'}>
              {assignment.status}
            </Pill>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {assignment.scopes.length === 0 ? (
              <Pill tone="blue">UNRESTRICTED</Pill>
            ) : (
              assignment.scopes.map((scope) => (
                <Pill key={scope.id}>
                  {scope.scopeType}: {scope.scopeId}
                </Pill>
              ))
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

type DataResult<T> = {
  data: T | null;
  error: string | null;
};

async function loadPersonAccounts(
  api: ReturnType<typeof createAdminApiClient>,
  persons: Person[],
) {
  const entries = await Promise.all(
    persons.map(async (person) => {
      const account = await getOrEmpty(() => api.persons.getAccount(person.id));
      return [person.id, account] as const;
    }),
  );
  return new Map(entries);
}
