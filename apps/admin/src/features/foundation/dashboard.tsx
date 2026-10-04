import type {
  ApiListResponse,
  Organization,
  Permission,
  Person,
  Role,
  RoleAssignment,
} from '@lms/api-client';
import Link from 'next/link';
import {
  DataTable,
  PageHeader,
  StatCard,
} from '@/components/admin-design-system';
import { assignmentStatusLabel, personStatusLabel } from './display';
import { SectionCard } from '@/components/admin-shell';
import { EmptyState, ErrorState, Pill } from '@/components/data-state';
import {
  createAdminApiClient,
  getOrEmpty,
  hasAdminPortalAccess,
} from '@/lib/api';
import { OrganizationWorkspace } from './organization-management';

export async function FoundationDashboard() {
  // Non-redirecting on purpose: this is an in-component fallback, so it must
  // return a state rather than navigate. The page that renders it is already
  // gated by `requireAdminPortalAccess()`, so reaching here ungranted is rare.
  const hasSession = await hasAdminPortalAccess();
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
        description="Kelola organisasi, data individu, akun pengguna, peran, hak akses, dan penugasan dalam satu workspace operasional."
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
            Ringkasan kesiapan Data Induk
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Snapshot data induk untuk memantau kesiapan Admin sebelum operator
            masuk ke halaman detail. Validasi akses tetap dilakukan backend
            dengan Hak Akses dan Cakupan Organisasi.
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
            href="/penugasan"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
          >
            Atur Penugasan
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
      label: 'Data Individu',
      value: totalOf(persons),
      note: `${activeCount(persons.data?.data)} individu aktif terbaca`,
    },
    {
      label: 'Peran & Hak Akses',
      value: totalOf(roles),
      note: `${totalOf(permissions)} hak akses tersedia`,
    },
    {
      label: 'Penugasan Aktif',
      value: totalOf(assignments),
      note: `${activeCount(assignments.data?.data)} penugasan aktif terbaca`,
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
        id="data-induk-overview"
        title="Ringkasan Data Induk"
        description="Status data operasional dari API Data Induk."
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
      statusLabel: personStatusLabel(item.status),
      href: '/organisasi',
    })),
    ...(persons.data?.data ?? []).slice(0, 3).map((item) => ({
      key: `person-${item.id}`,
      name: item.fullName,
      code: item.personnelNumber,
      domain: 'Data Individu',
      status: item.status,
      statusLabel: personStatusLabel(item.status),
      href: '/data-individu',
    })),
    ...(roles.data?.data ?? []).slice(0, 2).map((item) => ({
      key: `role-${item.id}`,
      name: item.name,
      code: item.code,
      domain: 'Peran',
      status: item.status,
      statusLabel: personStatusLabel(item.status),
      href: '/peran-hak-akses',
    })),
    ...(assignments.data?.data ?? []).slice(0, 2).map((item) => ({
      key: `assignment-${item.id}`,
      name: item.role?.name ?? item.roleId,
      code: item.userAccountId,
      domain: 'Penugasan',
      status: item.status,
      statusLabel: assignmentStatusLabel(item.status),
      href: '/penugasan',
    })),
  ];

  return (
    <SectionCard
      id="data-induk-overview"
      title="Data Induk Terbaru"
      description="Snapshot data utama untuk memantau kesiapan operasional Admin."
    >
      {rows.length === 0 ? (
        <EmptyState>Belum ada data induk yang dapat ditampilkan.</EmptyState>
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
                  {row.statusLabel}
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
      note: 'Unit, kode, dan hierarki',
    },
    {
      label: 'Tambah Data Individu',
      href: '/data-individu',
      note: 'Identitas orang, tanpa akun',
    },
    {
      label: 'Kelola Akun Pengguna',
      href: '/akun-pengguna',
      note: 'Login SSO, peran, dan penugasan',
    },
    {
      label: 'Review Peran',
      href: '/peran-hak-akses',
      note: `${totalOf(permissions)} hak akses terbaca`,
    },
    {
      label: 'Atur Penugasan',
      href: '/penugasan',
      note: `${activeCount(assignments.data?.data)} penugasan aktif`,
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
        operator belum punya Hak Akses, UI akan menampilkan arahan operasional.
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
    page?: number;
    limit?: number;
  };
}) {
  const api = createAdminApiClient();
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;
  const [organizations, parentOptions] = await Promise.all([
    getOrEmpty(() =>
      api.organizations.list({
        page,
        limit,
        search: filters.search,
        status: filters.status,
      }),
    ),
    getOrEmpty(() => api.organizations.list({ limit: 100 })),
  ]);

  return (
    <SectionCard
      id="organizations"
      title="Organisasi"
      description="Kelola daftar organisasi, status aktif, dan hubungan induk organisasi dari satu layar."
    >
      <OrganizationWorkspace
        result={organizations}
        filters={{
          search: filters.search,
          status: filters.status,
          page,
          limit,
        }}
        parentOptions={parentOptions.data?.data ?? []}
      />
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

type DataResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
};

function totalOf<T>(result: DataResult<ApiListResponse<T>>) {
  if (result.error) return '-';
  return String(result.data?.total ?? result.data?.data.length ?? 0);
}

function activeCount<T extends { status?: string }>(items: T[] | undefined) {
  return (items ?? []).filter((item) => item.status === 'ACTIVE').length;
}
