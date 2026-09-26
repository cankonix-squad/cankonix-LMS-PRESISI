'use client';

import type {
  ApiListResponse,
  EducationProgram,
  Organization,
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
    <AdminPage>
      <PageHeader
        eyebrow="Akademik / Program"
        title="Kelola program pendidikan"
        description={
          result.error
            ? 'Data program belum dapat dimuat.'
            : `${total} program ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah program
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <ProgramToolbar filters={filters} organizations={organizations} />
      </div>

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
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="program"
            hrefFor={({ page, limit }) => programHref({ ...filters, page, limit })}
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
    </AdminPage>
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
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={statuses.map((status) => ({
            label: status.label,
            href: programHref({ ...filters, status: status.value, page: 1 }),
            active:
              filters.status === status.value ||
              (!filters.status && !status.value),
          }))}
        />
      }
    >
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
    </FilterToolbar>
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
    <EnterpriseTable
      columns={[
        { label: 'Nama program' },
        { label: 'Kode' },
        { label: 'Organisasi pemilik' },
        { label: 'Jenjang/tipe' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={1060}
      mobile={
        <>
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              organizationNames={organizationNames}
              onEdit={onEdit}
            />
          ))}
        </>
      }
    >
      {programs.map((program) => (
        <tr key={program.id} className="group hover:bg-slate-50/80">
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
          <StickyActionCell>
            <ProgramActions
              program={program}
              onEdit={() => onEdit(program)}
            />
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
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
          <dt className="text-slate-400">Jenjang/tipe</dt>
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
    <div className="flex flex-col gap-2">
      <ActionGroup>
        <ActionButton
          disabled
          title="Detail belum tersedia pada kontrak Admin"
        >
          Detail
        </ActionButton>
        <ActionButton onClick={onEdit}>Edit</ActionButton>
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
      </ActionGroup>
      {state.message ? <ActionMessage state={state} /> : null}
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
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah program' : 'Tambah program'}
      description="Isi kolom wajib dengan data yang mudah dikenali operator."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {program ? <input type="hidden" name="id" value={program.id} /> : null}
        <FormField label="Organisasi pemilik" required>
          <select
            name="organizationId"
            defaultValue={program?.organizationId ?? ''}
            required
            className={enterpriseInputClass}
          >
            <option value="">Pilih organisasi</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Kode program" required>
          <input
            name="code"
            defaultValue={program?.code ?? ''}
            required
            maxLength={64}
            placeholder="Contoh: D1"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Nama program" required>
          <input
            name="name"
            defaultValue={program?.name ?? ''}
            required
            maxLength={255}
            placeholder="Contoh: Program Pendidikan Diploma Satu"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deskripsi">
          <textarea
            name="description"
            defaultValue={program?.description ?? ''}
            rows={4}
            maxLength={1000}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Status" required>
          <select
            name="status"
            defaultValue={program?.status ?? 'ACTIVE'}
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
            pending={isPending}
            submitLabel="Simpan"
          />
        </div>
      </form>
    </EnterpriseDrawer>
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
