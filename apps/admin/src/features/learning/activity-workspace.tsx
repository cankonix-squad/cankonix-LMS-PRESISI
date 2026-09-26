'use client';

import type {
  LearningActivity,
  LearningActivityType,
  LearningMeeting,
} from '@lms/api-client';
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
  createActivityAction,
  updateActivityAction,
  updateActivityStatusAction,
  type ActivityActionState,
} from './activity-actions';

type Filters = {
  search?: string;
  status?: string;
  page: number;
  limit: number;
};
type Result = {
  data: LearningActivity[] | null;
  error: string | null;
  total: number;
};
type Drawer =
  { mode: 'create' } | { mode: 'edit'; item: LearningActivity } | null;
export function ActivityWorkspace({
  result,
  meetings,
  types,
  filters,
}: {
  result: Result;
  meetings: LearningMeeting[];
  types: LearningActivityType[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const rows = result.data ?? [];
  const total = result.total;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Pembelajaran / Aktivitas"
        title="Kelola aktivitas pembelajaran"
        description={
          result.error
            ? 'Data aktivitas belum dapat dimuat.'
            : `${total} aktivitas ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah aktivitas
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <ActivityToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada aktivitas yang cocok.
            </p>
            <p className="mt-2">Coba ubah pencarian atau filter status.</p>
            <Link
              href="/aktivitas"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <ActivityTable
            rows={rows}
            meetings={meetings}
            onEdit={(item) => setDrawer({ mode: 'edit', item })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="aktivitas"
            hrefFor={({ page, limit }) =>
              activityHref({ ...filters, page, limit })
            }
          />
        ) : null}
      </div>

      {drawer ? (
        <ActivityDrawer
          drawer={drawer}
          meetings={meetings}
          types={types}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function ActivityToolbar({ filters }: { filters: Filters }) {
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
            href: activityHref({
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
        action="/aktivitas"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul aktivitas"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/aktivitas"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}
function ActivityTable({
  rows,
  meetings,
  onEdit,
}: {
  rows: LearningActivity[];
  meetings: LearningMeeting[];
  onEdit: (item: LearningActivity) => void;
}) {
  const meetingNames = new Map(meetings.map((item) => [item.id, item.title]));
  return (
    <EnterpriseTable
      columns={[
        { label: 'Aktivitas' },
        { label: 'Pertemuan / relasi' },
        { label: 'Ketersediaan' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={980}
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
                    {meetingNames.get(item.meetingId) ?? 'Pertemuan tidak terbaca'}
                  </p>
                </div>
                <ActivityStatus status={item.status} />
              </div>
              <p className="text-xs text-slate-500">
                {item.availableFrom
                  ? formatDate(item.availableFrom)
                  : 'Jadwal belum diisi'}
              </p>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-sm font-semibold text-sky-700"
              >
                Edit aktivitas
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
              Urutan {item.sequence}
              {item.required ? ' · Wajib' : ''}
            </p>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {meetingNames.get(item.meetingId) ?? 'Pertemuan tidak terbaca'}
          </td>
          <td className="px-4 py-3 text-slate-600">
            {item.availableFrom
              ? formatDate(item.availableFrom)
              : 'Tanpa tanggal mulai'}
            <br />
            {item.availableUntil
              ? `s/d ${formatDate(item.availableUntil)}`
              : 'Tanpa tanggal selesai'}
          </td>
          <td className="px-4 py-3">
            <ActivityStatus status={item.status} />
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
function ActivityStatus({ status }: { status: string }) {
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
function ActivityDrawer({
  drawer,
  meetings,
  types,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  meetings: LearningMeeting[];
  types: LearningActivityType[];
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const item = isEdit ? drawer.item : null;
  const [state, action, pending] = useActionState<
    ActivityActionState,
    FormData
  >(isEdit ? updateActivityAction : createActivityAction, {
    ok: false,
    message: null,
  });
  const [statusState, statusAction, statusPending] = useActionState<
    ActivityActionState,
    FormData
  >(updateActivityStatusAction, { ok: false, message: null });
  return (
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah aktivitas' : 'Tambah aktivitas'}
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <FormField label="Pertemuan" required>
          <select
            name="meetingId"
            required
            defaultValue={item?.meetingId ?? meetings[0]?.id ?? ''}
            disabled={Boolean(item)}
            className={enterpriseInputClass}
          >
            {meetings.map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tipe aktivitas" required>
          <select
            name="activityTypeId"
            required
            defaultValue={item?.activityTypeId ?? types[0]?.id ?? ''}
            className={enterpriseInputClass}
          >
            {types.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({x.code})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Judul" required>
          <input
            name="title"
            required
            defaultValue={item?.title ?? ''}
            placeholder="Contoh: Tugas harian sesi 1"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Deskripsi / instruksi">
          <textarea
            name="instructions"
            defaultValue={item?.instructions ?? ''}
            rows={4}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Aktivitas wajib">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="required"
              defaultChecked={item?.required ?? false}
            />{' '}
            Aktivitas wajib
          </label>
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Mulai">
            <input
              name="availableFrom"
              type="datetime-local"
              defaultValue={toLocal(item?.availableFrom)}
              className={enterpriseInputClass}
            />
          </FormField>
          <FormField label="Selesai">
            <input
              name="availableUntil"
              type="datetime-local"
              defaultValue={toLocal(item?.availableUntil)}
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
function activityHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/aktivitas?${query}` : '/aktivitas';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
function toLocal(value: string | null | undefined) {
  return value ? value.slice(0, 16) : '';
}
