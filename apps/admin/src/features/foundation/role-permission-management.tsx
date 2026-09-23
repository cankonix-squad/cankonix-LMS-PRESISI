'use client';

import type { ApiListResponse, Permission, Role } from '@lms/api-client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { DataTable, StatusBadge } from '@/components/admin-design-system';
import { EmptyState, ErrorState } from '@/components/data-state';

type DataResult<T> = { data: T | null; error: string | null };

type RoleFilters = {
  search?: string;
  status?: Role['status'];
  page: number;
  limit: number;
};

type PermissionFilters = {
  search?: string;
  page: number;
  limit: number;
};

type RolePermissions = Record<string, DataResult<Permission[]>>;

export function RolePermissionWorkspace({
  roles,
  permissions,
  roleFilters,
  permissionFilters,
  rolePermissions,
}: {
  roles: DataResult<ApiListResponse<Role>>;
  permissions: DataResult<ApiListResponse<Permission>>;
  roleFilters: RoleFilters;
  permissionFilters: PermissionFilters;
  rolePermissions: RolePermissions;
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const roleItems = roles.data?.data ?? [];
  const permissionItems = permissions.data?.data ?? [];
  const selectedRole =
    roleItems.find((role) => role.id === selectedRoleId) ?? null;
  const selectedPermissions = selectedRoleId
    ? rolePermissions[selectedRoleId]
    : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Foundation / Akses
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Role & permission
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pahami katalog akses dan permission yang melekat pada setiap role.
            Keputusan akses tetap ditentukan backend dengan Permission + Scope.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:text-left">
          <Metric label="Role" value={roles.data?.total ?? 0} />
          <Metric label="Permission" value={permissions.data?.total ?? 0} />
        </div>
      </header>

      <section className="space-y-4 px-5">
        <RoleToolbar filters={roleFilters} />
        {roles.error ? (
          <ErrorState message={roles.error} />
        ) : roleItems.length === 0 ? (
          <EmptyState>
            Tidak ada role yang cocok dengan filter saat ini.
          </EmptyState>
        ) : (
          <RoleTable
            roles={roleItems}
            rolePermissions={rolePermissions}
            onDetail={setSelectedRoleId}
          />
        )}
        {!roles.error ? (
          <Pagination
            basePath="/roles"
            query={{
              roleSearch: roleFilters.search,
              roleStatus: roleFilters.status,
              permissionSearch: permissionFilters.search,
              permissionPage: permissionFilters.page,
              permissionLimit: permissionFilters.limit,
            }}
            page={roleFilters.page}
            limit={roleFilters.limit}
            total={roles.data?.total ?? 0}
            paramPrefix="role"
          />
        ) : null}
      </section>

      <section className="space-y-4 px-5 pb-5">
        <PermissionToolbar
          filters={permissionFilters}
          roleFilters={roleFilters}
        />
        {permissions.error ? (
          <ErrorState message={permissions.error} />
        ) : permissionItems.length === 0 ? (
          <EmptyState>
            Tidak ada permission yang cocok dengan pencarian.
          </EmptyState>
        ) : (
          <PermissionTable permissions={permissionItems} />
        )}
        {!permissions.error ? (
          <Pagination
            basePath="/roles"
            query={{
              permissionSearch: permissionFilters.search,
              roleSearch: roleFilters.search,
              roleStatus: roleFilters.status,
              rolePage: roleFilters.page,
              roleLimit: roleFilters.limit,
            }}
            page={permissionFilters.page}
            limit={permissionFilters.limit}
            total={permissions.data?.total ?? 0}
            paramPrefix="permission"
          />
        ) : null}
      </section>

      {selectedRole ? (
        <RoleDetailDrawer
          role={selectedRole}
          permissions={selectedPermissions ?? null}
          onClose={() => setSelectedRoleId(null)}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RoleToolbar({ filters }: { filters: RoleFilters }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filter role
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ['Semua', undefined],
            ['Aktif', 'ACTIVE'],
            ['Nonaktif', 'INACTIVE'],
          ].map(([label, status]) => (
            <Link
              key={label}
              href={roleHref({
                ...filters,
                status: status as Role['status'] | undefined,
                page: 1,
              })}
              className={
                filters.status === status || (!filters.status && !status)
                  ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
                  : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700'
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <SearchForm
        action="/roles"
        name="roleSearch"
        value={filters.search}
        placeholder="Cari nama atau kode role"
        hidden={{ roleStatus: filters.status }}
      />
    </div>
  );
}

function PermissionToolbar({
  filters,
  roleFilters,
}: {
  filters: PermissionFilters;
  roleFilters: RoleFilters;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">
          Katalog permission
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Kategori mengikuti segmen pertama dari kode permission.
        </p>
      </div>
      <SearchForm
        action="/roles"
        name="permissionSearch"
        value={filters.search}
        placeholder="Cari kode atau nama permission"
        hidden={{
          roleSearch: roleFilters.search,
          roleStatus: roleFilters.status,
        }}
      />
    </div>
  );
}

function SearchForm({
  action,
  name,
  value,
  placeholder,
  hidden,
}: {
  action: string;
  name: string;
  value?: string;
  placeholder: string;
  hidden: Record<string, string | number | undefined>;
}) {
  return (
    <form action={action} className="flex w-full flex-wrap gap-2 xl:w-auto">
      {Object.entries(hidden).map(([key, item]) => (
        <input key={key} type="hidden" name={key} value={item ?? ''} />
      ))}
      <input
        type="hidden"
        name={name === 'roleSearch' ? 'rolePage' : 'permissionPage'}
        value="1"
      />
      <input
        type="search"
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-80"
      />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Cari
      </button>
      <Link
        href="/roles"
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
      >
        Reset
      </Link>
    </form>
  );
}

function RoleTable({
  roles,
  rolePermissions,
  onDetail,
}: {
  roles: Role[];
  rolePermissions: RolePermissions;
  onDetail: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <DataTable
          columns={['Role', 'Deskripsi', 'Permission', 'Status', 'Aksi']}
        >
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              permissionCount={rolePermissions[role.id]?.data?.length}
              onDetail={onDetail}
            />
          ))}
        </DataTable>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {roles.map((role) => (
          <article key={role.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{role.name}</p>
                <p className="text-xs text-slate-500">{role.code}</p>
              </div>
              <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
                {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </StatusBadge>
            </div>
            <p className="text-sm text-slate-600">
              {role.description || 'Tidak ada deskripsi.'}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {permissionLabel(rolePermissions[role.id]?.data?.length)}
              </span>
              <RoleActions role={role} onDetail={onDetail} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RoleRow({
  role,
  permissionCount,
  onDetail,
}: {
  role: Role;
  permissionCount?: number;
  onDetail: (id: string) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">{role.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {role.code}
          {role.isSystem ? ' · SYSTEM' : ''}
        </p>
      </td>
      <td className="max-w-xs px-4 py-3 text-slate-600">
        {role.description || '-'}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {permissionLabel(permissionCount)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
          {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <RoleActions role={role} onDetail={onDetail} />
      </td>
    </tr>
  );
}

function RoleActions({
  role,
  onDetail,
}: {
  role: Role;
  onDetail: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onDetail(role.id)}
        className="text-xs font-semibold text-sky-700 hover:text-sky-900"
      >
        Detail
      </button>
      <button
        type="button"
        disabled
        title="Aksi edit belum diaktifkan di workspace Admin"
        className="cursor-not-allowed text-xs font-medium text-slate-400"
      >
        Edit
      </button>
      <button
        type="button"
        disabled
        title="Pengelolaan permission belum diaktifkan di workspace Admin"
        className="cursor-not-allowed text-xs font-medium text-slate-400"
      >
        Kelola permission
      </button>
    </div>
  );
}

function PermissionTable({ permissions }: { permissions: Permission[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <DataTable columns={['Permission', 'Kategori', 'Nama', 'Deskripsi']}>
          {permissions.map((permission) => (
            <tr key={permission.id} className="hover:bg-slate-50/80">
              <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-950">
                {permission.code}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone="blue">
                  {permission.code.split('.')[0] || 'lainnya'}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 text-slate-700">{permission.name}</td>
              <td className="px-4 py-3 text-slate-600">
                {permission.description || '-'}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}

function RoleDetailDrawer({
  role,
  permissions,
  onClose,
}: {
  role: Role;
  permissions: DataResult<Permission[]> | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/30"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail role ${role.name}`}
    >
      <button
        type="button"
        aria-label="Tutup detail role"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Detail role
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {role.name}
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{role.code}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:border-sky-300"
          >
            Tutup
          </button>
        </div>
        <div className="space-y-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Status">
              <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
                {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
              </StatusBadge>
            </DetailField>
            <DetailField label="Jenis">
              <StatusBadge tone={role.isSystem ? 'blue' : 'slate'}>
                {role.isSystem ? 'SYSTEM' : 'CUSTOM'}
              </StatusBadge>
            </DetailField>
          </div>
          <DetailField label="Deskripsi">
            <p className="text-sm text-slate-700">
              {role.description || 'Role ini belum memiliki deskripsi.'}
            </p>
          </DetailField>
          <DetailField label="Permission melekat">
            {permissions?.error ? (
              <ErrorState message={permissions.error} />
            ) : permissions?.data ? (
              <div className="space-y-2">
                {permissions.data.length ? (
                  permissions.data.map((permission) => (
                    <div
                      key={permission.id}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="font-mono text-xs font-semibold text-slate-900">
                        {permission.code}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {permission.name}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyState>Belum ada permission pada role ini.</EmptyState>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Permission role sedang dimuat.
              </p>
            )}
          </DetailField>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Aksi edit, pengelolaan permission, dan perubahan status sengaja
            dinonaktifkan di UI ini sampai wiring operator dan feedback
            mutasinya tersedia.
          </div>
        </div>
      </aside>
    </div>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function permissionLabel(count?: number) {
  return count === undefined ? 'Belum dihitung' : `${count} permission`;
}

function roleHref(filters: RoleFilters) {
  return `/roles?${new URLSearchParams({ ...(filters.search ? { roleSearch: filters.search } : {}), ...(filters.status ? { roleStatus: filters.status } : {}), rolePage: String(filters.page), roleLimit: String(filters.limit) }).toString()}`;
}

function Pagination({
  basePath,
  query,
  page,
  limit,
  total,
  paramPrefix,
}: {
  basePath: string;
  query: Record<string, string | number | undefined>;
  page: number;
  limit: number;
  total: number;
  paramPrefix: 'role' | 'permission';
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) return null;
  const href = (nextPage: number) =>
    `${basePath}?${new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(query)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => [key, String(value)]),
      ),
      [`${paramPrefix}Page`]: String(nextPage),
      [`${paramPrefix}Limit`]: String(limit),
    }).toString()}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-slate-500">
        Halaman {page} dari {totalPages} · {total} data
      </p>
      <div className="flex gap-2">
        <Link
          aria-disabled={page <= 1}
          className={
            page <= 1
              ? 'pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-400'
              : 'rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:border-sky-300'
          }
          href={href(Math.max(1, page - 1))}
        >
          Sebelumnya
        </Link>
        <Link
          aria-disabled={page >= totalPages}
          className={
            page >= totalPages
              ? 'pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-400'
              : 'rounded-md border border-slate-300 px-3 py-2 text-slate-700 hover:border-sky-300'
          }
          href={href(Math.min(totalPages, page + 1))}
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
