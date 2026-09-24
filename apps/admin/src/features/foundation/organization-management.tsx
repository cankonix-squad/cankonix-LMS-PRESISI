'use client';

import type { ApiListResponse, Organization } from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
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
  Pill,
  PrimaryActionButton,
  StickyActionCell,
  actionButtonClass,
  enterpriseInputClass,
} from '@/components/admin';
import {
  createOrganizationAction,
  updateOrganizationAction,
  updateOrganizationStatusAction,
} from './actions';

type OrganizationFilters = {
  search?: string;
  status?: Organization['status'];
  page: number;
  limit: number;
};

type DataResult<T> = {
  data: T | null;
  error: string | null;
};

export function OrganizationWorkspace({
  result,
  filters,
  parentOptions,
}: {
  result: DataResult<ApiListResponse<Organization>>;
  filters: OrganizationFilters;
  parentOptions: Organization[];
}) {
  const [drawer, setDrawer] = useState<
    | { mode: 'create'; organization?: never }
    | { mode: 'edit'; organization: Organization }
    | null
  >(null);
  const items = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const parentNames = useMemo(() => {
    return new Map(
      parentOptions.map((organization) => [organization.id, organization.name]),
    );
  }, [parentOptions]);

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Foundation / Organisasi"
        title="Kelola organisasi"
        description={
          result.error
            ? 'Data belum dapat dimuat.'
            : `${total} organisasi ditemukan. Gunakan pencarian dan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Buat organisasi
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <OrganizationToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : items.length === 0 ? (
          <EmptyState>
            <p className="text-sm font-semibold text-slate-950">
              Tidak ada organisasi yang cocok.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Coba hapus pencarian atau ubah filter status.
            </p>
            <Link
              href="/organisasi"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <OrganizationTable
            items={items}
            parentNames={parentNames}
            onEdit={(organization) => setDrawer({ mode: 'edit', organization })}
          />
        )}

        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="organisasi"
            hrefFor={(next) => organizationHref({ ...filters, ...next })}
          />
        ) : null}
      </div>

      {drawer ? (
        <OrganizationDrawer
          mode={drawer.mode}
          organization={drawer.mode === 'edit' ? drawer.organization : null}
          parentOptions={parentOptions}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function OrganizationToolbar({ filters }: { filters: OrganizationFilters }) {
  const statusTabs = [
    { label: 'Semua', status: undefined },
    { label: 'Aktif', status: 'ACTIVE' as const },
    { label: 'Nonaktif', status: 'INACTIVE' as const },
  ];

  return (
    <FilterToolbar
      filters={
        <FilterTabs
          tabs={statusTabs.map((tab) => ({
            label: tab.label,
            href: organizationHref({
              ...filters,
              status: tab.status,
              page: 1,
            }),
            active:
              filters.status === tab.status || (!filters.status && !tab.status),
          }))}
        />
      }
    >
      <form
        action="/organisasi"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari nama atau kode organisasi"
          className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-80"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/organisasi"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function OrganizationTable({
  items,
  parentNames,
  onEdit,
}: {
  items: Organization[];
  parentNames: Map<string, string>;
  onEdit: (organization: Organization) => void;
}) {
  return (
    <EnterpriseTable
      minWidth={980}
      columns={[
        { label: 'Nama organisasi' },
        { label: 'Kode' },
        { label: 'Jenis' },
        { label: 'Induk' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={[
        '220px',
        '140px',
        '150px',
        '170px',
        '120px',
        '150px',
        '180px',
      ]}
      mobile={
        <>
          {items.map((organization) => (
            <div key={`mobile-${organization.id}`} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {organization.code}
                  </p>
                </div>
                <Pill tone={organization.status === 'ACTIVE' ? 'green' : 'red'}>
                  {organization.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                </Pill>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-400">Jenis</dt>
                  <dd className="mt-1 font-medium text-slate-700">
                    {organization.organizationType || '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Induk</dt>
                  <dd className="mt-1 truncate font-medium text-slate-700">
                    {organization.parentId
                      ? (parentNames.get(organization.parentId) ??
                        'Tidak terbaca')
                      : 'Tanpa induk'}
                  </dd>
                </div>
              </dl>
              <OrganizationRowActions
                organization={organization}
                onEdit={() => onEdit(organization)}
              />
            </div>
          ))}
        </>
      }
    >
      {items.map((organization) => (
        <tr key={organization.id} className="group hover:bg-slate-50/80">
          <td className="px-4 py-3 align-middle">
            <p className="font-semibold text-slate-950">{organization.name}</p>
          </td>
          <td className="px-4 py-3 align-middle font-medium text-slate-600">
            {organization.code}
          </td>
          <td className="px-4 py-3 align-middle text-slate-600">
            {organization.organizationType || '-'}
          </td>
          <td className="px-4 py-3 align-middle text-slate-600">
            {organization.parentId
              ? (parentNames.get(organization.parentId) ??
                'Induk tidak terbaca')
              : 'Tanpa induk'}
          </td>
          <td className="px-4 py-3 align-middle">
            <Pill tone={organization.status === 'ACTIVE' ? 'green' : 'red'}>
              {organization.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </Pill>
          </td>
          <td className="px-4 py-3 align-middle text-slate-600">
            {formatDateTime(organization.updatedAt)}
          </td>
          <StickyActionCell>
            <OrganizationRowActions
              organization={organization}
              onEdit={() => onEdit(organization)}
            />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function OrganizationRowActions({
  organization,
  onEdit,
}: {
  organization: Organization;
  onEdit: () => void;
}) {
  const [state, action, isPending] = useActionState(
    updateOrganizationStatusAction,
    {
      ok: false,
      message: null,
    },
  );
  const targetStatus = organization.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <ActionGroup>
        <ActionButton
          disabled
          title="Detail organisasi belum tersedia pada API Admin"
        >
          Detail
        </ActionButton>
        <ActionButton onClick={onEdit}>Ubah</ActionButton>
        <form
          action={action}
          onSubmit={(event) => {
            if (
              targetStatus === 'INACTIVE' &&
              !window.confirm(
                `Nonaktifkan ${organization.name}? Data tidak dihapus, tetapi organisasi tidak lagi dianggap aktif.`,
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={organization.id} />
          <input type="hidden" name="name" value={organization.name} />
          <input type="hidden" name="status" value={targetStatus} />
          <button
            type="submit"
            disabled={isPending}
            className={actionButtonClass('warning')}
          >
            {isPending
              ? 'Memproses...'
              : organization.status === 'ACTIVE'
                ? 'Nonaktifkan'
                : 'Aktifkan'}
          </button>
        </form>
      </ActionGroup>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function OrganizationDrawer({
  mode,
  organization,
  parentOptions,
  onClose,
}: {
  mode: 'create' | 'edit';
  organization: Organization | null;
  parentOptions: Organization[];
  onClose: () => void;
}) {
  return (
    <EnterpriseDrawer
      eyebrow={mode === 'create' ? 'Tambah data' : 'Ubah data'}
      title={mode === 'create' ? 'Tambah Organisasi' : 'Ubah Organisasi'}
      description="Isi data yang terlihat oleh operator. Kolom bertanda wajib harus diisi."
      onClose={onClose}
    >
      <OrganizationDrawerForm
        mode={mode}
        organization={organization}
        parentOptions={parentOptions}
        onClose={onClose}
      />
    </EnterpriseDrawer>
  );
}

function OrganizationDrawerForm({
  mode,
  organization,
  parentOptions,
  onClose,
}: {
  mode: 'create' | 'edit';
  organization: Organization | null;
  parentOptions: Organization[];
  onClose: () => void;
}) {
  const actionFn =
    mode === 'create' ? createOrganizationAction : updateOrganizationAction;
  const [state, action, isPending] = useActionState(actionFn, {
    ok: false,
    message: null,
  });
  const availableParents = parentOptions.filter(
    (parent) => parent.id !== organization?.id,
  );

  return (
    <form action={action} className="grid gap-4">
      {organization ? (
        <input type="hidden" name="id" value={organization.id} />
      ) : null}
      <FormField label="Kode organisasi" required>
        <input
          name="code"
          id="organization-code"
          defaultValue={organization?.code ?? ''}
          placeholder="Contoh: LEMDIKLAT"
          required
          maxLength={64}
          pattern="[A-Za-z0-9_-]+"
          title="Gunakan huruf, angka, garis bawah, atau tanda hubung."
          className={enterpriseInputClass}
        />
      </FormField>
      <FormField label="Nama organisasi" required>
        <input
          name="name"
          id="organization-name"
          defaultValue={organization?.name ?? ''}
          placeholder="Contoh: Lemdiklat Polri"
          required
          maxLength={255}
          minLength={2}
          className={enterpriseInputClass}
        />
      </FormField>
      <FormField label="Jenis organisasi">
        <input
          name="organizationType"
          defaultValue={organization?.organizationType ?? ''}
          placeholder="Contoh: Nasional, Satdik, Admin"
          maxLength={100}
          className={enterpriseInputClass}
        />
      </FormField>
      <FormField label="Induk organisasi">
        <select
          name="parentId"
          defaultValue={organization?.parentId ?? ''}
          className={enterpriseInputClass}
        >
          <option value="">Tanpa induk</option>
          {availableParents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name} ({parent.code})
            </option>
          ))}
        </select>
      </FormField>
      {mode === 'edit' ? (
        <FormField label="Status">
          <select
            name="status"
            defaultValue={organization?.status ?? 'ACTIVE'}
            className={enterpriseInputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </FormField>
      ) : null}
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Tips: gunakan nama yang mudah dikenali operator. Kode organisasi cukup
        singkat dan konsisten.
      </p>
      <FormActions
        onCancel={onClose}
        pending={isPending}
        submitLabel={
          mode === 'create' ? 'Simpan Organisasi' : 'Simpan Perubahan'
        }
      />
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function organizationHref(filters: OrganizationFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/organisasi?${query}` : '/organisasi';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}
