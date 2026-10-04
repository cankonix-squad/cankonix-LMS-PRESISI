'use client';

import type { ApiListResponse, Permission, Role } from '@lms/api-client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  ActionButton,
  ActionGroup,
  ActionMessage,
  AdminPage,
  EmptyState,
  EnterpriseDrawer,
  EnterpriseTable,
  ErrorState,
  FilterTabs,
  FilterToolbar,
  FormActions,
  FormField,
  PageHeader,
  PaginationBar,
  PrimaryActionButton,
  StatusBadge,
  StickyActionCell,
  enterpriseInputClass,
} from '@/components/admin';
import {
  applyTemplateAction,
  createRoleAction,
  grantPermissionAction,
  revokePermissionAction,
  updateRoleAction,
  updateRoleStatusAction,
} from './actions';
import {
  ROLE_TEMPLATES,
  categoryForPermission,
  groupPermissionsByCategory,
  humanLabel,
} from '@/lib/admin-permission-labels';

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

type DrawerState =
  | { mode: 'create'; role?: never }
  | { mode: 'edit'; role: Role }
  | { mode: 'detail'; role: Role }
  | null;

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
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const roleItems = roles.data?.data ?? [];
  const permissionItems = permissions.data?.data ?? [];

  const selectedPermissions =
    drawer?.mode === 'detail' && drawer.role
      ? (rolePermissions[drawer.role.id] ?? null)
      : null;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Manajemen Akses / Peran & Hak Akses"
        title="Peran & Hak Akses"
        description={
          roles.error
            ? 'Data belum dapat dimuat.'
            : `${roles.data?.total ?? 0} peran tersedia. Gunakan pencarian dan filter untuk mempersempit daftar.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:text-left">
              <Metric label="Peran" value={roles.data?.total ?? 0} />
              <Metric label="Hak Akses" value={permissions.data?.total ?? 0} />
            </div>
            <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
              + Buat peran
            </PrimaryActionButton>
          </div>
        }
      />

      <section className="space-y-4 px-5">
        <RoleToolbar filters={roleFilters} />
        {roles.error ? (
          <PermissionErrorState message={roles.error} />
        ) : roleItems.length === 0 ? (
          <EmptyState>
            <p className="text-sm font-semibold text-slate-950">
              Tidak ada peran yang cocok.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Coba hapus pencarian atau ubah filter status.
            </p>
            <Link
              href="/peran-hak-akses"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <RoleTable
            roles={roleItems}
            rolePermissions={rolePermissions}
            onDetail={(role) => setDrawer({ mode: 'detail', role })}
            onEdit={(role) => setDrawer({ mode: 'edit', role })}
          />
        )}
        {!roles.error ? (
          <Pagination
            basePath="/peran-hak-akses"
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
            basePath="/peran-hak-akses"
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

      {drawer?.mode === 'detail' && drawer.role ? (
        <RoleDetailDrawer
          role={drawer.role}
          permissions={selectedPermissions}
          availablePermissions={permissionItems}
          onClose={() => setDrawer(null)}
          onEdit={(role) => setDrawer({ mode: 'edit', role })}
        />
      ) : drawer?.mode === 'create' ? (
        <RoleFormDrawer
          mode="create"
          role={null}
          onClose={() => setDrawer(null)}
        />
      ) : drawer?.mode === 'edit' && drawer.role ? (
        <RoleFormDrawer
          mode="edit"
          role={drawer.role}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function PermissionErrorState({ message }: { message: string }) {
  const lower = message.toLowerCase();

  if (lower.includes('access denied')) {
    const perm = message.match(/permission\s+([a-z0-9._-]+)/i)?.[1];
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">
          Akses role &amp; permission belum tersedia untuk akun ini.
        </p>
        <p className="mt-2 leading-6">
          Untuk melihat dan mengelola role, akun Anda membutuhkan permission
          berikut:
        </p>
        <ul className="mt-3 ml-5 list-disc space-y-1 text-amber-800">
          <li>
            <code className="rounded bg-amber-100 px-1 text-xs font-semibold">
              authorization.role.read
            </code>{' '}
            — melihat daftar role
          </li>
          <li>
            <code className="rounded bg-amber-100 px-1 text-xs font-semibold">
              authorization.permission.read
            </code>{' '}
            — melihat katalog permission
          </li>
          <li>
            <code className="rounded bg-amber-100 px-1 text-xs font-semibold">
              authorization.role.manage
            </code>{' '}
            — membuat, mengedit, dan mengelola permission role
          </li>
        </ul>
        <p className="mt-4 leading-6">
          Buka{' '}
          <Link
            href="/penugasan"
            className="font-semibold text-sky-700 underline underline-offset-2 hover:text-sky-900"
          >
            halaman assignments
          </Link>{' '}
          dan pastikan akun Anda sudah diberikan role yang memiliki
          permission-permission tersebut dengan scope yang sesuai. Setelah
          assignment aktif, muat ulang halaman ini.
        </p>
        {perm ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-amber-800">
            Permission diperlukan: {perm}
          </p>
        ) : null}
      </div>
    );
  }

  if (lower.includes('bearer access token is required')) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">Sesi login belum aktif.</p>
        <p className="mt-2 leading-6">
          Masuk ulang lewat SSO Admin agar dashboard dapat membaca data
          protected dari API.
        </p>
      </div>
    );
  }

  return <ErrorState message={message} />;
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
    <FilterToolbar
      label="Filter peran"
      filters={
        <FilterTabs
          tabs={[
            {
              label: 'Semua',
              href: roleHref({ ...filters, status: undefined, page: 1 }),
              active: !filters.status,
            },
            {
              label: 'Aktif',
              href: roleHref({ ...filters, status: 'ACTIVE', page: 1 }),
              active: filters.status === 'ACTIVE',
            },
            {
              label: 'Nonaktif',
              href: roleHref({ ...filters, status: 'INACTIVE', page: 1 }),
              active: filters.status === 'INACTIVE',
            },
          ]}
        />
      }
    >
      <SearchForm
        action="/peran-hak-akses"
        name="roleSearch"
        value={filters.search}
        placeholder="Cari nama atau kode peran"
        hidden={{ roleStatus: filters.status }}
      />
    </FilterToolbar>
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
        action="/peran-hak-akses"
        name="permissionSearch"
        value={filters.search}
        placeholder="Cari kode atau nama hak akses"
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
        className={`${enterpriseInputClass} sm:w-80`}
      />
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Cari
      </button>
      <Link
        href="/peran-hak-akses"
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
  onEdit,
}: {
  roles: Role[];
  rolePermissions: RolePermissions;
  onDetail: (role: Role) => void;
  onEdit: (role: Role) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Peran' },
        { label: 'Deskripsi' },
        { label: 'Hak Akses' },
        { label: 'Status' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={['22%', '28%', '15%', '12%', '23%']}
      minWidth={960}
      mobile={
        <>
          {roles.map((role) => (
            <RoleMobileRow
              key={role.id}
              role={role}
              rolePermissions={rolePermissions}
              onDetail={onDetail}
              onEdit={onEdit}
            />
          ))}
        </>
      }
    >
      {roles.map((role) => (
        <RoleRow
          key={role.id}
          role={role}
          rolePermissions={rolePermissions}
          onDetail={onDetail}
          onEdit={onEdit}
        />
      ))}
    </EnterpriseTable>
  );
}

function RoleRow({
  role,
  rolePermissions,
  onDetail,
  onEdit,
}: {
  role: Role;
  rolePermissions: RolePermissions;
  onDetail: (role: Role) => void;
  onEdit: (role: Role) => void;
}) {
  const count = rolePermissions[role.id]?.data?.length;
  return (
    <tr className="group hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">{role.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {role.code}
          {role.isSystem ? (
            <span className="ml-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
              SYSTEM
            </span>
          ) : null}
        </p>
      </td>
      <td className="max-w-xs px-4 py-3 text-slate-600">
        {role.description || '-'}
      </td>
      <td className="px-4 py-3 text-slate-600">{permissionLabel(count)}</td>
      <td className="px-4 py-3">
        <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
          {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </td>
      <StickyActionCell>
        <RoleRowActions role={role} onDetail={onDetail} onEdit={onEdit} />
      </StickyActionCell>
    </tr>
  );
}

function RoleMobileRow({
  role,
  rolePermissions,
  onDetail,
  onEdit,
}: {
  role: Role;
  rolePermissions: RolePermissions;
  onDetail: (role: Role) => void;
  onEdit: (role: Role) => void;
}) {
  const count = rolePermissions[role.id]?.data?.length;
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{role.name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {role.code}
            {role.isSystem ? ' · BAWAAN SISTEM' : ''}
          </p>
        </div>
        <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
          {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </div>
      {role.description ? (
        <p className="text-sm text-slate-600">{role.description}</p>
      ) : null}
      <p className="text-xs text-slate-500">{permissionLabel(count)}</p>
      <RoleRowActions role={role} onDetail={onDetail} onEdit={onEdit} />
    </article>
  );
}

function RoleRowActions({
  role,
  onDetail,
  onEdit,
}: {
  role: Role;
  onDetail: (role: Role) => void;
  onEdit: (role: Role) => void;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateRoleStatusAction,
    { ok: true, message: null },
  );

  return (
    <div className="space-y-2">
      <ActionGroup>
        <ActionButton onClick={() => onDetail(role)}>Detail</ActionButton>
        <ActionButton onClick={() => onEdit(role)}>Ubah</ActionButton>
      </ActionGroup>
      <form action={statusAction} className="w-full">
        <input type="hidden" name="id" value={role.id} />
        <input type="hidden" name="name" value={role.name} />
        <input
          type="hidden"
          name="status"
          value={role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}
        />
        <button
          type="submit"
          disabled={statusPending || role.isSystem}
          title={
            role.isSystem
              ? 'Peran bawaan sistem tidak dapat dinonaktifkan'
              : role.status === 'ACTIVE'
                ? 'Nonaktifkan peran'
                : 'Aktifkan peran'
          }
          className={
            role.isSystem
              ? 'inline-flex w-full min-h-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400 cursor-not-allowed'
              : 'inline-flex w-full min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-60'
          }
        >
          {statusPending
            ? 'Menyimpan...'
            : role.status === 'ACTIVE'
              ? 'Nonaktifkan'
              : 'Aktifkan'}
        </button>
      </form>
      {statusState.message && !statusState.ok ? (
        <ActionMessage state={statusState} />
      ) : null}
    </div>
  );
}

function PermissionTable({ permissions }: { permissions: Permission[] }) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Hak Akses' },
        { label: 'Kategori' },
        { label: 'Kode Teknis' },
        { label: 'Deskripsi' },
      ]}
      colWidths={['26%', '18%', '24%', '32%']}
      minWidth={860}
      mobile={permissions.map((permission) => (
        <article key={permission.id} className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-slate-950">
              {humanLabel(permission.code)}
            </p>
            <StatusBadge tone="blue">
              {categoryForPermission(permission.code)}
            </StatusBadge>
          </div>
          <p className="font-mono text-[11px] text-slate-500">
            {permission.code}
          </p>
          <p className="text-sm text-slate-600">
            {permission.description || '-'}
          </p>
        </article>
      ))}
    >
      {permissions.map((permission) => (
        <tr key={permission.id} className="hover:bg-slate-50/80">
          <td className="px-4 py-3 font-semibold text-slate-950">
            {humanLabel(permission.code)}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone="blue">
              {categoryForPermission(permission.code)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
            {permission.code}
          </td>
          <td className="px-4 py-3 text-slate-600">
            {permission.description || '-'}
          </td>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function RoleFormDrawer({
  mode,
  role,
  onClose,
}: {
  mode: 'create' | 'edit';
  role: Role | null;
  onClose: () => void;
}) {
  const action = mode === 'create' ? createRoleAction : updateRoleAction;

  return (
    <EnterpriseDrawer
      eyebrow={mode === 'create' ? 'Tambah data' : 'Ubah data'}
      title={mode === 'create' ? 'Buat Peran' : 'Ubah Peran'}
      description={
        mode === 'create'
          ? 'Buat peran baru. Kode peran memakai huruf besar dan garis bawah. Hak akses dapat ditambahkan setelah peran dibuat.'
          : 'Ubah data peran. Peran bawaan sistem tidak dapat diubah kode atau dinonaktifkan.'
      }
      onClose={onClose}
    >
      <RoleForm mode={mode} role={role} action={action} onClose={onClose} />
    </EnterpriseDrawer>
  );
}

function RoleForm({
  mode,
  role,
  action,
  onClose,
}: {
  mode: 'create' | 'edit';
  role: Role | null;
  action: (
    state: { ok: boolean; message: string | null },
    formData: FormData,
  ) => Promise<{ ok: boolean; message: string | null }>;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, {
    ok: true,
    message: null,
  });

  const isSystemRole = role?.isSystem ?? false;

  return (
    <form action={formAction} className="space-y-5 py-5">
      {mode === 'edit' && role ? (
        <input type="hidden" name="id" value={role.id} />
      ) : null}

      <FormField
        label="Kode peran"
        required={mode === 'create'}
        helper={
          isSystemRole && mode === 'edit'
            ? 'Peran bawaan sistem tidak dapat diubah kodenya.'
            : 'Gunakan huruf besar dan underscore, contoh: AKADEMIK_ADMIN.'
        }
      >
        <input
          type="text"
          name="code"
          defaultValue={role?.code ?? ''}
          required={mode === 'create'}
          disabled={isSystemRole && mode === 'edit'}
          placeholder="AKADEMIK_ADMIN"
          className={enterpriseInputClass}
        />
      </FormField>

      <FormField
        label="Nama peran"
        required
        helper="Nama yang mudah dikenali operator."
      >
        <input
          type="text"
          name="name"
          defaultValue={role?.name ?? ''}
          required
          placeholder="Administrator Akademik"
          className={enterpriseInputClass}
        />
      </FormField>

      <FormField label="Deskripsi" helper="Opsional. Jelaskan tujuan peran ini.">
        <textarea
          name="description"
          defaultValue={role?.description ?? ''}
          rows={3}
          placeholder="Peran untuk administrator bidang akademik..."
          className={enterpriseInputClass}
        />
      </FormField>

      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Tips: setelah role dibuat, buka detail role untuk menambahkan
        permission, lalu buka{' '}
        <Link
          href="/penugasan"
          className="font-semibold underline underline-offset-2 hover:text-sky-900"
        >
          assignments
        </Link>{' '}
        untuk memberikannya ke user.
      </p>

      <FormActions
        onCancel={onClose}
        pending={isPending}
        submitLabel={mode === 'create' ? 'Simpan Peran' : 'Simpan Perubahan'}
      />

      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function RoleDetailDrawer({
  role,
  permissions,
  availablePermissions,
  onClose,
  onEdit,
}: {
  role: Role;
  permissions: DataResult<Permission[]> | null;
  availablePermissions: Permission[];
  onClose: () => void;
  onEdit: (role: Role) => void;
}) {
  const attachedIds = new Set((permissions?.data ?? []).map((p) => p.id));
  const unattachedPermissions = availablePermissions.filter(
    (p) => !attachedIds.has(p.id),
  );

  const [grantState, grantAction, grantPending] = useActionState(
    grantPermissionAction,
    { ok: true, message: null },
  );

  const [revokeState, revokeAction, revokePending] = useActionState(
    revokePermissionAction,
    { ok: true, message: null },
  );

  const [templateState, templateAction, templatePending] = useActionState(
    applyTemplateAction,
    { ok: true, message: null },
  );

  return (
    <EnterpriseDrawer
      eyebrow="Detail peran"
      title={role.name}
      description={role.code}
      onClose={onClose}
    >
      <div className="space-y-5 py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(role)}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            Edit role
          </button>
        </div>

        {!role.isSystem ? (
          <DetailField label="Templat peran">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_TEMPLATES.map((template) => (
                <form
                  key={template.id}
                  action={templateAction}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {template.name}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {template.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {template.permissionCodes.slice(0, 4).map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600"
                      >
                        {humanLabel(code)}
                      </span>
                    ))}
                    {template.permissionCodes.length > 4 ? (
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] text-slate-500">
                        +{template.permissionCodes.length - 4}
                      </span>
                    ) : null}
                  </div>
                  <input type="hidden" name="roleId" value={role.id} />
                  <input type="hidden" name="templateId" value={template.id} />
                  <button
                    type="submit"
                    disabled={
                      templatePending || !template.enabled || role.isSystem
                    }
                    title={
                      !template.enabled
                        ? (template.disabledReason ??
                          'Template belum tersedia.')
                        : 'Terapkan semua hak akses dari templat ini ke peran'
                    }
                    className={
                      !template.enabled
                        ? 'mt-2 inline-flex min-h-7 items-center rounded-md border border-slate-200 bg-slate-100 px-2.5 text-[11px] font-semibold text-slate-400 cursor-not-allowed'
                        : 'mt-2 inline-flex min-h-7 items-center rounded-md border border-sky-200 bg-white px-2.5 text-[11px] font-semibold text-sky-600 transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-60'
                    }
                  >
                    {!template.enabled
                      ? 'Segera'
                      : `Terapkan (${template.permissionCodes.length})`}
                  </button>
                </form>
              ))}
            </div>
            {templateState.message ? (
              <ActionMessage state={templateState} />
            ) : null}
          </DetailField>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailField label="Status">
            <StatusBadge tone={role.status === 'ACTIVE' ? 'green' : 'red'}>
              {role.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </StatusBadge>
          </DetailField>
          <DetailField label="Jenis">
            <StatusBadge tone={role.isSystem ? 'blue' : 'slate'}>
              {role.isSystem ? 'Bawaan Sistem' : 'Khusus'}
            </StatusBadge>
          </DetailField>
        </div>

        <DetailField label="Deskripsi">
          <p className="text-sm text-slate-700">
            {role.description || 'Peran ini belum memiliki deskripsi.'}
          </p>
        </DetailField>

        <DetailField label="Hak akses melekat">
          {permissions?.error ? (
            <ErrorState message={permissions.error} />
          ) : permissions?.data ? (
            <div className="space-y-2">
              {permissions.data.length ? (
                permissions.data.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {humanLabel(permission.code)}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {permission.code}
                      </p>
                    </div>
                    <form action={revokeAction}>
                      <input type="hidden" name="roleId" value={role.id} />
                      <input
                        type="hidden"
                        name="permissionId"
                        value={permission.id}
                      />
                      <button
                        type="submit"
                        disabled={revokePending || role.isSystem}
                        title={
                          role.isSystem
                            ? 'Peran bawaan sistem tidak dapat diubah hak aksesnya'
                            : 'Lepas hak akses dari peran'
                        }
                        className={
                          role.isSystem
                            ? 'shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 cursor-not-allowed'
                            : 'shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-60'
                        }
                      >
                        Lepas
                      </button>
                    </form>
                  </div>
                ))
              ) : (
                <EmptyState>Belum ada hak akses pada peran ini.</EmptyState>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Permission role sedang dimuat.
            </p>
          )}
          {revokeState.message ? <ActionMessage state={revokeState} /> : null}
        </DetailField>

        {unattachedPermissions.length > 0 ? (
          <DetailField label="Tambah hak akses">
            <div className="max-h-80 space-y-5 overflow-y-auto">
              {[
                ...groupPermissionsByCategory(
                  unattachedPermissions.map((p) => p.code),
                ),
              ].map(([category, codes]) => {
                const categoryPerms = unattachedPermissions.filter((p) =>
                  codes.includes(p.code),
                );
                return (
                  <div key={category}>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {category}
                    </p>
                    <div className="space-y-1.5">
                      {categoryPerms.map((permission) => (
                        <form
                          key={permission.id}
                          action={grantAction}
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {humanLabel(permission.code)}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                              {permission.code}
                            </p>
                          </div>
                          <input type="hidden" name="roleId" value={role.id} />
                          <input
                            type="hidden"
                            name="permissionId"
                            value={permission.id}
                          />
                          <button
                            type="submit"
                            disabled={grantPending || role.isSystem}
                            title={
                              role.isSystem
                                ? 'Peran bawaan sistem tidak dapat diubah hak aksesnya'
                                : 'Tambahkan hak akses ke peran'
                            }
                            className={
                              role.isSystem
                                ? 'shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-400 cursor-not-allowed'
                                : 'shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60'
                            }
                          >
                            + Tambah
                          </button>
                        </form>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {grantState.message ? <ActionMessage state={grantState} /> : null}
          </DetailField>
        ) : permissions?.data ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Semua permission yang tersedia sudah melekat pada role ini.
          </p>
        ) : null}

        {role.isSystem ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Role ini adalah role sistem yang dilindungi. Kode, status, dan
            permission-nya tidak dapat diubah dari UI ini.
          </div>
        ) : null}
      </div>
    </EnterpriseDrawer>
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
  return count === undefined ? 'Belum dihitung' : `${count} hak akses`;
}

function roleHref(filters: RoleFilters) {
  return `/peran-hak-akses?${new URLSearchParams({ ...(filters.search ? { roleSearch: filters.search } : {}), ...(filters.status ? { roleStatus: filters.status } : {}), rolePage: String(filters.page), roleLimit: String(filters.limit) }).toString()}`;
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
    <PaginationBar
      page={page}
      limit={limit}
      total={total}
      totalPages={totalPages}
      itemLabel="data"
      hrefFor={({ page: nextPage }) => href(nextPage)}
    />
  );
}
