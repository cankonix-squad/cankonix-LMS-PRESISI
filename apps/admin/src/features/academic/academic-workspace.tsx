'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import {
  EmptyState,
  ErrorState,
  StatusBadge,
} from '@/components/admin-design-system';
import {
  saveAcademicRecord,
  type AcademicActionState,
} from './academic-actions';

type Row = Record<string, unknown> & {
  id: string;
  status?: string;
  updatedAt?: string;
};
type Kind = 'subject' | 'batch' | 'class' | 'enrollment';
type Option = { id: string; label: string };
type Config = {
  title: string;
  eyebrow: string;
  singular: string;
  columns: [string, string][];
  fields: { name: string; label: string; type?: string; required?: boolean }[];
};

const configs: Record<Kind, Config> = {
  subject: {
    title: 'Kelola mata pelajaran',
    eyebrow: 'Akademik / Mata Pelajaran',
    singular: 'mata pelajaran',
    columns: [
      ['code', 'Kode'],
      ['name', 'Nama'],
      ['description', 'Deskripsi'],
      ['status', 'Status'],
      ['updatedAt', 'Terakhir diubah'],
    ],
    fields: [
      { name: 'code', label: 'Kode', required: true },
      { name: 'name', label: 'Nama', required: true },
      { name: 'description', label: 'Deskripsi', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'status' },
    ],
  },
  batch: {
    title: 'Kelola angkatan',
    eyebrow: 'Akademik / Angkatan',
    singular: 'angkatan',
    columns: [
      ['code', 'Kode'],
      ['name', 'Nama'],
      ['educationProgramId', 'Program'],
      ['startDate', 'Periode mulai'],
      ['endDate', 'Periode selesai'],
      ['status', 'Status'],
      ['updatedAt', 'Terakhir diubah'],
    ],
    fields: [
      {
        name: 'educationProgramId',
        label: 'Program',
        type: 'select',
        required: true,
      },
      {
        name: 'curriculumId',
        label: 'Kurikulum',
        type: 'select',
        required: true,
      },
      { name: 'code', label: 'Kode', required: true },
      { name: 'name', label: 'Nama', required: true },
      {
        name: 'startDate',
        label: 'Tanggal mulai',
        type: 'date',
        required: true,
      },
      {
        name: 'endDate',
        label: 'Tanggal selesai',
        type: 'date',
        required: true,
      },
      { name: 'capacity', label: 'Kapasitas', type: 'number' },
      { name: 'status', label: 'Status', type: 'status' },
    ],
  },
  class: {
    title: 'Kelola kelas',
    eyebrow: 'Akademik / Kelas',
    singular: 'kelas',
    columns: [
      ['code', 'Kode'],
      ['name', 'Nama'],
      ['educationBatchId', 'Angkatan'],
      ['capacity', 'Kapasitas'],
      ['status', 'Status'],
      ['updatedAt', 'Terakhir diubah'],
    ],
    fields: [
      {
        name: 'educationBatchId',
        label: 'Angkatan',
        type: 'select',
        required: true,
      },
      { name: 'code', label: 'Kode', required: true },
      { name: 'name', label: 'Nama', required: true },
      { name: 'capacity', label: 'Kapasitas', type: 'number' },
      { name: 'status', label: 'Status', type: 'status' },
    ],
  },
  enrollment: {
    title: 'Kelola enrollment',
    eyebrow: 'Akademik / Enrollment',
    singular: 'enrollment',
    columns: [
      ['personId', 'Peserta'],
      ['enrollmentNumber', 'Identifier'],
      ['educationBatchId', 'Angkatan'],
      ['academicClassId', 'Kelas'],
      ['status', 'Status'],
      ['updatedAt', 'Terakhir diubah'],
    ],
    fields: [
      { name: 'personId', label: 'Peserta', type: 'select', required: true },
      {
        name: 'educationBatchId',
        label: 'Angkatan',
        type: 'select',
        required: true,
      },
      { name: 'academicClassId', label: 'Kelas', type: 'select' },
      { name: 'enrollmentNumber', label: 'Nomor enrollment' },
      { name: 'enrolledAt', label: 'Tanggal masuk', type: 'date' },
      { name: 'status', label: 'Status', type: 'status' },
    ],
  },
};

export function AcademicWorkspace({
  kind,
  result,
  filters,
  options = {},
}: {
  kind: Kind;
  result: { data: Row[]; total: number } | null;
  filters: Record<string, string | number | undefined>;
  options?: Record<string, Option[]>;
}) {
  const config = configs[kind];
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            {config.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            {config.title}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {total} data ditemukan. Gunakan pencarian dan filter untuk
            mempersempit daftar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white"
        >
          + Tambah {config.singular}
        </button>
      </header>
      <Toolbar kind={kind} filters={filters} />
      <div className="px-5 pb-5">
        {!result ? (
          <ErrorState message="Data belum dapat dimuat dari API." />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada {config.singular} yang cocok.
            </p>
            <p className="mt-2">Coba ubah kata pencarian atau filter status.</p>
            <Link
              href={basePath(kind)}
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <Table config={config} rows={rows} onEdit={setEditing} />
        )}
        {result ? (
          <Pagination
            kind={kind}
            filters={filters}
            total={total}
            limit={Number(filters.limit ?? 25)}
          />
        ) : null}
      </div>
      {editing !== undefined ? (
        <Panel
          kind={kind}
          config={config}
          row={editing}
          options={options}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </div>
  );
}

function Toolbar({
  kind,
  filters,
}: {
  kind: Kind;
  filters: Record<string, string | number | undefined>;
}) {
  return (
    <form
      action={basePath(kind)}
      className="mx-5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap"
    >
      <input
        type="search"
        name="search"
        defaultValue={String(filters.search ?? '')}
        placeholder="Cari kode atau nama"
        className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-72"
      />
      <select
        name="status"
        defaultValue={String(filters.status ?? '')}
        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="">Semua status</option>
        <option value="ACTIVE">Aktif</option>
        <option value="INACTIVE">Nonaktif</option>
        <option value="ARCHIVED">Arsip</option>
        <option value="WITHDRAWN">Withdrawn</option>
        <option value="COMPLETED">Selesai</option>
      </select>
      <button className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
        Terapkan
      </button>
      <Link
        href={basePath(kind)}
        className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm"
      >
        Reset
      </Link>
    </form>
  );
}

function Table({
  config,
  rows,
  onEdit,
}: {
  config: Config;
  rows: Row[];
  onEdit: (row: Row) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {config.columns.map(([, label]) => (
                <th key={label} className="px-4 py-3">
                  {label}
                </th>
              ))}
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                {config.columns.map(([key]) => (
                  <Cell key={key} value={row[key]} status={key === 'status'} />
                ))}
                <td className="px-4 py-3">
                  <Actions row={row} onEdit={onEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <article key={row.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <strong>{String(row.name ?? row.code ?? row.id)}</strong>
              <Cell value={row.status} status />
            </div>
            {config.columns
              .filter(([key]) => !['name', 'code', 'status'].includes(key))
              .map(([key, label]) => (
                <p key={key} className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{label}: </span>
                  {String(row[key] ?? '—')}
                </p>
              ))}
            <Actions row={row} onEdit={onEdit} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Cell({ value, status }: { value: unknown; status?: boolean }) {
  if (status)
    return (
      <td className="px-4 py-3">
        <StatusBadge
          tone={
            value === 'ACTIVE'
              ? 'green'
              : value === 'INACTIVE'
                ? 'amber'
                : 'slate'
          }
        >
          {String(value ?? '—')}
        </StatusBadge>
      </td>
    );
  return <td className="px-4 py-3 text-slate-700">{String(value ?? '—')}</td>;
}
function Actions({ row, onEdit }: { row: Row; onEdit: (row: Row) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled
        title="Detail belum dihubungkan pada workspace ini"
        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400"
      >
        Detail
      </button>
      <button
        type="button"
        onClick={() => onEdit(row)}
        className="rounded-md border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-700"
      >
        Edit
      </button>
    </div>
  );
}

function Panel({
  kind,
  config,
  row,
  options,
  onClose,
}: {
  kind: Kind;
  config: Config;
  row: Row | null;
  options: Record<string, Option[]>;
  onClose: () => void;
}) {
  const [state, action] = useActionState<AcademicActionState, FormData>(
    saveAcademicRecord,
    { ok: false, message: null },
  );
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40">
      <aside className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <form action={action} className="space-y-5 p-6">
          <input type="hidden" name="entity" value={kind} />
          <input type="hidden" name="id" value={row?.id ?? ''} />
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
                {row ? 'Edit' : 'Tambah'}
              </p>
              <h2 className="text-xl font-semibold text-slate-950">
                {config.singular}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-500"
            >
              Tutup
            </button>
          </div>
          {config.fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              value={row?.[field.name]}
              options={options[field.name] ?? []}
            />
          ))}
          {state.message ? (
            <p
              className={
                state.ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700'
              }
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white">
              Simpan
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function Field({
  field,
  value,
  options,
}: {
  field: Config['fields'][number];
  value?: unknown;
  options: Option[];
}) {
  const common = {
    name: field.name,
    required: field.required,
    defaultValue: value == null ? '' : String(value),
    className:
      'mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm',
  };
  if (field.type === 'textarea')
    return (
      <label className="block text-sm font-medium">
        {field.label}
        <textarea {...common} rows={4} />
      </label>
    );
  if (field.type === 'status')
    return (
      <label className="block text-sm font-medium">
        {field.label}
        <select {...common}>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="ARCHIVED">Arsip</option>
          <option value="WITHDRAWN">Withdrawn</option>
          <option value="COMPLETED">Selesai</option>
        </select>
      </label>
    );
  if (field.type === 'select')
    return (
      <label className="block text-sm font-medium">
        {field.label}
        <select {...common}>
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  return (
    <label className="block text-sm font-medium">
      {field.label}
      <input {...common} type={field.type ?? 'text'} />
    </label>
  );
}

function Pagination({
  kind,
  filters,
  total,
  limit,
}: {
  kind: Kind;
  filters: Record<string, string | number | undefined>;
  total: number;
  limit: number;
}) {
  const page = Number(filters.page ?? 1);
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Halaman {page} dari {pages}
      </span>
      <div className="flex gap-2">
        <Link
          className="rounded-md border px-3 py-2"
          href={`${basePath(kind)}?page=${Math.max(1, page - 1)}&limit=${limit}`}
        >
          Sebelumnya
        </Link>
        <Link
          className="rounded-md border px-3 py-2"
          href={`${basePath(kind)}?page=${Math.min(pages, page + 1)}&limit=${limit}`}
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
function basePath(kind: Kind) {
  return {
    subject: '/mata-pelajaran',
    batch: '/angkatan',
    class: '/kelas',
    enrollment: '/enrollment',
  }[kind];
}
