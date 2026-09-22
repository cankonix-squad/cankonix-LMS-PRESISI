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
import {
  DataTable,
  FormPanel,
  PageHeader,
  StatCard,
  Toolbar,
} from '@/components/admin-design-system';
import { SectionCard } from '@/components/admin-shell';
import { EmptyState, ErrorState, Pill } from '@/components/data-state';
import { createAdminApiClient, getOrEmpty, hasAdminSession } from '@/lib/api';
import { AssignmentManagement } from './assignment-management';
import { CreateOrganizationForm } from './create-organization-form';
import { CreatePersonAccountForm } from './create-person-account-form';
import { OrganizationRowActions } from './organization-management';

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
      <PageHeader
        eyebrow="Dashboard Admin Pusat"
        title="Administrasi Platform Nasional"
        description="Kelola organisasi, personel, akun, permission, assignment, dan scope dalam satu workspace operasional."
      />
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
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Operasional
          </p>
          <h2 className="mt-3 max-w-3xl text-2xl font-semibold tracking-tight text-slate-950">
            Ringkasan kesiapan foundation
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Snapshot data foundation untuk memantau kesiapan Admin sebelum
            operator masuk ke halaman detail. Validasi akses tetap dilakukan
            backend dengan permission dan scope.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/organisasi"
            className="inline-flex min-h-10 items-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Kelola Organisasi
          </Link>
          <Link
            href="/assignments"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
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
        <StatCard
          key={kpi.label}
          label={kpi.label}
          value={kpi.value}
          note={kpi.note}
        />
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
        <DataTable columns={['Nama', 'Domain', 'Status', 'Aksi']}>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-950">{row.name}</p>
                <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                  {row.code}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-600">{row.domain}</td>
              <td className="px-4 py-3">
                <Pill tone={row.status === 'ACTIVE' ? 'green' : 'red'}>
                  {row.status}
                </Pill>
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={row.href}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                >
                  Kelola
                </Link>
              </td>
            </tr>
          ))}
        </DataTable>
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
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Operasional
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">
            Tindakan Cepat
          </h2>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {actionItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-sky-300 hover:bg-sky-50"
          >
            <span>
              <span className="block text-sm font-medium text-slate-950">
                {item.label}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {item.note}
              </span>
            </span>
            <span
              className="text-sm font-semibold text-sky-700"
              aria-hidden="true"
            >
              &gt;
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-5 rounded-md border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
        Semua perubahan akses tetap diproses melalui endpoint protected. Bila
        operator belum punya permission, UI akan menampilkan arahan operasional.
      </div>
    </aside>
  );
}

export async function OrganizationPanel({
  filters = {},
}: {
  filters?: {
    search?: string;
    status?: Organization['status'];
  };
}) {
  const api = createAdminApiClient();
  const organizations = await getOrEmpty(() =>
    api.organizations.list({
      limit: 25,
      search: filters.search,
      status: filters.status,
    }),
  );

  return (
    <SectionCard
      id="organizations"
      title="Organisasi"
      description="Master data unit organisasi dengan pencarian, filter status, edit data, dan arsip operasional."
    >
      <Toolbar
        title="Registry organisasi"
        description={`${totalOf(organizations)} data terbaca dari API foundation.`}
      >
        <OrganizationFilters search={filters.search} status={filters.status} />
      </Toolbar>
      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <OrganizationList result={organizations} />
        <div id="create-organization">
          <FormPanel
            title="Buat Organisasi"
            description="Gunakan untuk menambah unit baru. Validasi final tetap dilakukan API."
          >
            <CreateOrganizationForm />
          </FormPanel>
        </div>
      </div>
    </SectionCard>
  );
}

function OrganizationFilters({
  search,
  status,
}: {
  search?: string;
  status?: Organization['status'];
}) {
  return (
    <form action="/organisasi" className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        name="search"
        defaultValue={search}
        placeholder="Cari kode atau nama"
        className="min-h-10 w-56 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
      <select
        name="status"
        defaultValue={status ?? ''}
        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      >
        <option value="">Semua status</option>
        <option value="ACTIVE">Aktif</option>
        <option value="INACTIVE">Nonaktif</option>
      </select>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Filter
      </button>
      <Link
        href="/organisasi"
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
      >
        Reset
      </Link>
      <Link
        href="#create-organization"
        className="inline-flex min-h-10 items-center rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
      >
        Buat Baru
      </Link>
    </form>
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
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="text-sm leading-6 text-sky-800">
          Klik tombol masuk untuk autentikasi lewat SSO LMS PRESISI. Setelah
          callback berhasil, token disimpan sebagai cookie HTTP-only dan dipakai
          server-side untuk membaca API foundation.
        </p>
        <a
          href="/api/auth/login"
          className="mt-4 inline-flex min-h-10 items-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
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
    <DataTable
      columns={['Organisasi', 'Tipe', 'Parent', 'Status', 'Diperbarui', 'Aksi']}
    >
      {items.map((org) => (
        <tr key={org.id}>
          <td className="px-4 py-4">
            <div>
              <p className="font-medium text-slate-950">{org.name}</p>
              <p className="mt-1 text-xs text-slate-500">{org.code}</p>
            </div>
          </td>
          <td className="px-4 py-4 text-slate-600">
            {org.organizationType ?? '-'}
          </td>
          <td className="px-4 py-4 text-slate-600">{org.parentId ?? 'Root'}</td>
          <td className="px-4 py-4">
            <Pill tone={org.status === 'ACTIVE' ? 'green' : 'red'}>
              {org.status}
            </Pill>
          </td>
          <td className="px-4 py-4 text-slate-600">
            {formatDateTime(org.updatedAt)}
          </td>
          <td className="px-4 py-4 text-right align-top">
            <OrganizationRowActions organization={org} />
          </td>
        </tr>
      ))}
    </DataTable>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">NRP</th>
            <th className="px-4 py-3">Akun</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((person) => (
            <tr key={person.id}>
              <td className="px-4 py-3 font-medium text-slate-950">
                {person.fullName}
              </td>
              <td className="px-4 py-3 text-slate-600">
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
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Roles</h3>
        {roles.error ? (
          <ErrorState message={roles.error} />
        ) : (
          <RoleList roles={roles.data?.data ?? []} />
        )}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-700">
          Permissions
        </h3>
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
        <div
          key={role.id}
          className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
        >
          <div className="flex justify-between gap-3">
            <p className="font-medium text-slate-950">{role.name}</p>
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
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex justify-between gap-3">
            <div>
              <p className="font-medium text-slate-950">
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
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
