'use client';

import type {
  LearningActivity,
  LearningActivityContent,
  LearningActivityType,
  LearningMeeting,
} from '@lms/api-client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  StatusBadge,
} from '@/components/admin-design-system';
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
  activityTypes: LearningActivityType[];
  meetings: LearningMeeting[];
  filters: Filters;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const rows = result.data ?? [];
  const totalPages = Math.max(1, Math.ceil(result.total / filters.limit));
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Pembelajaran / Materi
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Kelola materi pembelajaran
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error
              ? 'Data materi belum dapat dimuat.'
              : `${result.total} materi ditemukan.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            activities[0] &&
            setDrawer({ mode: 'create', activity: activities[0] })
          }
          disabled={!activities.length}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          + Tambah materi
        </button>
      </header>
      <form
        action="/materi"
        className="mx-5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap"
      >
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul materi"
          className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm sm:w-72"
        />
        <select
          name="status"
          defaultValue={filters.status ?? ''}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="">Semua status</option>
          <option>DRAFT</option>
          <option>PUBLISHED</option>
          <option>SUPERSEDED</option>
          <option>ARCHIVED</option>
        </select>
        <select
          name="limit"
          defaultValue={String(filters.limit)}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <button className="min-h-10 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">
          Terapkan
        </button>
        <Link
          href="/materi"
          className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm"
        >
          Reset
        </Link>
      </form>
      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : rows.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada materi yang cocok.
            </p>
            <p className="mt-2">
              Materi dikelola di dalam aktivitas pembelajaran.
            </p>
          </EmptyState>
        ) : (
          <MaterialTable
            rows={rows}
            onEdit={(item) => setDrawer({ mode: 'edit', item })}
          />
        )}
        {!result.error && result.total > 0 ? (
          <Pagination filters={filters} totalPages={totalPages} />
        ) : null}
      </div>
      {drawer ? (
        <MaterialDrawer drawer={drawer} onClose={() => setDrawer(null)} />
      ) : null}
    </div>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Materi',
                'Aktivitas',
                'Tipe / referensi',
                'Status',
                'Terakhir diubah',
                'Aksi',
              ].map((x) => (
                <th key={x} className="px-4 py-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <MaterialRowView key={item.id} item={item} onEdit={onEdit} />
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((item) => (
          <article key={item.id} className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
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
      </div>
    </div>
  );
}
function MaterialRowView({
  item,
  onEdit,
}: {
  item: MaterialRow;
  onEdit: (item: MaterialRow) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80">
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
      <td className="px-4 py-3 text-slate-600">{formatDate(item.updatedAt)}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="font-semibold text-sky-700"
        >
          Edit
        </button>
      </td>
    </tr>
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
function Pagination({
  filters,
  totalPages,
}: {
  filters: Filters;
  totalPages: number;
}) {
  const qs = (page: number) =>
    `/materi?search=${encodeURIComponent(filters.search ?? '')}&status=${encodeURIComponent(filters.status ?? '')}&limit=${filters.limit}&page=${page}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>
        Halaman {filters.page} dari {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          aria-disabled={filters.page <= 1}
          href={qs(Math.max(1, filters.page - 1))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          Sebelumnya
        </Link>
        <Link
          aria-disabled={filters.page >= totalPages}
          href={qs(Math.min(totalPages, filters.page + 1))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
function MaterialDrawer({
  drawer,
  onClose,
}: {
  drawer: Exclude<Drawer, null>;
  onClose: () => void;
}) {
  const item = drawer.mode === 'edit' ? drawer.item : null;
  const editItem = drawer.mode === 'edit' ? drawer.item : null;
  const [state, action, pending] = useActionState<
    MaterialActionState,
    FormData
  >(drawer.mode === 'edit' ? updateMaterialAction : createMaterialAction, {
    ok: false,
    message: null,
  });
  const [statusState, statusAction, statusPending] = useActionState<
    MaterialActionState,
    FormData
  >(updateMaterialStatusAction, { ok: false, message: null });
  const activity =
    drawer.mode === 'create' ? drawer.activity : editItem!.activity;
  return (
    <div className="fixed inset-0 z-30 bg-slate-950/35 p-4 sm:p-8">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Materi
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {item ? 'Edit materi' : 'Tambah materi'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Referensi file dikelola oleh file service; jangan mengarang object
              key.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500"
          >
            Tutup
          </button>
        </div>
        <form action={action} className="space-y-4 p-5">
          <input type="hidden" name="id" value={item?.id ?? ''} />
          <input type="hidden" name="activityId" value={activity.id} />
          <label className="block text-sm font-medium">
            Judul
            <input
              name="title"
              required
              defaultValue={item?.title ?? ''}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="block text-sm font-medium">
            Tipe materi
            <select
              name="contentType"
              defaultValue={item?.contentType ?? 'LINK'}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            >
              <option>TEXT</option>
              <option>LINK</option>
              <option>FILE</option>
              <option>VIDEO</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Link eksternal (bila tersedia)
            <input
              name="externalUrl"
              type="url"
              defaultValue={item?.externalUrl ?? ''}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="block text-sm font-medium">
            File reference (dari file service)
            <input
              name="objectKey"
              defaultValue={item?.objectKey ?? ''}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="block text-sm font-medium">
            MIME type
            <input
              name="mimeType"
              defaultValue={item?.mimeType ?? ''}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          {state.message ? (
            <p
              className={
                state.ok ? 'text-sm text-emerald-700' : 'text-sm text-rose-700'
              }
            >
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              disabled={pending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              {pending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
        {item && item.status !== 'SUPERSEDED' ? (
          <form action={statusAction} className="border-t border-slate-200 p-5">
            <input type="hidden" name="id" value={item.id} />
            <label className="block text-sm font-medium">
              Ubah status
              <select
                name="status"
                defaultValue={item.status}
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
              >
                <option>DRAFT</option>
                <option>PUBLISHED</option>
                <option>ARCHIVED</option>
              </select>
            </label>
            {statusState.message ? (
              <p className="mt-2 text-sm text-rose-700">
                {statusState.message}
              </p>
            ) : null}
            <button
              disabled={statusPending}
              className="mt-3 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              {statusPending ? 'Memproses…' : 'Simpan status'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}
