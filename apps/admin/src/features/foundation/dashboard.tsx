import type {
  ApiListResponse,
  Organization,
  Permission,
  Person,
  Role,
  RoleAssignment,
  UserAccount,
} from '@lms/api-client';
import Link from 'next/link';
import { SectionCard } from '@/components/admin-shell';
import { EmptyState, ErrorState, Pill } from '@/components/data-state';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import { AssignmentManagement } from './assignment-management';
import { CreateOrganizationForm } from './create-organization-form';
import { CreatePersonAccountForm } from './create-person-account-form';

export async function FoundationDashboard() {
  const hasSession = await hasAdminSession();
  if (!hasSession) return <LoginRequiredState />;

  const api = createAdminApiClient();
  const [organizations, persons, roles, permissions, assignments] =
    await Promise.all([
      getOrEmpty(() => api.organizations.list({ limit: 8 })),
      getOrEmpty(() => api.persons.list({ limit: 8 })),
      getOrEmpty(() => api.authorization.roles({ limit: 8 })),
      getOrEmpty(() => api.authorization.permissions({ limit: 8 })),
      getOrEmpty(() => api.authorization.assignments({ limit: 8 })),
    ]);

  return (
    <div className="space-y-6">
      <DashboardHero />
      <KpiGrid
        organizations={organizations}
        persons={persons}
        roles={roles}
        permissions={permissions}
        assignments={assignments}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentFoundationTable
          organizations={organizations}
          persons={persons}
          roles={roles}
          assignments={assignments}
        />
        <QuickActions assignments={assignments} permissions={permissions} />
      </div>
    </div>
  );
}

function DashboardHero() {
  return (
    <section className="rounded-lg border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0d2538] p-6 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Dashboard Admin Pusat
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white">
            Administrasi Platform Nasional
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Kelola organisasi, personel, akun, permission, assignment, dan scope
            dalam satu workspace operasional. Validasi akses tetap dilakukan
            backend dengan permission dan scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/organisasi"
            className="inline-flex min-h-10 items-center rounded-md bg-sky-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Kelola Organisasi
          </Link>
          <Link
            href="/assignments"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-700 px-4 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:bg-slate-900"
          >
            Atur Hak Akses
          </Link>
        </div>
      </div>
    </section>
  );
}

function KpiGrid({
  organizations,
  persons,
  roles,
  permissions,
  assignments,
}: {
  organizations: DataResult<ApiListResponse<Organization>>;
  persons: DataResult<ApiListResponse<Person>>;
  roles: DataResult<ApiListResponse<Role>>;
  permissions: DataResult<ApiListResponse<Permission>>;
  assignments: DataResult<ApiListResponse<RoleAssignment>>;
}) {
  const kpis = [
    {
      label: 'Organisasi',
      value: totalOf(organizations),
      note: `${activeCount(organizations.data?.data)} aktif pada halaman awal`,
    },
    {
      label: 'Personel',
      value: totalOf(persons),
      note: `${activeCount(persons.data?.data)} personel aktif terbaca`,
    },
    {
      label: 'Role & Permission',
      value: totalOf(roles),
      note: `${totalOf(permissions)} permission tersedia`,
    },
    {
      label: 'Assignment Aktif',
      value: totalOf(assignments),
      note: `${activeCount(assignments.data?.data)} assignment aktif terbaca`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <article
          key={kpi.label}
          className="rounded-lg border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {kpi.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {kpi.value}
          </p>
          <p className="mt-2 text-sm text-slate-400">{kpi.note}</p>
        </article>
      ))}
    </div>
  );
}

function RecentFoundationTable({
  organizations,
  persons,
  roles,
  assignments,
}: {
  organizations: DataResult<ApiListResponse<Organization>>;
  persons: DataResult<ApiListResponse<Person>>;
  roles: DataResult<ApiListResponse<Role>>;
  assignments: DataResult<ApiListResponse<RoleAssignment>>;
}) {
  const hasError =
    organizations.error ?? persons.error ?? roles.error ?? assignments.error;
  if (hasError) {
    return (
      <SectionCard
        id="foundation-overview"
        title="Ringkasan Foundation"
        description="Status data operasional dari API foundation."
      >
        <ErrorState message={hasError} />
      </SectionCard>
    );
  }

  const rows = [
    ...(organizations.data?.data ?? []).slice(0, 3).map((item) => ({
      key: `org-${item.id}`,
      name: item.name,
      code: item.code,
      domain: 'Organisasi',
      status: item.status,
      href: '/organisasi',
    })),
    ...(persons.data?.data ?? []).slice(0, 3).map((item) => ({
      key: `person-${item.id}`,
      name: item.fullName,
      code: item.personnelNumber,
      domain: 'Personel',
      status: item.status,
      href: '/personel',
    })),
    ...(roles.data?.data ?? []).slice(0, 2).map((item) => ({
      key: `role-${item.id}`,
      name: item.name,
      code: item.code,
      domain: 'Role',
      status: item.status,
      href: '/roles',
    })),
    ...(assignments.data?.data ?? []).slice(0, 2).map((item) => ({
      key: `assignment-${item.id}`,
      name: item.role?.name ?? item.roleId,
      code: item.userAccountId,
      domain: 'Assignment',
      status: item.status,
      href: '/assignments',
    })),
  ];

  return (
    <SectionCard
      id="foundation-overview"
      title="Foundation Terbaru"
      description="Snapshot data utama untuk memantau kesiapan operasional Admin."
    >
      {rows.length === 0 ? (
        <EmptyState>
          Belum ada data foundation yang dapat ditampilkan.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{row.name}</p>
                    <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                      {row.code}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.domain}</td>
                  <td className="px-4 py-3">
                    <Pill tone={row.status === 'ACTIVE' ? 'green' : 'red'}>
                      {row.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={row.href}
                      className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                    >
                      Kelola
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function QuickActions({
  assignments,
  permissions,
}: {
  assignments: DataResult<ApiListResponse<RoleAssignment>>;
  permissions: DataResult<ApiListResponse<Permission>>;
}) {
  const actionItems = [
    {
      label: 'Tambah Organisasi',
      href: '/organisasi',
      note: 'Unit, kode, dan hierarchy',
    },
    {
      label: 'Tambah Person & Akun',
      href: '/personel',
      note: 'Identitas personel dan UserAccount',
    },
    {
      label: 'Review Role',
      href: '/roles',
      note: `${totalOf(permissions)} permission terbaca`,
    },
    {
      label: 'Atur Assignment',
      href: '/assignments',
      note: `${activeCount(assignments.data?.data)} assignment aktif`,
    },
  ];

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Operasional
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Tindakan Cepat
          </h2>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {actionItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-800 bg-slate-950/40 px-3 py-3 transition hover:border-sky-400/70 hover:bg-slate-900"
          >
            <span>
              <span className="block text-sm font-medium text-slate-100">
                {item.label}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {item.note}
              </span>
            </span>
            <span
              className="text-sm font-semibold text-sky-300"
              aria-hidden="true"
            >
              &gt;
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-sky-500/20 bg-sky-500/10 p-4 text-sm leading-6 text-sky-50">
        Semua perubahan akses tetap diproses melalui endpoint protected. Bila
        operator belum punya permission, UI akan menampilkan arahan operasional.
      </div>
    </aside>
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
  const [assignments, roles, persons] = await Promise.all([
    getOrEmpty(() => api.authorization.assignments({ limit: 8 })),
    getOrEmpty(() => api.authorization.roles({ limit: 50 })),
    getOrEmpty(() => api.persons.list({ limit: 50 })),
  ]);
  const accounts =
    persons.data?.data.length && !persons.error
      ? await loadUserAccounts(api, persons.data.data)
      : [];

  return (
    <SectionCard
      id="assignments"
      title="Assignment & Scope"
      description="Role assignment dan scope efektif. Backend tetap security boundary."
    >
      <AssignmentManagement
        roles={(roles.data?.data ?? []).filter(
          (role) => role.status === 'ACTIVE',
        )}
        accounts={accounts}
        assignments={assignments.data?.data ?? []}
      />
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
          className="rounded-lg border border-slate-800 p-4"
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
    <div className="overflow-hidden rounded-lg border border-slate-800">
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
        <div key={role.id} className="rounded-lg border border-slate-800 p-3">
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
          className="rounded-lg border border-slate-800 p-4"
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

function totalOf<T>(result: DataResult<ApiListResponse<T>>) {
  if (result.error) return '-';
  return String(result.data?.total ?? result.data?.data.length ?? 0);
}

function activeCount<T extends { status?: string }>(items: T[] | undefined) {
  return (items ?? []).filter((item) => item.status === 'ACTIVE').length;
}

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

async function loadUserAccounts(
  api: ReturnType<typeof createAdminApiClient>,
  persons: Person[],
) {
  const accounts = await Promise.all(
    persons.map(async (person) => {
      const account = await getOrEmpty(() => api.persons.getAccount(person.id));
      return account.data;
    }),
  );
  return accounts.filter((account): account is UserAccount => Boolean(account));
}
