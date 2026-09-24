'use client';
import type { Assignment, LearningActivity } from '@lms/api-client';
import { useActionState, useState } from 'react';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  StatusBadge,
} from '@/components/admin-design-system';
import {
  createAdminAssignmentAction,
  updateAdminAssignmentAction,
  updateAdminAssignmentStatusAction,
  type AssignmentActionState,
} from './assignment-actions';
type Filters = {
  search?: string;
  status?: string;
  classSubjectId?: string;
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
  const totalPages = Math.max(1, Math.ceil(result.total / filters.limit));
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Pembelajaran / Tugas
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Kelola tugas pembelajaran
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {result.error
              ? 'Data tugas belum dapat dimuat.'
              : `${result.total} tugas ditemukan.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawer({ mode: 'create' })}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white"
        >
          + Tambah tugas
        </button>
      </header>
      <form
        action="/tugas"
        className="mx-5 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap"
      >
        <input
          type="search"
          name="search"
          defaultValue={filters.search}
          placeholder="Cari judul tugas"
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
          <option>CLOSED</option>
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
          href="/tugas"
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
              Belum ada tugas yang cocok.
            </p>
            <p className="mt-2">Coba ubah pencarian atau filter status.</p>
          </EmptyState>
        ) : (
          <AssignmentTable
            rows={rows}
            activities={activities}
            onEdit={(item) => setDrawer({ mode: 'edit', item })}
          />
        )}
        {!result.error && result.total > 0 ? (
          <Pagination filters={filters} totalPages={totalPages} />
        ) : null}
      </div>
      {drawer ? (
        <AssignmentDrawer
          drawer={drawer}
          activities={activities}
          onClose={() => setDrawer(null)}
        />
      ) : null}
    </div>
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
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Tugas',
                'Aktivitas / relasi',
                'Deadline',
                'Submission',
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
              <tr key={item.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Nilai maksimal {item.maxScore} · {item.attemptsAllowed}{' '}
                    percobaan
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
      </div>
    </div>
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
function Pagination({
  filters,
  totalPages,
}: {
  filters: Filters;
  totalPages: number;
}) {
  const qs = (page: number) =>
    `/tugas?search=${encodeURIComponent(filters.search ?? '')}&status=${encodeURIComponent(filters.status ?? '')}&limit=${filters.limit}&page=${page}`;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
      <span>
        Halaman {filters.page} dari {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={qs(Math.max(1, filters.page - 1))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          Sebelumnya
        </Link>
        <Link
          href={qs(Math.min(totalPages, filters.page + 1))}
          className="rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          Berikutnya
        </Link>
      </div>
    </div>
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
  const item = drawer.mode === 'edit' ? drawer.item : null;
  const [state, action, pending] = useActionState<
    AssignmentActionState,
    FormData
  >(
    drawer.mode === 'edit'
      ? updateAdminAssignmentAction
      : createAdminAssignmentAction,
    { ok: false, message: null },
  );
  const [statusState, statusAction, statusPending] = useActionState<
    AssignmentActionState,
    FormData
  >(updateAdminAssignmentStatusAction, { ok: false, message: null });
  return (
    <div className="fixed inset-0 z-30 bg-slate-950/35 p-4 sm:p-8">
      <div className="ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              Tugas
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {item ? 'Edit tugas' : 'Tambah tugas'}
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
        <form action={action} className="space-y-4 p-5">
          <input type="hidden" name="id" value={item?.id ?? ''} />
          <label className="block text-sm font-medium">
            Aktivitas
            <select
              name="activityId"
              required
              defaultValue={item?.activityId ?? activities[0]?.id ?? ''}
              disabled={Boolean(item)}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            >
              {activities.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
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
            Deskripsi / instruksi
            <textarea
              name="instructions"
              defaultValue={item?.instructions ?? ''}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Deadline
            <input
              name="dueAt"
              type="datetime-local"
              defaultValue={item?.dueAt?.slice(0, 16) ?? ''}
              className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Nilai maksimal
              <input
                name="maxScore"
                type="number"
                min="1"
                defaultValue={item?.maxScore ?? 100}
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
              />
            </label>
            <label className="block text-sm font-medium">
              Jumlah percobaan
              <input
                name="attemptsAllowed"
                type="number"
                min="1"
                defaultValue={item?.attemptsAllowed ?? 1}
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3"
              />
            </label>
          </div>
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
        {item && item.status !== 'ARCHIVED' ? (
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
                <option>CLOSED</option>
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
