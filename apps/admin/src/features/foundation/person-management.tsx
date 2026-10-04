'use client';

import type {
  ApiListResponse,
  IdentityAuditReport,
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
import { createPersonAction, updatePersonAction } from './actions';
import {
  type AccountReadError,
  formatDate,
  accountStatusLabel,
  accountStatusTone,
  identityAmbiguityLabel,
  personStatusLabel,
  placementLabel,
} from './display';

type Result<T> = { data: T | null; error: string | null };

export type PersonFilters = {
  search?: string;
  status?: Person['status'];
  page: number;
  limit: number;
};

export type PersonRow = {
  person: Person;
  account: UserAccount | null;
  accountError: AccountReadError | null;
  placements: PersonOrganization[];
};

export function dataIndividuHref(filters: PersonFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/data-individu?${query}` : '/data-individu';
}

/**
 * Data Individu workspace — identity only.
 *
 * A person is registered here with no login metadata at all, which is what
 * makes "individu tanpa akun" a first-class case instead of a failed account
 * creation. Account fields live on the Akun Pengguna screen, so creating a
 * person can never silently create a login.
 */
export function PersonWorkspace({
  result,
  filters,
  rows,
  audit,
}: {
  result: Result<ApiListResponse<Person>>;
  filters: PersonFilters;
  rows: PersonRow[];
  audit: Result<IdentityAuditReport>;
}) {
  const [drawer, setDrawer] = useState<
    { kind: 'edit'; row: PersonRow } | { kind: 'create' } | null
  >(null);
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Data Induk / Data Individu"
        title="Kelola data individu"
        description={
          result.error
            ? 'Data belum dapat dimuat.'
            : `${total} data individu ditemukan. Identitas orang dikelola di sini, terpisah dari akun pengguna.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ kind: 'create' })}>
            + Tambah data individu
          </PrimaryActionButton>
        }
      />
      <IdentityAuditPanel audit={audit} />
      <PersonToolbar filters={filters} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Tidak ada data individu yang cocok.
            </p>
            <p className="mt-2">
              Coba hapus pencarian atau ubah filter status.
            </p>
            <Link
              href="/data-individu"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <PersonTable
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
            itemLabel="data individu"
            hrefFor={(next) => dataIndividuHref({ ...filters, ...next })}
          />
        ) : null}
      </div>
      {drawer ? (
        <PersonDrawer drawer={drawer} onClose={() => setDrawer(null)} />
      ) : null}
    </AdminPage>
  );
}

/**
 * Identity integrity panel.
 *
 * Read-only and non-blocking on purpose: it reports counts and ambiguous rows so
 * a human can review them, and it never merges, renames, or deactivates anyone.
 * A failed audit read is shown as unavailable rather than as "no findings",
 * because a silent zero would look like a clean bill of health.
 */
function IdentityAuditPanel({ audit }: { audit: Result<IdentityAuditReport> }) {
  if (audit.error) return null;
  const report = audit.data;
  if (!report) return null;
  return (
    <section className="mx-5 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">
            Pemeriksaan integritas identitas
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Hanya melaporkan. Tidak ada data individu yang digabung, diganti
            nama, atau dinonaktifkan otomatis oleh pemeriksaan ini.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <AuditMetric label="Total individu" value={report.totalPersons} />
          <AuditMetric label="Punya akun" value={report.personsWithAccount} />
          <AuditMetric
            label="Belum punya akun"
            value={report.personsWithoutAccount}
          />
          <AuditMetric
            label="Perlu ditinjau"
            value={report.ambiguities.length}
            tone={report.ambiguities.length > 0 ? 'amber' : 'green'}
          />
        </div>
      </div>
      {report.orphanedAccounts > 0 || report.personsWithMultipleAccounts > 0 ? (
        <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-900">
          Ditemukan {report.orphanedAccounts} akun tanpa data individu dan{' '}
          {report.personsWithMultipleAccounts} individu dengan lebih dari satu
          akun. Ini melanggar aturan relasi dan perlu ditinjau sebelum data
          dipakai lebih lanjut.
        </p>
      ) : null}
      {report.ambiguities.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Tidak ada identitas ambigu yang terdeteksi. Email dan nama yang sama
          tidak otomatis dianggap orang yang sama.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {report.ambiguities.map((finding) => (
            <li
              key={`${finding.kind}-${finding.key}`}
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="amber">{identityAmbiguityLabel(finding.kind)}</Pill>
                <span className="text-xs font-semibold text-amber-900">
                  {finding.key}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                {finding.message}
              </p>
              <p className="mt-1 flex flex-wrap gap-2 text-xs">
                {finding.personIds.map((id, index) => (
                  <Link
                    key={id}
                    href={`/data-individu/${id}`}
                    className="rounded border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-900"
                  >
                    {finding.personLabels[index] ?? id}
                  </Link>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AuditMetric({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'green' | 'amber';
}) {
  const tones = {
    slate: 'text-slate-700',
    green: 'text-emerald-700',
    amber: 'text-amber-800',
  } as const;
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${tones[tone]}`}>{value}</p>
    </div>
  );
}

function PersonToolbar({ filters }: { filters: PersonFilters }) {
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
              href: dataIndividuHref({
                ...filters,
                status: status as PersonFilters['status'],
                page: 1,
              }),
              active: filters.status === status || (!filters.status && !status),
            }))}
          />
        }
      >
        <form
          action="/data-individu"
          className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
        >
          <input type="hidden" name="status" value={filters.status ?? ''} />
          <input type="hidden" name="limit" value={filters.limit} />
          <input
            type="search"
            name="search"
            defaultValue={filters.search}
            placeholder="Cari nama atau NRP/NIP"
            className="min-h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-80 xl:w-[28rem]"
          />
          <button className="min-h-10 flex-1 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white sm:flex-none">
            Cari
          </button>
          <Link
            href="/data-individu"
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
  onEdit,
}: {
  rows: PersonRow[];
  onEdit: (row: PersonRow) => void;
}) {
  return (
    <EnterpriseTable
      minWidth={1080}
      columns={[
        { label: 'Nama' },
        { label: 'NRP/NIP' },
        { label: 'Email' },
        { label: 'Satuan kerja' },
        { label: 'Akun pengguna' },
        { label: 'Status individu' },
        { label: 'Diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      colWidths={[
        '190px',
        '140px',
        '210px',
        '160px',
        '170px',
        '130px',
        '120px',
        '180px',
      ]}
      mobile={
        <>
          {rows.map((row) => (
            <PersonCard key={row.person.id} row={row} onEdit={onEdit} />
          ))}
        </>
      }
    >
      {rows.map((row) => (
        <PersonRow key={row.person.id} row={row} onEdit={onEdit} />
      ))}
    </EnterpriseTable>
  );
}

function PersonRow({
  row,
  onEdit,
}: {
  row: PersonRow;
  onEdit: (row: PersonRow) => void;
}) {
  return (
    <tr className="group hover:bg-slate-50/80">
      <td className="px-4 py-3 align-middle">
        <Link
          href={`/data-individu/${row.person.id}`}
          className="font-semibold text-slate-950 hover:text-sky-700"
        >
          {row.person.fullName}
        </Link>
        <p className="text-xs text-slate-500">
          {row.person.rank || row.person.title || 'Data individu'}
        </p>
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {row.person.personnelNumber}
      </td>
      <td className="break-words px-4 py-3 align-middle text-slate-600">
        {row.person.email || '-'}
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {placementLabel(row.placements)}
      </td>
      <td className="break-words px-4 py-3 align-middle">
        {accountLabel(row.account, row.accountError)}
      </td>
      <td className="px-4 py-3 align-middle">
        <Pill tone={row.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {personStatusLabel(row.person.status)}
        </Pill>
      </td>
      <td className="px-4 py-3 align-middle text-slate-600">
        {formatDate(row.person.updatedAt)}
      </td>
      <StickyActionCell>
        <Actions row={row} onEdit={onEdit} />
      </StickyActionCell>
    </tr>
  );
}

function PersonCard({
  row,
  onEdit,
}: {
  row: PersonRow;
  onEdit: (row: PersonRow) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href={`/data-individu/${row.person.id}`}
            className="font-semibold text-slate-950"
          >
            {row.person.fullName}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            {row.person.personnelNumber}
          </p>
        </div>
        <Pill tone={row.person.status === 'ACTIVE' ? 'green' : 'red'}>
          {personStatusLabel(row.person.status)}
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
          <dt className="text-slate-400">Satuan kerja</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {placementLabel(row.placements)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Akun pengguna</dt>
          <dd className="mt-1 grid gap-1">
            {accountLabel(row.account, row.accountError)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(row.person.updatedAt)}
          </dd>
        </div>
      </dl>
      <Actions row={row} onEdit={onEdit} />
    </article>
  );
}

function Actions({
  row,
  onEdit,
}: {
  row: PersonRow;
  onEdit: (row: PersonRow) => void;
}) {
  return (
    <ActionGroup>
      <Link
        href={`/data-individu/${row.person.id}`}
        className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
      >
        Detail
      </Link>
      <ActionButton onClick={() => onEdit(row)}>Edit</ActionButton>
      <Link
        href={`/akun-pengguna?search=${encodeURIComponent(row.person.personnelNumber)}`}
        className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        title="Cari akun pengguna individu ini"
      >
        Akun Pengguna
      </Link>
      <ActionButton
        disabled
        title="Status data individu diubah melalui Edit agar tidak ada perubahan tersembunyi"
      >
        {row.person.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
      </ActionButton>
    </ActionGroup>
  );
}

function PersonDrawer({
  drawer,
  onClose,
}: {
  drawer: { kind: 'edit'; row: PersonRow } | { kind: 'create' };
  onClose: () => void;
}) {
  const row = drawer.kind === 'create' ? null : drawer.row;
  return (
    <EnterpriseDrawer
      eyebrow="Data Individu"
      title={
        drawer.kind === 'create' ? 'Tambah Data Individu' : 'Edit Data Individu'
      }
      description="Kolom bertanda wajib harus diisi. Identitas login dan hak akses diatur terpisah pada menu Akun Pengguna."
      onClose={onClose}
    >
      <PersonForm row={row} onClose={onClose} />
    </EnterpriseDrawer>
  );
}

function PersonForm({
  row,
  onClose,
}: {
  row: PersonRow | null;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    row ? updatePersonAction : createPersonAction,
    { ok: false, message: null },
  );
  return (
    <form action={action} className="grid gap-4">
      <p className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-950">
        Identitas Orang
      </p>
      {row ? <input type="hidden" name="id" value={row.person.id} /> : null}
      {(
        [
          ['personnelNumber', 'NRP/NIP', row?.person.personnelNumber],
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
      {row ? (
        <FormField
          label="Status individu"
          helper="Menonaktifkan data individu tidak mengubah status akun penggunanya."
        >
          <select
            name="status"
            defaultValue={row.person.status}
            className={enterpriseInputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </FormField>
      ) : null}
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
        Data individu dapat disimpan tanpa akun pengguna. Akun pengguna dibuat
        terpisah pada menu Manajemen Akses → Akun Pengguna.
      </p>
      <FormActions
        onCancel={onClose}
        pending={pending}
        submitLabel={row ? 'Simpan Perubahan' : 'Simpan Data Individu'}
      />
      {state.message ? <ActionMessage state={state} /> : null}
    </form>
  );
}

/**
 * Read-only account summary for a person row.
 *
 * Distinguishes "no account" from "account could not be read": reporting a
 * denied read as "belum memiliki akun" would push an operator to create a second
 * account for someone who already has one.
 */
export function accountLabel(
  account: UserAccount | null,
  error: AccountReadError | null,
) {
  if (account) {
    return (
      <div className="flex flex-col gap-1">
        <Pill tone={accountStatusTone(account.status)}>
          {accountStatusLabel(account.status)}
        </Pill>
        <span className="max-w-48 truncate text-xs text-slate-500">
          {account.username || account.email || 'Tanpa identitas login'}
        </span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex max-w-56 flex-col gap-1">
        <Pill tone={error.status === 403 ? 'amber' : 'red'}>
          {error.status === 403 ? 'Akses akun ditolak' : 'Akun gagal dibaca'}
        </Pill>
        <span className="text-xs leading-4 text-slate-500">
          {error.status > 0 ? `HTTP ${error.status}` : 'koneksi gagal'} · data
          akun tidak dapat diverifikasi
        </span>
      </div>
    );
  }
  return <Pill tone="slate">Belum memiliki akun</Pill>;
}
