'use client';
import type { Assignment, LearningActivity } from '@lms/api-client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  ActionButton,
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
  createAdminAssignmentAction,
  updateAdminAssignmentAction,
  updateAdminAssignmentStatusAction,
  type AssignmentActionState,
} from './assignment-actions';
type Filters = {
  search?: string;
  status?: string;
  page: number;
  limit: number;
};
type Result = {
  data: Assignment[] | null;
  error: string | null;
  total: number;
};
type Drawer = { mode: 'create' } | { mode: 'edit'; item: Assignment } | null;
export function AssignmentWorkspace({
  result,
  activities,
  filters,
}: {
  result: Result;
  activities: LearningActivity[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const rows = result.data ?? [];
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Pembelajaran / Tugas"
        title="Kelola tugas pembelajaran"
        description={
          result.error
            ? 'Data tugas belum dapat dimuat.'
            : `${total} tugas ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah tugas
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <AssignmentToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada tugas yang cocok.
            </p>
            <p className="mt-2">Coba ubah pencarian atau filter status.</p>
            <Link
              href="/tugas"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <AssignmentTable
            rows={rows}
            activities={activities}
            onEdit={(item) => setDrawer({ mode: 'edit', item })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="tugas"
            hrefFor={({ page, limit }) =>
              assignmentHref({ ...filters, page, limit })
            }
          />
        ) : null}
      </div>

      {drawer ? (
        <AssignmentDrawer
          drawer={drawer}
          activities={activities}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function AssignmentToolbar({ filters }: { filters: Filters }) {
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={[
            { label: 'Semua', value: undefined },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Tayang', value: 'PUBLISHED' },
            { label: 'Ditutup', value: 'CLOSED' },
            { label: 'Arsip', value: 'ARCHIVED' },
          ].map((s) => ({
            label: s.label,
            href: assignmentHref({
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
        action="/tugas"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul tugas"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/tugas"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}
function AssignmentTable({
  rows,
  activities,
  onEdit,
}: {
  rows: Assignment[];
  activities: LearningActivity[];
  onEdit: (item: Assignment) => void;
}) {
  const names = new Map(activities.map((item) => [item.id, item.title]));
  return (
    <EnterpriseTable
      columns={[
        { label: 'Tugas' },
        { label: 'Aktivitas / relasi' },
        { label: 'Deadline' },
        { label: 'Submission' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={920}
      mobile={
        <>
          {rows.map((item) => (
            <article key={item.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {names.get(item.activityId) ?? 'Aktivitas tidak terbaca'}
                  </p>
                </div>
                <AssignmentStatus status={item.status} />
              </div>
              <p className="text-xs text-slate-500">
                Deadline:{' '}
                {item.dueAt ? formatDate(item.dueAt) : 'Tidak ditentukan'}
              </p>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-sm font-semibold text-sky-700"
              >
                Edit tugas
              </button>
            </article>
          ))}
        </>
      }
    >
      {rows.map((item) => (
        <tr key={item.id} className="group hover:bg-slate-50/80">
          <td className="px-4 py-3">
            <p className="font-semibold text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              Nilai maksimal {item.maxScore} · {item.attemptsAllowed} percobaan
            </p>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {names.get(item.activityId) ?? 'Aktivitas tidak terbaca'}
          </td>
          <td className="px-4 py-3 text-slate-600">
            {item.dueAt ? formatDate(item.dueAt) : 'Tidak ditentukan'}
          </td>
          <td className="px-4 py-3 text-xs text-slate-400">
            Belum tersedia di kontrak daftar
          </td>
          <td className="px-4 py-3">
            <AssignmentStatus status={item.status} />
          </td>
          <td className="px-4 py-3 text-slate-600">
            {formatDate(item.updatedAt)}
          </td>
          <StickyActionCell>
            <ActionButton onClick={() => onEdit(item)}>Edit</ActionButton>
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}
function AssignmentStatus({ status }: { status: string }) {
  return (
    <StatusBadge
      tone={
        status === 'PUBLISHED'
          ? 'green'
          : status === 'CLOSED'
            ? 'amber'
            : status === 'ARCHIVED'
              ? 'slate'
              : 'blue'
      }
    >
      {status}
    </StatusBadge>
  );
}
function AssignmentDrawer({
  drawer,
  activities,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  activities: LearningActivity[];
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const item = isEdit ? drawer.item : null;
  const [state, action, pending] = useActionState<
    AssignmentActionState,
    FormData
  >(isEdit ? updateAdminAssignmentAction : createAdminAssignmentAction, {
    ok: false,
    message: null,
  });
  const [statusState, statusAction, statusPending] = useActionState<
    AssignmentActionState,
    FormData
  >(updateAdminAssignmentStatusAction, { ok: false, message: null });
  return (
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah tugas' : 'Tambah tugas'}
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <FormField label="Aktivitas" required>
          <select
            name="activityId"
            required
            defaultValue={item?.activityId ?? activities[0]?.id ?? ''}
            disabled={Boolean(item)}
            className={enterpriseInputClass}
          >
            {activities.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Judul" required>
          <input
            name="title"
            required
            defaultValue={item?.title ?? ''}
            placeholder="Contoh: Tugas esai bab 1"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deskripsi / instruksi">
          <textarea
            name="instructions"
            defaultValue={item?.instructions ?? ''}
            rows={5}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deadline">
          <input
            name="dueAt"
            type="datetime-local"
            defaultValue={item?.dueAt?.slice(0, 16) ?? ''}
            className={enterpriseInputClass}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nilai maksimal">
            <input
              name="maxScore"
              type="number"
              min="1"
              defaultValue={item?.maxScore ?? 100}
              className={enterpriseInputClass}
            />
          </FormField>
          <FormField label="Jumlah percobaan">
            <input
              name="attemptsAllowed"
              type="number"
              min="1"
              defaultValue={item?.attemptsAllowed ?? 1}
              className={enterpriseInputClass}
            />
          </FormField>
        </div>
        <ActionMessage state={state} />
        <div className="border-t border-slate-200 pt-4">
          <FormActions
            onCancel={onClose}
            pending={pending}
            submitLabel="Simpan"
          />
        </div>
      </form>
      {item && item.status !== 'ARCHIVED' ? (
        <form action={statusAction} className="border-t border-slate-200 pt-4">
          <input type="hidden" name="id" value={item.id} />
          <FormField label="Ubah status">
            <select
              name="status"
              defaultValue={item.status}
              className={enterpriseInputClass}
            >
              <option>DRAFT</option>
              <option>PUBLISHED</option>
              <option>CLOSED</option>
              <option>ARCHIVED</option>
            </select>
          </FormField>
          {statusState.message ? (
            <p className="mt-2 text-sm text-rose-700">{statusState.message}</p>
          ) : null}
          <div className="mt-3">
            <button
              type="submit"
              disabled={statusPending}
              className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusPending ? 'Memproses…' : 'Simpan status'}
            </button>
          </div>
        </form>
      ) : null}
    </EnterpriseDrawer>
  );
}
function assignmentHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/tugas?${query}` : '/tugas';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
