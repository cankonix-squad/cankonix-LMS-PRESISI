'use client';

import type { ApiListResponse, Organization } from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { Pill } from '@/components/data-state';
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Foundation / Organisasi
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Kelola organisasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.error
              ? 'Data belum dapat dimuat.'
              : `${total} organisasi ditemukan. Gunakan pencarian dan filter untuk mempersempit daftar.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          + Buat organisasi
        </button>
      </div>

      <div className="px-5 pt-1">
        <OrganizationToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Daftar organisasi belum tampil.</p>
            <p className="mt-1 leading-6 text-amber-800">{result.error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
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
          </div>
        ) : (
          <OrganizationTable
            items={items}
            parentNames={parentNames}
            onEdit={(organization) => setDrawer({ mode: 'edit', organization })}
          />
        )}

        {!result.error ? (
          <OrganizationPagination
            filters={filters}
            total={total}
            totalPages={totalPages}
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
    </div>
  );
}

function OrganizationToolbar({ filters }: { filters: OrganizationFilters }) {
  const statusTabs = [
    { label: 'Semua', status: undefined },
    { label: 'Aktif', status: 'ACTIVE' as const },
    { label: 'Nonaktif', status: 'INACTIVE' as const },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filter daftar
        </p>
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((tab) => {
            const active =
              filters.status === tab.status || (!filters.status && !tab.status);
            return (
              <Link
                key={tab.label}
                href={organizationHref({
                  ...filters,
                  status: tab.status,
                  page: 1,
                })}
                className={
                  active
                    ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
                    : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

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
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-80"
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
    </div>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama organisasi</th>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Jenis</th>
              <th className="px-4 py-3">Induk</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Terakhir diubah</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((organization) => (
              <tr key={organization.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-950">
                    {organization.name}
                  </p>
                </td>
                <td className="px-4 py-3 font-medium text-slate-600">
                  {organization.code}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {organization.organizationType || '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {organization.parentId
                    ? (parentNames.get(organization.parentId) ??
                      'Induk tidak terbaca')
                    : 'Tanpa induk'}
                </td>
                <td className="px-4 py-3">
                  <Pill
                    tone={organization.status === 'ACTIVE' ? 'green' : 'red'}
                  >
                    {organization.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                  </Pill>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateTime(organization.updatedAt)}
                </td>
                <td className="px-4 py-3">
                  <OrganizationRowActions
                    organization={organization}
                    onEdit={() => onEdit(organization)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
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
      </div>
    </div>
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
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled
          title="Detail organisasi belum tersedia pada API Admin"
          className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
        >
          Detail
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          Ubah
        </button>
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
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? 'Memproses...'
              : organization.status === 'ACTIVE'
                ? 'Nonaktifkan'
                : 'Aktifkan'}
          </button>
        </form>
      </div>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <button
        type="button"
        aria-label="Tutup panel"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {mode === 'create' ? 'Tambah data' : 'Ubah data'}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {mode === 'create' ? 'Tambah Organisasi' : 'Ubah Organisasi'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isi data yang terlihat oleh operator. Kolom bertanda wajib harus
                diisi.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
              aria-label="Tutup"
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <OrganizationDrawerForm
            mode={mode}
            organization={organization}
            parentOptions={parentOptions}
            onClose={onClose}
          />
        </div>
      </aside>
    </div>
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
      <label className="text-sm font-medium text-slate-700">
        Kode organisasi <span className="text-rose-600">*</span>
        <input
          name="code"
          id="organization-code"
          defaultValue={organization?.code ?? ''}
          placeholder="Contoh: LEMDIKLAT"
          required
          maxLength={64}
          pattern="[A-Za-z0-9_-]+"
          title="Gunakan huruf, angka, garis bawah, atau tanda hubung."
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Nama organisasi <span className="text-rose-600">*</span>
        <input
          name="name"
          id="organization-name"
          defaultValue={organization?.name ?? ''}
          placeholder="Contoh: Lemdiklat Polri"
          required
          maxLength={255}
          minLength={2}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Jenis organisasi
        <input
          name="organizationType"
          defaultValue={organization?.organizationType ?? ''}
          placeholder="Contoh: Nasional, Satdik, Admin"
          maxLength={100}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Induk organisasi
        <select
          name="parentId"
          defaultValue={organization?.parentId ?? ''}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        >
          <option value="">Tanpa induk</option>
          {availableParents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name} ({parent.code})
            </option>
          ))}
        </select>
      </label>
      {mode === 'edit' ? (
        <label className="text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            defaultValue={organization?.status ?? 'ACTIVE'}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </label>
      ) : null}
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Tips: gunakan nama yang mudah dikenali operator. Kode organisasi cukup
        singkat dan konsisten.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? 'Menyimpan...'
            : mode === 'create'
              ? 'Simpan Organisasi'
              : 'Simpan Perubahan'}
        </button>
      </div>
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function OrganizationPagination({
  filters,
  total,
  totalPages,
}: {
  filters: OrganizationFilters;
  total: number;
  totalPages: number;
}) {
  const start = total === 0 ? 0 : (filters.page - 1) * filters.limit + 1;
  const end = Math.min(total, filters.page * filters.limit);
  const hasPrevious = filters.page > 1;
  const hasNext = filters.page < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Menampilkan{' '}
        <span className="font-semibold text-slate-950">{start}</span>
        {' - '}
        <span className="font-semibold text-slate-950">{end}</span> dari{' '}
        <span className="font-semibold text-slate-950">{total}</span> organisasi
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah data per halaman"
          defaultValue={filters.limit}
          onChange={(event) => {
            window.location.href = organizationHref({
              ...filters,
              limit: Number(event.target.value),
              page: 1,
            });
          }}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <Link
          href={organizationHref({
            ...filters,
            page: Math.max(1, filters.page - 1),
          })}
          aria-disabled={!hasPrevious}
          className={
            hasPrevious
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 font-medium text-slate-400'
          }
        >
          Sebelumnya
        </Link>
        <span className="px-2 text-slate-500">
          {filters.page} / {totalPages}
        </span>
        <Link
          href={organizationHref({ ...filters, page: filters.page + 1 })}
          aria-disabled={!hasNext}
          className={
            hasNext
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 font-medium text-slate-400'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}

function ActionMessage({
  state,
}: {
  state: { ok: boolean; message: string | null };
}) {
  if (!state.message) return null;

  return (
    <p
      className={
        state.ok
          ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
          : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
      }
    >
      {state.message}
    </p>
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
