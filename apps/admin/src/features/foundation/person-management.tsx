'use client';

import type {
  ApiListResponse,
  Organization,
  Person,
  PersonOrganization,
  UserAccount,
} from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { EmptyState, ErrorState, Pill } from '@/components/data-state';
import {
  createPersonWithAccountAction,
  updatePersonAccountAction,
  updatePersonAction,
} from './actions';

type Result<T> = { data: T | null; error: string | null };
type Filters = {
  search?: string;
  status?: Person['status'];
  page: number;
  limit: number;
};
type Row = {
  person: Person;
  account: UserAccount | null;
  placements: PersonOrganization[];
};

export function PersonWorkspace({
  result,
  filters,
  rows,
  organizations,
}: {
  result: Result<ApiListResponse<Person>>;
  filters: Filters;
  rows: Row[];
  organizations: Organization[];
}) {
  const [drawer, setDrawer] = useState<
    { kind: 'person' | 'account'; row: Row } | { kind: 'create' } | null
  >(null);
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Foundation / Personel
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Kelola personel dan akun
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.error
              ? 'Data belum dapat dimuat.'
              : `${total} personel ditemukan. Kelola identitas dan status akun dari satu workspace.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ kind: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
        >
          + Tambah personel
        </button>
      </header>
      <PersonToolbar filters={filters} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada personel yang cocok.
            </p>
            <p className="mt-2">
              Coba hapus pencarian atau ubah filter status.
            </p>
            <Link
              href="/personel"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <PersonTable
            rows={rows}
            organizations={organizations}
            onPerson={(row) => setDrawer({ kind: 'person', row })}
            onAccount={(row) => setDrawer({ kind: 'account', row })}
          />
        )}
        {!result.error ? (
          <Pagination filters={filters} total={total} totalPages={totalPages} />
        ) : null}
      </div>
      {drawer ? (
        <PersonDrawer
          drawer={drawer}
          organizations={organizations}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </div>
  );
}

function PersonToolbar({ filters }: { filters: Filters }) {
  return (
    <div className="mx-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filter daftar
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ['Semua', undefined],
            ['Aktif', 'ACTIVE'],
            ['Nonaktif', 'INACTIVE'],
          ].map(([label, status]) => (
            <Link
              key={label}
              href={personelHref({
                ...filters,
                status: status as Filters['status'],
                page: 1,
              })}
              className={
                filters.status === status || (!filters.status && !status)
                  ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
                  : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700'
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <form
        action="/personel"
        className="flex w-full flex-wrap gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari nama, NRP/NIP, atau email"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-80"
        />
        <button className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Cari
        </button>
        <Link
          href="/personel"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700"
        >
          Reset
        </Link>
      </form>
    </div>
  );
}

function PersonTable({
  rows,
  organizations,
  onPerson,
  onAccount,
}: {
  rows: Row[];
  organizations: Organization[];
  onPerson: (row: Row) => void;
  onAccount: (row: Row) => void;
}) {
  const orgMap = new Map(organizations.map((org) => [org.id, org.name]));
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Nama personel',
                'NIP/NRP',
                'Email',
                'Organisasi/unit',
                'Akun login',
                'Status',
                'Diubah',
                'Aksi',
              ].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <PersonRow
                key={row.person.id}
                row={row}
                orgMap={orgMap}
                onPerson={onPerson}
                onAccount={onAccount}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <PersonCard
            key={row.person.id}
            row={row}
            orgMap={orgMap}
            onPerson={onPerson}
            onAccount={onAccount}
          />
        ))}
      </div>
    </div>
  );
}

function PersonRow({
  row,
  orgMap,
  onPerson,
  onAccount,
}: {
  row: Row;
  orgMap: Map<string, string>;
  onPerson: (row: Row) => void;
  onAccount: (row: Row) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">{row.person.fullName}</p>
        <p className="text-xs text-slate-500">
          {row.person.rank || row.person.title || 'Identitas personel'}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-600">{row.person.personnelNumber}</td>
      <td className="px-4 py-3 text-slate-600">{row.person.email || '-'}</td>
      <td className="px-4 py-3 text-slate-600">
        {placementLabel(row.placements, orgMap)}
      </td>
      <td className="px-4 py-3">{accountLabel(row.account)}</td>
      <td className="px-4 py-3">
        <Pill tone={row.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {row.person.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </Pill>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {formatDate(row.person.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <Actions row={row} onPerson={onPerson} onAccount={onAccount} />
      </td>
    </tr>
  );
}

function PersonCard({
  row,
  orgMap,
  onPerson,
  onAccount,
}: {
  row: Row;
  orgMap: Map<string, string>;
  onPerson: (row: Row) => void;
  onAccount: (row: Row) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{row.person.fullName}</p>
          <p className="mt-1 text-xs text-slate-500">
            {row.person.personnelNumber}
          </p>
        </div>
        <Pill tone={row.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {row.person.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </Pill>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Email</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {row.person.email || '-'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Organisasi</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {placementLabel(row.placements, orgMap)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Akun</dt>
          <dd className="mt-1">{accountLabel(row.account)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(row.person.updatedAt)}
          </dd>
        </div>
      </dl>
      <Actions row={row} onPerson={onPerson} onAccount={onAccount} />
    </article>
  );
}

function Actions({
  row,
  onPerson,
  onAccount,
}: {
  row: Row;
  onPerson: (row: Row) => void;
  onAccount: (row: Row) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled
        title="Detail personel belum memiliki panel kontrak khusus"
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400"
      >
        Detail
      </button>
      <button
        type="button"
        onClick={() => onPerson(row)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onAccount(row)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
      >
        Kelola Akun
      </button>
      <button
        type="button"
        disabled
        title="Status personel diubah melalui Edit agar tidak ada mutation palsu"
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400"
      >
        {row.person.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
      </button>
    </div>
  );
}

function PersonDrawer({
  drawer,
  organizations,
  onClose,
}: {
  drawer: { kind: 'person' | 'account'; row: Row } | { kind: 'create' };
  organizations: Organization[];
  onClose: () => void;
}) {
  const row = drawer.kind === 'create' ? null : drawer.row;
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
                {drawer.kind === 'account'
                  ? 'Akun Login'
                  : drawer.kind === 'create'
                    ? 'Tambah data'
                    : 'Data Personel'}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {drawer.kind === 'account'
                  ? 'Kelola Akun Login'
                  : drawer.kind === 'create'
                    ? 'Tambah Personel'
                    : 'Edit Personel'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Kolom bertanda wajib harus diisi. Password tetap dikelola oleh
                SSO Keycloak.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="h-9 w-9 rounded-md border border-slate-300 text-lg text-slate-500"
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {drawer.kind === 'account' && row ? (
            <AccountForm row={row} onClose={onClose} />
          ) : (
            <PersonForm
              row={row}
              organizations={organizations}
              onClose={onClose}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function PersonForm({
  row,
  onClose,
}: {
  row: Row | null;
  organizations: Organization[];
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    row ? updatePersonAction : createPersonWithAccountAction,
    { ok: false, message: null },
  );
  return (
    <form action={action} className="grid gap-4">
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
        Data Personel
      </p>
      {row ? <input type="hidden" name="id" value={row.person.id} /> : null}
      {(
        [
          ['personnelNumber', 'NIP/NRP', row?.person.personnelNumber],
          ['fullName', 'Nama lengkap', row?.person.fullName],
          ['rank', 'Pangkat', row?.person.rank],
          ['title', 'Jabatan', row?.person.title],
          ['email', 'Email', row?.person.email],
          ['phone', 'Telepon', row?.person.phone],
        ] as [string, string, string | null | undefined][]
      ).map(([name, label, value]) => (
        <label key={name} className="text-sm font-medium text-slate-700">
          {label}
          {name === 'personnelNumber' || name === 'fullName' ? (
            <span className="text-rose-600"> *</span>
          ) : null}
          <input
            name={name}
            type={name === 'email' ? 'email' : 'text'}
            defaultValue={(value ?? undefined) as string | undefined}
            required={name === 'personnelNumber' || name === 'fullName'}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      ))}
      {!row ? (
        <>
          <p className="border-b border-slate-200 pb-2 pt-2 text-sm font-semibold text-slate-950">
            Akun Login
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input name="createAccount" type="checkbox" defaultChecked /> Buat
            UserAccount untuk person ini
          </label>
          <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-5 text-sky-900">
            <p className="font-semibold">Akun login tetap dikelola SSO.</p>
            <p className="mt-1">
              Isi username dan email untuk membuat akun LMS. User Keycloak dapat
              dihubungkan nanti; peran seperti Admin, Pengajar, Pimpinan, atau
              Peserta diatur dari halaman Assignment & Scope.
            </p>
          </div>
          <label className="text-sm font-medium text-slate-700">
            Username akun
            <input
              name="username"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email akun
            <input
              name="accountEmail"
              type="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Opsi lanjutan: hubungkan user Keycloak
            </summary>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              ID User Keycloak
              <input
                name="externalAuthId"
                placeholder="Kosongkan bila user Keycloak belum dibuat"
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Field ini adalah nilai <code>sub</code> dari Keycloak, bukan
              email, username, atau pilihan peran. Kosongkan dulu bila operator
              belum memiliki ID dari Keycloak.
            </p>
          </details>
        </>
      ) : (
        <label className="text-sm font-medium text-slate-700">
          Status
          <select
            name="status"
            defaultValue={row.person.status}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </label>
      )}
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        Password tidak dibuat di LMS. Agar personel bisa login, user harus ada
        di Keycloak dan perannya diberikan melalui Assignment & Scope.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-1 rounded-md border border-slate-300 font-semibold"
        >
          Batal
        </button>
        <button
          disabled={pending}
          className="min-h-11 flex-1 rounded-md bg-sky-600 font-semibold text-white"
        >
          {pending
            ? 'Menyimpan...'
            : row
              ? 'Simpan Perubahan'
              : 'Simpan Personel'}
        </button>
      </div>
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function AccountForm({ row, onClose }: { row: Row; onClose: () => void }) {
  const [state, action, pending] = useActionState(updatePersonAccountAction, {
    ok: false,
    message: null,
  });
  const account = row.account;
  if (!account)
    return (
      <EmptyState>
        Akun belum tersedia. Pembuatan akun tetap mengikuti alur API yang sudah
        ada.
      </EmptyState>
    );
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="personId" value={row.person.id} />
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
        Akun Login
      </p>
      {(
        [
          ['username', 'Username', account.username],
          ['accountEmail', 'Email akun', account.email],
          ['externalAuthId', 'Keycloak subject', account.externalAuthId],
        ] as [string, string, string | null | undefined][]
      ).map(([name, label, value]) => (
        <label key={name} className="text-sm font-medium text-slate-700">
          {label}
          <input
            name={name}
            defaultValue={(value ?? undefined) as string | undefined}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      ))}
      <label className="text-sm font-medium text-slate-700">
        Status akun
        <select
          name="accountStatus"
          defaultValue={account.status}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </select>
      </label>
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Password tidak disimpan di LMS. Perubahan username, email, dan status
        hanya memperbarui metadata akun lokal.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-1 rounded-md border border-slate-300 font-semibold"
        >
          Batal
        </button>
        <button
          disabled={pending}
          className="min-h-11 flex-1 rounded-md bg-sky-600 font-semibold text-white"
        >
          {pending ? 'Menyimpan...' : 'Simpan Akun'}
        </button>
      </div>
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function ActionMessage({
  state,
}: {
  state: { ok: boolean; message: string | null };
}) {
  return state.message ? (
    <p
      className={
        state.ok
          ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
          : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
      }
    >
      {state.message}
    </p>
  ) : null;
}
function accountLabel(account: UserAccount | null) {
  return account ? (
    <div className="flex flex-col gap-1">
      <Pill tone={account.status === 'ACTIVE' ? 'green' : 'red'}>
        {account.status === 'ACTIVE'
          ? 'Aktif'
          : account.status === 'SUSPENDED'
            ? 'Ditangguhkan'
            : 'Nonaktif'}
      </Pill>
      <span className="max-w-48 truncate text-xs text-slate-500">
        {account.username || account.email || 'Tanpa identitas login'}
      </span>
    </div>
  ) : (
    <Pill tone="slate">Belum ada akun</Pill>
  );
}

function placementLabel(
  placements: PersonOrganization[],
  orgMap: Map<string, string>,
) {
  const active =
    placements.find((placement) => placement.isActive) || placements[0];
  return active
    ? `${orgMap.get(active.organizationId) || 'Unit tidak terbaca'}${active.positionName ? ` · ${active.positionName}` : ''}`
    : 'Belum ditempatkan';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}
function personelHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/personel?${query}` : '/personel';
}
function Pagination({
  filters,
  total,
  totalPages,
}: {
  filters: Filters;
  total: number;
  totalPages: number;
}) {
  const start = total ? (filters.page - 1) * filters.limit + 1 : 0;
  const end = Math.min(total, filters.page * filters.limit);
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Menampilkan{' '}
        <b className="text-slate-950">
          {start} - {end}
        </b>{' '}
        dari <b className="text-slate-950">{total}</b> personel
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah data per halaman"
          defaultValue={filters.limit}
          onChange={(event) => {
            window.location.href = personelHref({
              ...filters,
              limit: Number(event.target.value),
              page: 1,
            });
          }}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <Link
          href={personelHref({
            ...filters,
            page: Math.max(1, filters.page - 1),
          })}
          className={
            filters.page > 1
              ? 'rounded-md border border-slate-300 px-3 py-2'
              : 'pointer-events-none rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400'
          }
        >
          Sebelumnya
        </Link>
        <span>
          {filters.page} / {totalPages}
        </span>
        <Link
          href={personelHref({ ...filters, page: filters.page + 1 })}
          className={
            filters.page < totalPages
              ? 'rounded-md border border-slate-300 px-3 py-2'
              : 'pointer-events-none rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-slate-400'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
