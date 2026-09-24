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
  enterpriseInputClass,
} from '@/components/admin';
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
    <AdminPage>
      <PageHeader
        eyebrow="Foundation / Personel"
        title="Kelola personel dan akun"
        description={
          result.error
            ? 'Data belum dapat dimuat.'
            : `${total} personel ditemukan. Kelola identitas dan status akun dari satu workspace.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ kind: 'create' })}>
            + Tambah personel
          </PrimaryActionButton>
        }
      />
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
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="personel"
            hrefFor={(next) => personelHref({ ...filters, ...next })}
          />
        ) : null}
      </div>
      {drawer ? (
        <PersonDrawer
          drawer={drawer}
          organizations={organizations}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function PersonToolbar({ filters }: { filters: Filters }) {
  return (
    <div className="mx-5">
      <FilterToolbar
        filters={
          <FilterTabs
            tabs={[
              ['Semua', undefined],
              ['Aktif', 'ACTIVE'],
              ['Nonaktif', 'INACTIVE'],
            ].map(([label, status]) => ({
              label: label as string,
              href: personelHref({
                ...filters,
                status: status as Filters['status'],
                page: 1,
              }),
              active: filters.status === status || (!filters.status && !status),
            }))}
          />
        }
      >
        <form
          action="/personel"
          className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
        >
          <input type="hidden" name="status" value={filters.status ?? ''} />
          <input type="hidden" name="limit" value={filters.limit} />
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Cari nama, NRP/NIP, atau email"
            className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-80 xl:w-[28rem]"
          />
          <button className="min-h-10 flex-1 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white sm:flex-none">
            Cari
          </button>
          <Link
            href="/personel"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 sm:flex-none"
          >
            Reset
          </Link>
        </form>
      </FilterToolbar>
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
    <EnterpriseTable
      minWidth={1080}
      columns={[
        { label: 'Nama personel' },
        { label: 'NIP/NRP' },
        { label: 'Email' },
        { label: 'Organisasi/unit' },
        { label: 'Akun login' },
        { label: 'Status' },
        { label: 'Diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={[
        '190px',
        '140px',
        '210px',
        '160px',
        '170px',
        '110px',
        '120px',
        '180px',
      ]}
      mobile={
        <>
          {rows.map((row) => (
            <PersonCard
              key={row.person.id}
              row={row}
              orgMap={orgMap}
              onPerson={onPerson}
              onAccount={onAccount}
            />
          ))}
        </>
      }
    >
      {rows.map((row) => (
        <PersonRow
          key={row.person.id}
          row={row}
          orgMap={orgMap}
          onPerson={onPerson}
          onAccount={onAccount}
        />
      ))}
    </EnterpriseTable>
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
    <tr className="group hover:bg-slate-50/80">
      <td className="px-4 py-3 align-middle">
        <p className="font-semibold text-slate-950">{row.person.fullName}</p>
        <p className="text-xs text-slate-500">
          {row.person.rank || row.person.title || 'Identitas personel'}
        </p>
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {row.person.personnelNumber}
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {row.person.email || '-'}
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {placementLabel(row.placements, orgMap)}
      </td>
      <td className="break-words px-4 py-3 align-middle">
        {accountLabel(row.account)}
      </td>
      <td className="px-4 py-3 align-middle">
        <Pill tone={row.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {row.person.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </Pill>
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {formatDate(row.person.updatedAt)}
      </td>
      <StickyActionCell>
        <Actions row={row} onPerson={onPerson} onAccount={onAccount} />
      </StickyActionCell>
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
    <ActionGroup>
      <ActionButton
        disabled
        title="Detail personel belum memiliki panel kontrak khusus"
      >
        Detail
      </ActionButton>
      <ActionButton onClick={() => onPerson(row)}>Edit</ActionButton>
      <ActionButton onClick={() => onAccount(row)}>Kelola Akun</ActionButton>
      <ActionButton
        disabled
        title="Status personel diubah melalui Edit agar tidak ada mutation palsu"
      >
        {row.person.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
      </ActionButton>
    </ActionGroup>
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
    <EnterpriseDrawer
      eyebrow={
        drawer.kind === 'account'
          ? 'Akun Login'
          : drawer.kind === 'create'
            ? 'Tambah data'
            : 'Data Personel'
      }
      title={
        drawer.kind === 'account'
          ? 'Kelola Akun Login'
          : drawer.kind === 'create'
            ? 'Tambah Personel'
            : 'Edit Personel'
      }
      description="Kolom bertanda wajib harus diisi. Password tetap dikelola oleh SSO Keycloak."
      onClose={onClose}
    >
      {drawer.kind === 'account' && row ? (
        <AccountForm row={row} onClose={onClose} />
      ) : (
        <PersonForm row={row} organizations={organizations} onClose={onClose} />
      )}
    </EnterpriseDrawer>
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
        <FormField
          key={name}
          label={label}
          required={name === 'personnelNumber' || name === 'fullName'}
        >
          <input
            name={name}
            type={name === 'email' ? 'email' : 'text'}
            defaultValue={(value ?? undefined) as string | undefined}
            required={name === 'personnelNumber' || name === 'fullName'}
            className={enterpriseInputClass}
          />
        </FormField>
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
          <FormField label="Username akun">
            <input name="username" className={enterpriseInputClass} />
          </FormField>
          <FormField label="Email akun">
            <input
              name="accountEmail"
              type="email"
              className={enterpriseInputClass}
            />
          </FormField>
          <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Opsi lanjutan: hubungkan user Keycloak
            </summary>
            <FormField label="ID User Keycloak">
              <input
                name="externalAuthId"
                placeholder="Kosongkan bila user Keycloak belum dibuat"
                className={enterpriseInputClass}
              />
            </FormField>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Field ini adalah nilai <code>sub</code> dari Keycloak, bukan
              email, username, atau pilihan peran. Kosongkan dulu bila operator
              belum memiliki ID dari Keycloak.
            </p>
          </details>
        </>
      ) : (
        <FormField label="Status">
          <select
            name="status"
            defaultValue={row.person.status}
            className={enterpriseInputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </FormField>
      )}
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        Password tidak dibuat di LMS. Agar personel bisa login, user harus ada
        di Keycloak dan perannya diberikan melalui Assignment & Scope.
      </p>
      <FormActions
        onCancel={onClose}
        pending={pending}
        submitLabel={row ? 'Simpan Perubahan' : 'Simpan Personel'}
      />
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
        <FormField key={name} label={label}>
          <input
            name={name}
            defaultValue={(value ?? undefined) as string | undefined}
            className={enterpriseInputClass}
          />
        </FormField>
      ))}
      <FormField label="Status akun">
        <select
          name="accountStatus"
          defaultValue={account.status}
          className={enterpriseInputClass}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </select>
      </FormField>
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Password tidak disimpan di LMS. Perubahan username, email, dan status
        hanya memperbarui metadata akun lokal.
      </p>
      <FormActions
        onCancel={onClose}
        pending={pending}
        submitLabel="Simpan Akun"
      />
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
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
