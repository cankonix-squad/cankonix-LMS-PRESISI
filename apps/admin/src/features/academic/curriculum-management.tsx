'use client';

import type {
  ApiListResponse,
  Curriculum,
  EducationProgram,
} from '@lms/api-client';
import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import {
  EmptyState,
  ErrorState,
  StatusBadge,
} from '@/components/admin-design-system';
import {
  createCurriculumAction,
  updateCurriculumAction,
  updateCurriculumStatusAction,
} from './curriculum-actions';

type Filters = {
  educationProgramId?: string;
  status?: Curriculum['status'];
  page: number;
  limit: number;
};
type Result = {
  data: ApiListResponse<Curriculum> | null;
  error: string | null;
};
type Drawer =
  { mode: 'create' } | { mode: 'edit'; curriculum: Curriculum } | null;

export function CurriculumWorkspace({
  result,
  programs,
  filters,
}: {
  result: Result;
  programs: EducationProgram[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const curricula = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  const programNames = useMemo(
    () =>
      new Map(programs.map((item) => [item.id, `${item.name} (${item.code})`])),
    [programs],
  );
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Akademik / Kurikulum
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Kelola kurikulum
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error
              ? 'Data kurikulum belum dapat dimuat.'
              : `${total} kurikulum ditemukan.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white hover:bg-sky-700"
        >
          + Buat baru
        </button>
      </header>
      <Toolbar filters={filters} programs={programs} />
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : curricula.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada kurikulum yang cocok.
            </p>
            <p className="mt-2">Coba ubah filter program atau status.</p>
            <Link
              href="/kurikulum"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <Table
            curricula={curricula}
            programNames={programNames}
            onEdit={(curriculum) => setDrawer({ mode: 'edit', curriculum })}
          />
        )}
        {!result.error ? (
          <Pagination filters={filters} total={total} totalPages={totalPages} />
        ) : null}
      </div>
      {drawer ? (
        <Drawer
          drawer={drawer}
          programs={programs}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </div>
  );
}

function Toolbar({
  filters,
  programs,
}: {
  filters: Filters;
  programs: EducationProgram[];
}) {
  return (
    <div className="mx-5 flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status kurikulum
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            ['Semua', undefined],
            ['Aktif', 'ACTIVE'],
            ['Nonaktif', 'INACTIVE'],
          ].map(([label, value]) => (
            <Link
              key={label}
              href={href({
                ...filters,
                status: value as Filters['status'],
                page: 1,
              })}
              className={
                filters.status === value || (!filters.status && !value)
                  ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
                  : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700'
              }
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <form
        action="/kurikulum"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <select
          name="educationProgramId"
          defaultValue={filters.educationProgramId ?? ''}
          aria-label="Filter program"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-64"
        >
          <option value="">Semua program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name} ({program.code})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          Terapkan
        </button>
        <Link
          href="/kurikulum"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700"
        >
          Reset
        </Link>
      </form>
    </div>
  );
}

function Table({
  curricula,
  programNames,
  onEdit,
}: {
  curricula: Curriculum[];
  programNames: Map<string, string>;
  onEdit: (item: Curriculum) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Kurikulum',
                'Program terkait',
                'Periode / versi',
                'Status',
                'Terakhir diubah',
                'Aksi',
              ].map((item) => (
                <th key={item} className="px-4 py-3">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {curricula.map((item) => (
              <Row
                key={item.id}
                item={item}
                programNames={programNames}
                onEdit={onEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {curricula.map((item) => (
          <Card
            key={item.id}
            item={item}
            programNames={programNames}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  );
}
function Row({
  item,
  programNames,
  onEdit,
}: {
  item: Curriculum;
  programNames: Map<string, string>;
  onEdit: (item: Curriculum) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-4 py-3">
        <p className="font-semibold text-slate-950">{item.name}</p>
        <p className="mt-1 text-xs text-slate-500">Versi {item.version}</p>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {programNames.get(item.educationProgramId) ?? 'Program tidak terbaca'}
      </td>
      <td className="px-4 py-3 text-slate-600">
        {item.effectiveFrom
          ? formatDate(item.effectiveFrom)
          : `Versi ${item.version}`}
      </td>
      <td className="px-4 py-3">
        <Status item={item} />
      </td>
      <td className="px-4 py-3 text-slate-600">{formatDate(item.updatedAt)}</td>
      <td className="px-4 py-3">
        <Actions item={item} onEdit={() => onEdit(item)} />
      </td>
    </tr>
  );
}
function Card({
  item,
  programNames,
  onEdit,
}: {
  item: Curriculum;
  programNames: Map<string, string>;
  onEdit: (item: Curriculum) => void;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">{item.name}</p>
          <p className="mt-1 text-xs text-slate-500">Versi {item.version}</p>
        </div>
        <Status item={item} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Program</dt>
          <dd className="mt-1 truncate font-medium text-slate-700">
            {programNames.get(item.educationProgramId) ?? 'Tidak terbaca'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Periode</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {item.effectiveFrom
              ? formatDate(item.effectiveFrom)
              : 'Belum diisi'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(item.updatedAt)}
          </dd>
        </div>
      </dl>
      <Actions item={item} onEdit={() => onEdit(item)} />
    </article>
  );
}
function Status({ item }: { item: Curriculum }) {
  return (
    <StatusBadge tone={item.status === 'ACTIVE' ? 'green' : 'red'}>
      {item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
    </StatusBadge>
  );
}
function Actions({ item, onEdit }: { item: Curriculum; onEdit: () => void }) {
  const [state, action, pending] = useActionState(
    updateCurriculumStatusAction,
    { ok: false, message: null },
  );
  const target = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled
          className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
          title="Detail belum tersedia sebagai workflow Admin"
        >
          Detail
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"
        >
          Ubah
        </button>
        <form action={action}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="name" value={item.name} />
          <input type="hidden" name="status" value={target} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            {pending
              ? 'Memproses...'
              : target === 'ACTIVE'
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

function Drawer({
  drawer,
  programs,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  programs: EducationProgram[];
  onClose: () => void;
}) {
  const edit = drawer.mode === 'edit';
  const item = edit ? drawer.curriculum : null;
  const [state, action, pending] = useActionState(
    edit ? updateCurriculumAction : createCurriculumAction,
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
                {edit ? 'Ubah data' : 'Tambah data'}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                {edit ? 'Ubah kurikulum' : 'Buat kurikulum'}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Gunakan versi untuk membedakan periode kurikulum.
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
            {item ? <input type="hidden" name="id" value={item.id} /> : null}
            <label className="text-sm font-medium text-slate-700">
              Program <span className="text-rose-600">*</span>
              <select
                name="educationProgramId"
                defaultValue={item?.educationProgramId ?? ''}
                required
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Pilih program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} ({program.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Kode / versi kurikulum <span className="text-rose-600">*</span>
              <input
                name="version"
                defaultValue={item?.version ?? ''}
                required
                maxLength={64}
                placeholder="Contoh: 2026.1"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Nama kurikulum <span className="text-rose-600">*</span>
              <input
                name="name"
                defaultValue={item?.name ?? ''}
                required
                maxLength={255}
                placeholder="Contoh: Kurikulum Pendidikan Dasar 2026"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Tanggal efektif
              <input
                type="date"
                name="effectiveFrom"
                defaultValue={item?.effectiveFrom?.slice(0, 10) ?? ''}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue={item?.status ?? 'ACTIVE'}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </label>
            <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">
              Pemetaan mata pelajaran belum termasuk workflow ini dan tidak
              ditampilkan sebagai form palsu.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? 'Menyimpan...' : 'Simpan'}
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
        dari <b className="text-slate-950">{total}</b> kurikulum
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah kurikulum per halaman"
          defaultValue={filters.limit}
          onChange={(event) => {
            window.location.href = href({
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
          href={href({ ...filters, page: Math.max(1, filters.page - 1) })}
          className={
            filters.page > 1
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 font-medium'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-slate-400'
          }
        >
          Sebelumnya
        </Link>
        <span className="px-2">
          {filters.page} / {totalPages}
        </span>
        <Link
          href={href({ ...filters, page: filters.page + 1 })}
          className={
            filters.page < totalPages
              ? 'inline-flex min-h-9 items-center rounded-md border border-slate-300 px-3 font-medium'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-slate-400'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
function href(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.educationProgramId)
    params.set('educationProgramId', filters.educationProgramId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/kurikulum?${query}` : '/kurikulum';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}
