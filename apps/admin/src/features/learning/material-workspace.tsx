'use client';

import type {
  LearningActivity,
  LearningActivityContent,
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
  createMaterialAction,
  updateMaterialAction,
  updateMaterialStatusAction,
  type MaterialActionState,
} from './material-actions';

type Result<T> = { data: T | null; error: string | null };
type MaterialRow = LearningActivityContent & { activity: LearningActivity };
type Filters = {
  search?: string;
  status?: string;
  page: number;
  limit: number;
};
type Drawer =
  | { mode: 'create'; activity: LearningActivity }
  | { mode: 'edit'; item: MaterialRow }
  | null;

export function MaterialWorkspace({
  result,
  activities,
  filters,
}: {
  result: Result<MaterialRow[]> & { total: number };
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
        eyebrow="Pembelajaran / Materi"
        title="Kelola materi pembelajaran"
        description={
          result.error
            ? 'Data materi belum dapat dimuat.'
            : `${total} materi ditemukan. Gunakan filter untuk mempersempit daftar.`
        }
        actions={
          <PrimaryActionButton
            onClick={() => {
              if (activities[0]) {
                setDrawer({ mode: 'create', activity: activities[0] });
              }
            }}
          >
            + Tambah materi
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pt-1">
        <MaterialToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada materi yang cocok.
            </p>
            <p className="mt-2">
              Materi dikelola di dalam aktivitas pembelajaran. Coba ubah pencarian atau filter status.
            </p>
            <Link
              href="/materi"
              className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Tampilkan semua
            </Link>
          </EmptyState>
        ) : (
          <MaterialTable
            rows={rows}
            onEdit={(item) => setDrawer({ mode: 'edit', item })}
          />
        )}
        {!result.error ? (
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="materi"
            hrefFor={({ page, limit }) =>
              materialHref({ ...filters, page, limit })
            }
          />
        ) : null}
      </div>

      {drawer ? (
        <MaterialDrawer
          drawer={drawer}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </AdminPage>
  );
}

function MaterialToolbar({ filters }: { filters: Filters }) {
  return (
    <FilterToolbar
      label="Filter daftar"
      filters={
        <FilterTabs
          tabs={[
            { label: 'Semua', value: undefined },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Tayang', value: 'PUBLISHED' },
            { label: 'Diganti', value: 'SUPERSEDED' },
            { label: 'Arsip', value: 'ARCHIVED' },
          ].map((s) => ({
            label: s.label,
            href: materialHref({
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
        action="/materi"
        className="flex w-full flex-wrap items-center gap-2 xl:w-auto"
      >
        <input type="hidden" name="status" value={filters.status ?? ''} />
        <input type="hidden" name="limit" value={filters.limit} />
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul materi"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
        />
        <button
          type="submit"
          className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Cari
        </button>
        <Link
          href="/materi"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
        >
          Reset
        </Link>
      </form>
    </FilterToolbar>
  );
}

function MaterialTable({
  rows,
  onEdit,
}: {
  rows: MaterialRow[];
  onEdit: (item: MaterialRow) => void;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Materi' },
        { label: 'Aktivitas' },
        { label: 'Tipe / referensi' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={900}
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
                    {item.activity.title}
                  </p>
                </div>
                <ContentStatus status={item.status} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-slate-400">Tipe</dt>
                  <dd className="mt-1 font-medium text-slate-700">
                    {item.contentType}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400">Diubah</dt>
                  <dd className="mt-1 font-medium text-slate-700">
                    {formatDate(item.updatedAt)}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="text-sm font-semibold text-sky-700"
              >
                Edit materi
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
            <p className="mt-1 text-xs text-slate-500">Versi {item.version}</p>
          </td>
          <td className="px-4 py-3 text-slate-600">{item.activity.title}</td>
          <td className="px-4 py-3 text-slate-600">
            <p>{item.contentType}</p>
            <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
              {item.externalUrl ?? item.objectKey ?? 'Referensi belum diisi'}
            </p>
          </td>
          <td className="px-4 py-3">
            <ContentStatus status={item.status} />
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
function ContentStatus({ status }: { status: string }) {
  return (
    <StatusBadge
      tone={
        status === 'PUBLISHED'
          ? 'green'
          : status === 'ARCHIVED'
            ? 'slate'
            : status === 'SUPERSEDED'
              ? 'amber'
              : 'blue'
      }
    >
      {status}
    </StatusBadge>
  );
}

function MaterialDrawer({
  drawer,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  onClose: () => void;
}) {
  const isEdit = drawer.mode === 'edit';
  const item = isEdit ? drawer.item : null;
  const [state, action, pending] = useActionState<
    MaterialActionState,
    FormData
  >(isEdit ? updateMaterialAction : createMaterialAction, {
    ok: false,
    message: null,
  });
  const [statusState, statusAction, statusPending] = useActionState<
    MaterialActionState,
    FormData
  >(updateMaterialStatusAction, { ok: false, message: null });
  const activity = isEdit ? item!.activity : drawer.activity;
  return (
    <EnterpriseDrawer
      eyebrow={isEdit ? 'Ubah data' : 'Tambah data'}
      title={isEdit ? 'Ubah materi' : 'Tambah materi'}
      description="Referensi file dikelola oleh file service; jangan mengarang object key."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        {item ? <input type="hidden" name="id" value={item.id} /> : null}
        <input type="hidden" name="activityId" value={activity.id} />
        <FormField label="Judul" required>
          <input
            name="title"
            required
            defaultValue={item?.title ?? ''}
            placeholder="Contoh: Modul pengenalan materi"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Tipe materi" required>
          <select
            name="contentType"
            defaultValue={item?.contentType ?? 'LINK'}
            className={enterpriseInputClass}
          >
            <option>TEXT</option>
            <option>LINK</option>
            <option>FILE</option>
            <option>VIDEO</option>
          </select>
        </FormField>
        <FormField label="Link eksternal (bila tersedia)">
          <input
            name="externalUrl"
            type="url"
            defaultValue={item?.externalUrl ?? ''}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="File reference (dari file service)">
          <input
            name="objectKey"
            defaultValue={item?.objectKey ?? ''}
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="MIME type">
          <input
            name="mimeType"
            defaultValue={item?.mimeType ?? ''}
            className={enterpriseInputClass}
          />
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
      {item && item.status !== 'SUPERSEDED' ? (
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
function materialHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `/materi?${query}` : '/materi';
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
