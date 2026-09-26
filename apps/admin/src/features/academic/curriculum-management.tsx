'use client';

import type {
  ApiListResponse,
  Curriculum,
  EducationProgram,
} from '@lms/api-client';
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
  PrimaryActionButton,
  StatusBadge,
  StickyActionCell,
  enterpriseInputClass,
} from '@/components/admin';
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
    <AdminPage>
      <PageHeader
        eyebrow="Akademik / Kurikulum"
        title="Kelola kurikulum"
        description={
          result.error
            ? 'Data kurikulum belum dapat dimuat.'
            : `${total} kurikulum ditemukan. Gunakan filter program dan status untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Buat kurikulum
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <CurriculumToolbar filters={filters} programs={programs} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : curricula.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada kurikulum yang cocok.
            </p>
            <p className="mt-2">
              Coba ubah filter program atau status.
            </p>
            <Link
              href="/kurikulum"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <CurriculumTable
            curricula={curricula}
            programNames={programNames}
            onEdit={(c) => setDrawer({ mode: 'edit', curriculum: c })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="kurikulum"
            hrefFor={({ page, limit }) => curriculumHref({ ...filters, page, limit })}
          />
        ) : null}
      </div>

      {drawer ? (
        <CurriculumDrawer
          drawer={drawer}
          programs={programs}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function CurriculumToolbar({
  filters,
  programs,
}: {
  filters: Filters;
  programs: EducationProgram[];
}) {
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={[
            { label: 'Semua', value: undefined },
            { label: 'Aktif', value: 'ACTIVE' },
            { label: 'Nonaktif', value: 'INACTIVE' },
          ].map((s) => ({
            label: s.label,
            href: curriculumHref({
              ...filters,
              status: s.value as Filters['status'],
              page: 1,
            }),
            active:
              filters.status === s.value || (!filters.status && !s.value),
          }))}
        />
      }
    >
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
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Terapkan
        </button>
        <Link
          href="/kurikulum"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function CurriculumTable({
  curricula,
  programNames,
  onEdit,
}: {
  curricula: Curriculum[];
  programNames: Map<string, string>;
  onEdit: (item: Curriculum) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Kurikulum' },
        { label: 'Program terkait' },
        { label: 'Periode / versi' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={980}
      mobile={
        <>
          {curricula.map((item) => (
            <CurriculumCard
              key={item.id}
              item={item}
              programNames={programNames}
              onEdit={onEdit}
            />
          ))}
        </>
      }
    >
      {curricula.map((item) => (
        <tr key={item.id} className="group hover:bg-slate-50/80">
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
            <StatusBadge tone={item.status === 'ACTIVE' ? 'green' : 'red'}>
              {item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {formatDate(item.updatedAt)}
          </td>
          <StickyActionCell>
            <CurriculumActions item={item} onEdit={() => onEdit(item)} />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function CurriculumCard({
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
        <StatusBadge tone={item.status === 'ACTIVE' ? 'green' : 'red'}>
          {item.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
        </StatusBadge>
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
      <CurriculumActions item={item} onEdit={() => onEdit(item)} />
    </article>
  );
}

function CurriculumActions({
  item,
  onEdit,
}: {
  item: Curriculum;
  onEdit: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateCurriculumStatusAction,
    { ok: false, message: null },
  );
  const target = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  return (
    <div className="flex flex-col gap-2">
      <ActionGroup>
        <ActionButton
          disabled
          title="Detail belum tersedia sebagai workflow Admin"
        >
          Detail
        </ActionButton>
        <ActionButton onClick={onEdit}>Edit</ActionButton>
        <form action={action}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="name" value={item.name} />
          <input type="hidden" name="status" value={target} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 disabled:opacity-60"
          >
            {pending
              ? 'Memproses...'
              : target === 'ACTIVE'
                ? 'Aktifkan'
                : 'Nonaktifkan'}
          </button>
        </form>
      </ActionGroup>
      {state.message ? <ActionMessage state={state} /> : null}
    </div>
  );
}

function CurriculumDrawer({
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
    <EnterpriseDrawer
      eyebrow={edit ? 'Ubah data' : 'Tambah data'}
      title={edit ? 'Ubah kurikulum' : 'Buat kurikulum'}
      description="Gunakan versi untuk membedakan periode kurikulum."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <FormField label="Program" required>
          <select
            name="educationProgramId"
            defaultValue={item?.educationProgramId ?? ''}
            required
            className={enterpriseInputClass}
          >
            <option value="">Pilih program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Kode / versi kurikulum" required>
          <input
            name="version"
            defaultValue={item?.version ?? ''}
            required
            maxLength={64}
            placeholder="Contoh: 2026.1"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Nama kurikulum" required>
          <input
            name="name"
            defaultValue={item?.name ?? ''}
            required
            maxLength={255}
            placeholder="Nama resmi kurikulum"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Tanggal efektif">
          <input
            name="effectiveFrom"
            type="date"
            defaultValue={
              item?.effectiveFrom
                ? new Date(item.effectiveFrom).toISOString().slice(0, 10)
                : ''
            }
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Status" required>
          <select
            name="status"
            defaultValue={item?.status ?? 'ACTIVE'}
            className={enterpriseInputClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </FormField>
        <ActionMessage state={state} />
        <div className="border-t border-slate-200 pt-4">
          <FormActions
            onCancel={onClose}
            pending={pending}
            submitLabel="Simpan"
          />
        </div>
      </form>
    </EnterpriseDrawer>
  );
}

function curriculumHref(filters: Filters) {
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
