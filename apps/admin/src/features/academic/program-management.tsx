'use client';

import type {
  ApiListResponse,
  EducationProgram,
  Organization,
} from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { ErrorState, EmptyState } from '@/components/admin-design-system';
import { StatusBadge } from '@/components/admin-design-system';
import {
  createProgramAction,
  updateProgramAction,
  updateProgramStatusAction,
} from './program-actions';

type Filters = {
  search?: string;
  organizationId?: string;
  status?: EducationProgram['status'];
  page: number;
  limit: number;
};
type Result = {
  data: ApiListResponse<EducationProgram> | null;
  error: string | null;
};

type Drawer =
  { mode: 'create' } | { mode: 'edit'; program: EducationProgram } | null;

export function ProgramWorkspace({
  result,
  organizations,
  filters,
}: {
  result: Result;
  organizations: Organization[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const programs = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const organizationNames = useMemo(
    () =>
      new Map(
        organizations.map((item) => [item.id, `${item.name} (${item.code})`]),
      ),
    [organizations],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Akademik / Program
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Kelola program pendidikan
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error
              ? 'Data program belum dapat dimuat.'
              : `${total} program ditemukan. Gunakan filter untuk mempersempit daftar.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
        >
          + Tambah program
        </button>
      </header>

      <ProgramToolbar filters={filters} organizations={organizations} />

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : programs.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada program yang cocok.
            </p>
            <p className="mt-2">
              Coba ubah kata pencarian atau filter organisasi/status.
            </p>
            <Link
              href="/program"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <ProgramTable
            programs={programs}
            organizationNames={organizationNames}
            onEdit={(program) => setDrawer({ mode: 'edit', program })}
          />
        )}
        {!result.error ? (
          <ProgramPagination
            filters={filters}
            total={total}
            totalPages={totalPages}
          />
        ) : null}
      </div>

      {drawer ? (
        <ProgramDrawer
          drawer={drawer}
          organizations={organizations}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </div>
  );
}

function ProgramToolbar({
  filters,
  organizations,
}: {
  filters: Filters;
  organizations: Organization[];
}) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Aktif', value: 'ACTIVE' as const },
    { label: 'Nonaktif', value: 'INACTIVE' as const },
  ];
  return (
    <div className="mx-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status program
        </p>
        <div className="flex flex-wrap gap-2">
          {statuses.map((item) => (
            <Link
              key={item.label}
              href={programHref({ ...filters, status: item.value, page: 1 })}
              className={
                filters.status === item.value ||
                (!filters.status && !item.value)
                  ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
                  : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700'
              }
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      <form
        action="/program"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <select
          name="organizationId"
          defaultValue={filters.organizationId ?? ''}
          aria-label="Filter organisasi"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-64"
        >
          <option value="">Semua organisasi</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name} ({organization.code})
            </option>
          ))}
        </select>
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari nama atau kode program"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/program"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </div>
  );
}

function ProgramTable({
  programs,
  organizationNames,
  onEdit,
}: {
  programs: EducationProgram[];
  organizationNames: Map<string, string>;
  onEdit: (program: EducationProgram) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1060px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nama program</th>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Organisasi pemilik</th>
              <th className="px-4 py-3">Jenjang / tipe</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Terakhir diubah</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {programs.map((program) => (
              <ProgramRow
                key={program.id}
                program={program}
                organizationNames={organizationNames}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            organizationNames={organizationNames}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}

function ProgramRow({
  program,
  organizationNames,
  onEdit,
}: {
  program: EducationProgram;
  organizationNames: Map<string, string>;
  onEdit: (program: EducationProgram) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">{program.name}</p>
        {program.description ? (
          <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
            {program.description}
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 font-medium text-slate-600">{program.code}</td>
      <td className="px-4 py-3 text-slate-600">
        {organizationNames.get(program.organizationId) ??
          'Organisasi tidak terbaca'}
      </td>
      <td className="px-4 py-3 text-slate-500">Belum tersedia</td>
      <td className="px-4 py-3">
        <StatusBadge tone={program.status === 'ACTIVE' ? 'green' : 'red'}>
          {program.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {formatDate(program.updatedAt)}
      </td>
      <td className="px-4 py-3">
        <ProgramActions program={program} onEdit={() => onEdit(program)} />
      </td>
    </tr>
  );
}

function ProgramCard({
  program,
  organizationNames,
  onEdit,
}: {
  program: EducationProgram;
  organizationNames: Map<string, string>;
  onEdit: (program: EducationProgram) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {program.name}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {program.code}
          </p>
        </div>
        <StatusBadge tone={program.status === 'ACTIVE' ? 'green' : 'red'}>
          {program.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Organisasi</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {organizationNames.get(program.organizationId) ?? 'Tidak terbaca'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Jenjang / tipe</dt>
          <dd className="mt-1 font-medium text-slate-500">Belum tersedia</dd>
        </div>
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(program.updatedAt)}
          </dd>
        </div>
      </dl>
      <ProgramActions program={program} onEdit={() => onEdit(program)} />
    </article>
  );
}

function ProgramActions({
  program,
  onEdit,
}: {
  program: EducationProgram;
  onEdit: () => void;
}) {
  const [state, action, isPending] = useActionState(updateProgramStatusAction, {
    ok: false,
    message: null,
  });
  const targetStatus = program.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled
          title="Detail belum tersedia pada kontrak Admin"
          className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
        >
          Detail
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Ubah
        </button>
        <form
          action={action}
          onSubmit={(event) => {
            if (
              targetStatus === 'INACTIVE' &&
              !window.confirm(
                `Nonaktifkan ${program.name}? Data tidak dihapus dan histori tetap tersimpan.`,
              )
            )
              event.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={program.id} />
          <input type="hidden" name="name" value={program.name} />
          <input type="hidden" name="status" value={targetStatus} />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-60"
          >
            {isPending
              ? 'Memproses...'
              : targetStatus === 'ACTIVE'
                ? 'Aktifkan'
                : 'Nonaktifkan'}
          </button>
        </form>
      </div>
      {state.message ? (
        <p
          className={
            state.ok ? 'text-xs text-emerald-700' : 'text-xs text-red-700'
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

function ProgramDrawer({
  drawer,
  organizations,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  organizations: Organization[];
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const program = isEdit ? drawer.program : null;
  const [state, action, isPending] = useActionState(
    isEdit ? updateProgramAction : createProgramAction,
    { ok: false, message: null },
  );
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
                {isEdit ? 'Ubah data' : 'Tambah data'}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {isEdit ? 'Ubah program' : 'Tambah program'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isi kolom wajib dengan data yang mudah dikenali operator.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-lg text-slate-500"
            >
              ×
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <form action={action} className="grid gap-4">
            {program ? (
              <input type="hidden" name="id" value={program.id} />
            ) : null}
            <label className="text-sm font-medium text-slate-700">
              Organisasi pemilik <span className="text-rose-600">*</span>
              <select
                name="organizationId"
                defaultValue={program?.organizationId ?? ''}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Pilih organisasi</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.code})
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Program selalu dimiliki satu organisasi.
              </span>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Kode program <span className="text-rose-600">*</span>
              <input
                name="code"
                defaultValue={program?.code ?? ''}
                required
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                title="Gunakan huruf, angka, garis bawah, atau tanda hubung."
                placeholder="Contoh: DIKDAS-01"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Nama program <span className="text-rose-600">*</span>
              <input
                name="name"
                defaultValue={program?.name ?? ''}
                required
                minLength={1}
                maxLength={255}
                placeholder="Contoh: Pendidikan Dasar"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Deskripsi
              <input
                name="description"
                defaultValue={program?.description ?? ''}
                maxLength={2000}
                placeholder="Ringkasan program (opsional)"
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue={program?.status ?? 'ACTIVE'}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </label>
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              Jenjang/tipe akademik belum tersedia pada kontrak program saat
              ini, sehingga tidak ditampilkan sebagai pilihan palsu.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
            {state.message ? (
              <p
                className={
                  state.ok
                    ? 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700'
                    : 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
                }
              >
                {state.message}
              </p>
            ) : null}
          </form>
        </div>
      </aside>
    </div>
  );
}

function ProgramPagination({
  filters,
  total,
  totalPages,
}: {
  filters: Filters;
  total: number;
  totalPages: number;
}) {
  const start = total === 0 ? 0 : (filters.page - 1) * filters.limit + 1;
  const end = Math.min(total, filters.page * filters.limit);
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Menampilkan{' '}
        <span className="font-semibold text-slate-950">
          {start} - {end}
        </span>{' '}
        dari <span className="font-semibold text-slate-950">{total}</span>{' '}
        program
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah program per halaman"
          defaultValue={filters.limit}
          onChange={(event) => {
            window.location.href = programHref({
              ...filters,
              limit: Number(event.target.value),
              page: 1,
            });
          }}
          className="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <Link
          href={programHref({
            ...filters,
            page: Math.max(1, filters.page - 1),
          })}
          className={
            filters.page > 1
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 font-medium hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-slate-400'
          }
        >
          Sebelumnya
        </Link>
        <span className="px-2">
          {filters.page} / {totalPages}
        </span>
        <Link
          href={programHref({ ...filters, page: filters.page + 1 })}
          className={
            filters.page < totalPages
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 font-medium hover:border-sky-300 hover:text-sky-700'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-slate-400'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}

function programHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.organizationId)
    params.set('organizationId', filters.organizationId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/program?${query}` : '/program';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}
