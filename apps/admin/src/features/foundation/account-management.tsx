'use client';

import type {
  ApiListResponse,
  KeycloakProvisioningStatusResult,
  Person,
  UserAccount,
  UserAccountWithPerson,
} from '@lms/api-client';
import Link from 'next/link';
import { useState } from 'react';
import {
  ActionButton,
  ActionGroup,
  ActionMessage,
  AdminPage,
  EmptyState,
  EnterpriseDrawer,
  DrawerHost,
  useDrawerActionState,
  EnterpriseTable,
  ErrorState,
  FilterTabs,
  FilterToolbar,
  StatusFilter,
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
  createPersonAccountAction,
  updatePersonAccountAction,
} from './actions';
import {
  formatDate,
  formatDateTime,
  personStatusLabel,
  accountStatusLabel,
  accountStatusTone,
} from './display';
import {
  KeycloakProvisioningPanel,
  ProvisioningBadge,
} from './keycloak-provisioning-panel';

type Result<T> = { data: T | null; error: string | null };

export type AccountFilters = {
  search?: string;
  status?: UserAccount['status'];
  page: number;
  limit: number;
};

export type AccountRow = {
  account: UserAccountWithPerson;
  keycloak: KeycloakProvisioningStatusResult | null;
};

export function akunPenggunaHref(filters: AccountFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/akun-pengguna?${query}` : '/akun-pengguna';
}

/**
 * Akun Pengguna workspace — login lifecycle only.
 *
 * Two rules drive the shape of this screen:
 * 1. An account is always attached to a person chosen from a list of already
 *    registered people, so a name or NRP/NIP can never be typed twice and no
 *    duplicate identity can be born here.
 * 2. Deactivating an account stops the login. It never touches the person, which
 *    keeps education history, placements, and academic records intact.
 */
export function AccountWorkspace({
  result,
  filters,
  rows,
  personOptions,
  personOptionsError = null,
}: {
  result: Result<ApiListResponse<UserAccountWithPerson>>;
  filters: AccountFilters;
  rows: AccountRow[];
  /**
   * People without an account yet — the only valid choices for a new account.
   * People who already have one are excluded so the picker cannot offer a
   * combination the backend rejects.
   */
  personOptions: Person[];
  personOptionsError?: string | null;
}) {
  const [drawer, setDrawer] = useState<
    { kind: 'edit'; row: AccountRow } | { kind: 'create' } | null
  >(null);
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Manajemen Akses / Akun Pengguna"
        title="Kelola akun pengguna"
        description={
          result.error
            ? 'Data belum dapat dimuat.'
            : `${total} akun pengguna ditemukan. Akun menghubungkan individu terdaftar ke identitas login SSO dan hak aksesnya.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ kind: 'create' })}>
            + Hubungkan akun pengguna
          </PrimaryActionButton>
        }
      />
      <AccountToolbar filters={filters} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada akun pengguna yang cocok.
            </p>
            <p className="mt-2">
              Coba hapus pencarian atau ubah filter status. Data individu tanpa
              akun tetap ada di menu Data Induk → Data Individu.
            </p>
            <Link
              href="/akun-pengguna"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <AccountTable
            rows={rows}
            onEdit={(row) => setDrawer({ kind: 'edit', row })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="akun pengguna"
            hrefFor={(next) => akunPenggunaHref({ ...filters, ...next })}
          />
        ) : null}
      </div>
      <DrawerHost
        activeKey={
          drawer
            ? drawer.kind === 'create'
              ? 'create'
              : `edit:${drawer.row.account.id}`
            : null
        }
        onClose={() => setDrawer(null)}
      >
        {drawer ? (
          <AccountDrawer
            drawer={drawer}
            personOptions={personOptions}
            personOptionsError={personOptionsError}
            onClose={() => setDrawer(null)}
          />
        ) : null}
      </DrawerHost>
    </AdminPage>
  );
}

function AccountToolbar({ filters }: { filters: AccountFilters }) {
  return (
    <div className="mx-5">
      <FilterToolbar
        filters={
          <FilterTabs
            tabs={[
              ['Semua', undefined],
              ['Aktif', 'ACTIVE'],
              ['Nonaktif', 'INACTIVE'],
              ['Ditangguhkan', 'SUSPENDED'],
            ].map(([label, status]) => ({
              label: label as string,
              href: akunPenggunaHref({
                ...filters,
                status: status as AccountFilters['status'],
                page: 1,
              }),
              active: filters.status === status || (!filters.status && !status),
            }))}
          />
        }
      >
        <form
          key={JSON.stringify(filters)}
          action="/akun-pengguna"
          className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
        >
          <StatusFilter
            options={[
              { label: 'Semua', value: undefined },
              { label: 'Aktif', value: 'ACTIVE' },
              { label: 'Nonaktif', value: 'INACTIVE' },
              { label: 'Ditangguhkan', value: 'SUSPENDED' },
            ]}
            value={String(filters.status ?? '')}
          />
          <input type="hidden" name="limit" value={filters.limit} />
          <input
            type="search"
            aria-label="Pencarian daftar"
            name="search"
            defaultValue={filters.search}
            placeholder="Cari nama, NRP/NIP, nama pengguna, atau email"
            className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-80 xl:w-[28rem]"
          />
          <button className="min-h-10 flex-1 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white sm:flex-none">
            Terapkan filter
          </button>
          <Link
            href="/akun-pengguna"
            className="inline-flex min-h-10 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-700 sm:flex-none"
          >
            Atur ulang
          </Link>
        </form>
      </FilterToolbar>
    </div>
  );
}

function AccountTable({
  rows,
  onEdit,
}: {
  rows: AccountRow[];
  onEdit: (row: AccountRow) => void;
}) {
  return (
    <EnterpriseTable
      minWidth={1100}
      columns={[
        { label: 'Pemilik akun' },
        { label: 'NRP/NIP' },
        { label: 'Nama pengguna' },
        { label: 'Email login' },
        { label: 'Status akun' },
        { label: 'Status individu' },
        { label: 'Login terakhir' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={[
        '190px',
        '130px',
        '180px',
        '210px',
        '130px',
        '130px',
        '150px',
        '160px',
      ]}
      mobile={
        <>
          {rows.map((row) => (
            <AccountCard key={row.account.id} row={row} onEdit={onEdit} />
          ))}
        </>
      }
    >
      {rows.map((row) => (
        <AccountRowItem key={row.account.id} row={row} onEdit={onEdit} />
      ))}
    </EnterpriseTable>
  );
}

function AccountRowItem({
  row,
  onEdit,
}: {
  row: AccountRow;
  onEdit: (row: AccountRow) => void;
}) {
  const { account } = row;
  return (
    <tr className="group hover:bg-slate-50/80">
      <td className="px-4 py-3 align-middle">
        <Link
          href={`/data-individu/${account.person.id}`}
          className="font-semibold text-slate-950 hover:text-sky-700"
        >
          {account.person.fullName}
        </Link>
        <p className="text-xs text-slate-500">
          {account.person.rank || account.person.title || 'Data individu'}
        </p>
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {account.person.personnelNumber}
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {account.username || '-'}
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {account.email || '-'}
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <Pill tone={accountStatusTone(account.status)}>
            {accountStatusLabel(account.status)}
          </Pill>
          {row.keycloak ? (
            <ProvisioningBadge status={row.keycloak.status} />
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <Pill tone={account.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {personStatusLabel(account.person.status)}
        </Pill>
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {account.lastLoginAt
          ? formatDateTime(account.lastLoginAt)
          : 'Belum pernah'}
      </td>
      <StickyActionCell>
        <ActionGroup>
          <Link
            href={`/data-individu/${account.person.id}`}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            Data Individu
          </Link>
          <ActionButton onClick={() => onEdit(row)}>Kelola Akun</ActionButton>
        </ActionGroup>
      </StickyActionCell>
    </tr>
  );
}

function AccountCard({
  row,
  onEdit,
}: {
  row: AccountRow;
  onEdit: (row: AccountRow) => void;
}) {
  const { account } = row;
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/data-individu/${account.person.id}`}
            className="font-semibold text-slate-950"
          >
            {account.person.fullName}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            {account.person.personnelNumber}
          </p>
        </div>
        <Pill tone={accountStatusTone(account.status)}>
          {accountStatusLabel(account.status)}
        </Pill>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Nama pengguna</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {account.username || '-'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Email login</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {account.email || '-'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Status individu</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {personStatusLabel(account.person.status)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Login terakhir</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {account.lastLoginAt
              ? formatDateTime(account.lastLoginAt)
              : 'Belum pernah'}
          </dd>
        </div>
      </dl>
      <ActionGroup>
        <Link
          href={`/data-individu/${account.person.id}`}
          className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
        >
          Data Individu
        </Link>
        <ActionButton onClick={() => onEdit(row)}>Kelola Akun</ActionButton>
      </ActionGroup>
    </article>
  );
}

function AccountDrawer({
  drawer,
  personOptions,
  personOptionsError,
  onClose,
}: {
  drawer: { kind: 'edit'; row: AccountRow } | { kind: 'create' };
  personOptions: Person[];
  personOptionsError: string | null;
  onClose: () => void;
}) {
  const row = drawer.kind === 'create' ? null : drawer.row;
  return (
    <EnterpriseDrawer
      eyebrow="Akun Pengguna"
      title={row ? 'Kelola Akun Pengguna' : 'Hubungkan Akun Pengguna'}
      description="Identitas orang diambil dari Data Individu. Kata sandi tidak disimpan di LMS karena login memakai SSO Keycloak."
      onClose={onClose}
    >
      {row ? (
        <AccountForm row={row} onClose={onClose} />
      ) : personOptionsError ? (
        <ErrorState message={personOptionsError} />
      ) : (
        <CreateAccountForm personOptions={personOptions} onClose={onClose} />
      )}
    </EnterpriseDrawer>
  );
}

/**
 * Link an account to an already registered person.
 *
 * Identity is displayed, never typed: the person is selected by NRP/NIP, and the
 * name shown next to it comes from the person record. Letting an operator retype
 * a name here is how duplicate identities are created.
 */
function CreateAccountForm({
  personOptions,
  onClose,
}: {
  personOptions: Person[];
  onClose: () => void;
}) {
  const [state, action, pending] = useDrawerActionState(
    createPersonAccountAction,
    {
      ok: false,
      message: null,
    },
  );
  const [selectedId, setSelectedId] = useState(personOptions[0]?.id ?? '');
  const selected = personOptions.find((person) => person.id === selectedId);

  if (personOptions.length === 0) {
    return (
      <EmptyState>
        <p className="font-semibold text-slate-950">
          Semua data individu sudah memiliki akun.
        </p>
        <p className="mt-2">
          Akun hanya dapat dihubungkan ke individu terdaftar. Tambahkan data
          individu lebih dahulu di menu Data Induk → Data Individu.
        </p>
        <Link
          href="/data-individu"
          className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
        >
          Buka Data Individu
        </Link>
      </EmptyState>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
        Individu Pemilik Akun
      </p>
      <FormField
        label="Pilih data individu"
        required
        helper="Hanya individu yang belum memiliki akun yang dapat dipilih."
      >
        <select
          name="personId"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className={enterpriseInputClass}
        >
          {personOptions.map((person) => (
            <option key={person.id} value={person.id}>
              {person.personnelNumber} — {person.fullName}
            </option>
          ))}
        </select>
      </FormField>
      {selected ? (
        <dl className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
          <div>
            <dt className="text-slate-400">Nama</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {selected.fullName}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">NRP/NIP</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {selected.personnelNumber}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Status individu</dt>
            <dd className="mt-1 font-medium text-slate-700">
              {personStatusLabel(selected.status)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Email individu</dt>
            <dd className="mt-1 truncate font-medium text-slate-700">
              {selected.email || '-'}
            </dd>
          </div>
        </dl>
      ) : null}
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
        Identitas Login
      </p>
      <FormField
        label="Nama pengguna"
        helper="Nama pengguna Keycloak/SSO bila sudah ada."
      >
        <input name="username" className={enterpriseInputClass} />
      </FormField>
      <FormField
        label="Email login"
        helper="Kosongkan bila mengikuti email data individu."
      >
        <input
          name="accountEmail"
          type="email"
          placeholder={selected?.email ?? 'budi.santoso@polri.go.id'}
          className={enterpriseInputClass}
        />
      </FormField>
      <FormField label="Status akun">
        <select
          name="accountStatus"
          defaultValue="ACTIVE"
          className={enterpriseInputClass}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </select>
      </FormField>
      <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
          Opsi lanjutan: tautkan pengguna Keycloak yang sudah ada
        </summary>
        <FormField label="ID pengguna Keycloak">
          <input
            name="externalAuthId"
            placeholder="Kosongkan bila pengguna Keycloak belum dibuat"
            className={enterpriseInputClass}
          />
        </FormField>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Kolom ini adalah nilai <code>sub</code> dari Keycloak, bukan email,
          nama pengguna, atau pilihan peran. Kosongkan dulu bila operator belum
          memiliki ID dari Keycloak.
        </p>
      </details>
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        Kata sandi tidak dibuat di LMS. Login memakai SSO Keycloak; peran dan
        cakupan kewenangan diberikan melalui menu Penugasan.
      </p>
      <FormActions
        onCancel={onClose}
        pending={pending}
        submitLabel="Simpan Akun Pengguna"
      />
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

function AccountForm({
  row,
  onClose,
}: {
  row: AccountRow;
  onClose: () => void;
}) {
  const [state, action, pending] = useDrawerActionState(
    updatePersonAccountAction,
    {
      ok: false,
      message: null,
    },
  );
  const account = row.account;
  return (
    // The account form and the Keycloak panel must be SIBLING forms, never
    // nested. HTML forbids a <form> inside a <form>: the browser drops the inner
    // one during parsing, so the panel's action would run on the outer account
    // form and `Buat user Keycloak` would never call the provisioning action.
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
        <div>
          <dt className="text-slate-400">Pemilik akun</dt>
          <dd className="mt-1 font-medium text-slate-700">
            <Link
              href={`/data-individu/${account.person.id}`}
              className="text-sky-700 hover:text-sky-900"
            >
              {account.person.fullName}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">NRP/NIP</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {account.person.personnelNumber}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Status individu</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {personStatusLabel(account.person.status)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Akun dibuat</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(account.createdAt)}
          </dd>
        </div>
      </dl>
      <form action={action} className="grid gap-4">
        <input type="hidden" name="personId" value={account.person.id} />
        <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
          Identitas Login
        </p>
        {(
          [
            ['username', 'Nama pengguna', account.username],
            ['accountEmail', 'Email login', account.email],
            [
              'externalAuthId',
              'ID pengguna Keycloak (sub)',
              account.externalAuthId,
            ],
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
        <FormField
          label="Status akun"
          helper="Menonaktifkan akun hanya menghentikan akses login. Identitas, riwayat pendidikan, dan penugasan tetap tersimpan."
        >
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
          Kata sandi tidak disimpan di LMS. Perubahan nama pengguna, email, dan
          status hanya memperbarui metadata akun lokal.
        </p>
        <FormActions
          onCancel={onClose}
          pending={pending}
          submitLabel="Simpan Akun Pengguna"
        />
        {state.message ? <ActionMessage state={state} /> : null}
      </form>
      {row.keycloak ? (
        <div className="border-t border-slate-200 pt-4">
          <KeycloakProvisioningPanel
            personId={account.person.id}
            provisioning={row.keycloak}
          />
        </div>
      ) : null}
    </div>
  );
}
