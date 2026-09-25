'use client';

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
  saveAcademicRecord,
  type AcademicActionState,
} from './academic-actions';

type StatusTone = 'slate' | 'green' | 'red' | 'blue' | 'amber';
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
    <AdminPage>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={
          result
            ? `${total} data ditemukan. Gunakan pencarian dan filter untuk mempersempit daftar.`
            : 'Data belum dapat dimuat dari API.'
        }
        actions={
          <PrimaryActionButton onClick={() => setEditing(null)}>
            + Tambah {config.singular}
          </PrimaryActionButton>
        }
      />
      <section className="px-5">
        <Toolbar kind={kind} filters={filters} />
      </section>
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
    </AdminPage>
  );
}

function Toolbar({
  kind,
  filters,
}: {
  kind: Kind;
  filters: Record<string, string | number | undefined>;
}) {
  const statuses = [
    { label: 'Semua', value: undefined },
    { label: 'Aktif', value: 'ACTIVE' },
    { label: 'Nonaktif', value: 'INACTIVE' },
    { label: 'Arsip', value: 'ARCHIVED' },
    { label: 'Withdrawn', value: 'WITHDRAWN' },
    { label: 'Selesai', value: 'COMPLETED' },
  ];

  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((status) => ({
            label: status.label,
            href: academicHref(kind, {
              ...filters,
              status: status.value,
              page: 1,
            }),
            active:
              filters.status === status.value ||
              (!filters.status && !status.value),
          }))}
        />
      }
    >
      <form
        action={basePath(kind)}
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input
          type="hidden"
          name="status"
          value={String(filters.status ?? '')}
        />
        <input type="hidden" name="limit" value={String(filters.limit ?? 25)} />
        <input
          type="search"
          name="search"
          defaultValue={String(filters.search ?? '')}
          placeholder="Cari kode atau nama"
          className={`${enterpriseInputClass} sm:w-72`}
        />
        <button className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Cari
        </button>
        <Link
          href={basePath(kind)}
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
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
    <EnterpriseTable
      columns={[
        ...config.columns.map(([, label]) => ({ label })),
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={980}
      mobile={
        <>
          {rows.map((row) => (
            <article key={row.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm text-slate-950">
                  {String(row.name ?? row.code ?? row.id)}
                </strong>
                <ValueContent value={row.status} status />
              </div>
              {config.columns
                .filter(([key]) => !['name', 'code', 'status'].includes(key))
                .map(([key, label]) => (
                  <p key={key} className="text-sm text-slate-600">
                    <span className="font-medium text-slate-900">
                      {label}:{' '}
                    </span>
                    {formatValue(row[key])}
                  </p>
                ))}
              <Actions row={row} onEdit={onEdit} />
            </article>
          ))}
        </>
      }
    >
      {rows.map((row) => (
        <tr key={row.id} className="group hover:bg-slate-50/80">
          {config.columns.map(([key]) => (
            <Cell key={key} value={row[key]} status={key === 'status'} />
          ))}
          <StickyActionCell>
            <Actions row={row} onEdit={onEdit} />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function Cell({ value, status }: { value: unknown; status?: boolean }) {
  return (
    <td className="px-4 py-3 align-middle">
      <ValueContent value={value} status={status} />
    </td>
  );
}

function ValueContent({ value, status }: { value: unknown; status?: boolean }) {
  if (status) {
    return (
      <StatusBadge tone={statusTone(value)}>{statusLabel(value)}</StatusBadge>
    );
  }

  return <span className="text-slate-700">{formatValue(value)}</span>;
}

function Actions({ row, onEdit }: { row: Row; onEdit: (row: Row) => void }) {
  return (
    <ActionGroup>
      <ActionButton
        disabled
        title="Detail belum dihubungkan pada workspace ini"
      >
        Detail
      </ActionButton>
      <ActionButton onClick={() => onEdit(row)}>Edit</ActionButton>
    </ActionGroup>
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
    <EnterpriseDrawer
      eyebrow={row ? 'Edit data' : 'Tambah data'}
      title={config.singular}
      description="Kolom bertanda wajib harus diisi. Validasi final tetap dilakukan API."
      onClose={onClose}
    >
      <form action={action} className="space-y-5">
        <input type="hidden" name="entity" value={kind} />
        <input type="hidden" name="id" value={row?.id ?? ''} />
        {config.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={row?.[field.name]}
            options={options[field.name] ?? []}
          />
        ))}
        <ActionMessage state={state} />
        <div className="border-t border-slate-200 pt-4">
          <FormActions onCancel={onClose} submitLabel="Simpan" />
        </div>
      </form>
    </EnterpriseDrawer>
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
    className: enterpriseInputClass,
  };
  if (field.type === 'textarea')
    return (
      <FormField label={field.label} required={field.required}>
        <textarea {...common} rows={4} />
      </FormField>
    );
  if (field.type === 'status')
    return (
      <FormField label={field.label} required={field.required}>
        <select {...common}>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="ARCHIVED">Arsip</option>
          <option value="WITHDRAWN">Withdrawn</option>
          <option value="COMPLETED">Selesai</option>
        </select>
      </FormField>
    );
  if (field.type === 'select')
    return (
      <FormField label={field.label} required={field.required}>
        <select {...common}>
          <option value="">Pilih {field.label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
    );
  return (
    <FormField label={field.label} required={field.required}>
      <input {...common} type={field.type ?? 'text'} />
    </FormField>
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
    <PaginationBar
      page={Math.min(page, pages)}
      limit={limit}
      total={total}
      totalPages={pages}
      itemLabel={configs[kind].singular}
      hrefFor={(next) => academicHref(kind, { ...filters, ...next })}
    />
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

function academicHref(
  kind: Kind,
  params: Record<string, string | number | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${basePath(kind)}?${query}` : basePath(kind);
}

function formatValue(value: unknown) {
  if (value instanceof Date) return value.toLocaleDateString('id-ID');
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString('id-ID');
  }
  return String(value ?? '—');
}

function statusTone(value: unknown): StatusTone {
  if (value === 'ACTIVE' || value === 'COMPLETED') return 'green';
  if (value === 'INACTIVE' || value === 'WITHDRAWN') return 'amber';
  return 'slate';
}

function statusLabel(value: unknown) {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Nonaktif',
    ARCHIVED: 'Arsip',
    WITHDRAWN: 'Withdrawn',
    COMPLETED: 'Selesai',
  };
  return typeof value === 'string' ? (labels[value] ?? value) : '—';
}
