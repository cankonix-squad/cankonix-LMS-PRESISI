'use client';

import type { GradingScheme, GradingSchemeStatus } from '@lms/api-client';
import { useActionState, useMemo, useState } from 'react';
import {
  ActionMessage,
  AdminPage,
  EmptyState,
  EnterpriseDrawer,
  EnterpriseTable,
  ErrorState,
  FormActions,
  FormField,
  PageHeader,
  PrimaryActionButton,
  StatusBadge,
  StickyActionCell,
  enterpriseInputClass,
} from '@/components/admin';
import {
  createGradingSchemeAction,
} from './grading-actions';
import { gradingStatusLabel, gradingStatusTone } from './assessment-labels';

type Result = {
  data: GradingScheme[] | null;
  error: string | null;
};
type Drawer = { mode: 'create' } | null;

const PAGE_SIZE = 10;

export function GradingWorkspace({
  result,
  subjectsMap,
}: {
  result: Result;
  subjectsMap: Map<string, string>;
}) {
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<GradingSchemeStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const schemes = result.data ?? [];
    const term = search.trim().toLowerCase();
    return schemes.filter((scheme) => {
      const matchesSearch =
        !term ||
        scheme.name.toLowerCase().includes(term) ||
        (subjectsMap.get(scheme.classSubjectId) ?? '')
          .toLowerCase()
          .includes(term);
      const matchesStatus = status === 'all' || scheme.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [result.data, search, status, subjectsMap]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Ujian & Penilaian / Grading"
        title="Kelola skema penilaian"
        description={
          result.error
            ? 'Data skema penilaian belum dapat dimuat.'
            : `${total} skema penilaian ditemukan. Skema menentukan bobot komponen penilaian.`
        }
        actions={
          <PrimaryActionButton onClick={() => setDrawer({ mode: 'create' })}>
            + Tambah skema
          </PrimaryActionButton>
        }
      />

      <div className="px-5 pb-5">
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter daftar
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama skema atau class subject"
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:w-72"
            />
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as GradingSchemeStatus | 'all');
                setPage(1);
              }}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
            >
              <option value="all">Semua status</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Dipublikasikan</option>
              <option value="ARCHIVED">Diarsipkan</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatus('all');
                setPage(1);
              }}
              className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4">
          {result.error ? (
            <ErrorState message={result.error} />
          ) : rows.length === 0 ? (
            <EmptyState>
              <p className="font-semibold text-slate-950">
                Belum ada skema penilaian yang cocok.
              </p>
              <p className="mt-2">
                Skema penilaian dikaitkan dengan class subject. Coba ubah kata pencarian atau filter status.
              </p>
            </EmptyState>
          ) : (
            <SchemeTable rows={rows} subjectsMap={subjectsMap} />
          )}
          {!result.error && total > 0 ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              <p>
                Menampilkan <span className="font-semibold text-slate-950">{(currentPage - 1) * PAGE_SIZE + 1}</span>
                {' - '}
                <span className="font-semibold text-slate-950">{Math.min(total, currentPage * PAGE_SIZE)}</span>{' '}
                dari <span className="font-semibold text-slate-950">{total}</span> skema
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <span className="px-2 text-slate-500">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {drawer ? (
        <GradingDrawer onClose={() => setDrawer(null)} />
      ) : null}
    </AdminPage>
  );
}

function SchemeTable({
  rows,
  subjectsMap,
}: {
  rows: GradingScheme[];
  subjectsMap: Map<string, string>;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Nama skema' },
        { label: 'Class subject' },
        { label: 'Status' },
        { label: 'Terakhir diubah' },
        { label: 'Aksi', sticky: true },
      ]}
      minWidth={880}
      mobile={
        <>
          {rows.map((scheme) => (
            <SchemeCard
              key={scheme.id}
              scheme={scheme}
              subjectsMap={subjectsMap}
            />
          ))}
        </>
      }
    >
      {rows.map((scheme) => (
        <tr key={scheme.id} className="group hover:bg-slate-50/80">
          <td className="px-4 py-3 font-semibold text-slate-950">
            {scheme.name}
          </td>
          <td className="px-4 py-3 text-slate-600">
            {subjectsMap.get(scheme.classSubjectId) ?? scheme.classSubjectId}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={gradingStatusTone(scheme.status)}>
              {gradingStatusLabel(scheme.status)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-slate-600">
            {formatDate(scheme.updatedAt)}
          </td>
          <StickyActionCell>
            <div className="flex justify-end">
              <button
                type="button"
                disabled
                title="Komponen skema belum tersedia kontrak admin"
                className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-400"
              >
                Komponen
              </button>
            </div>
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function SchemeCard({
  scheme,
  subjectsMap,
}: {
  scheme: GradingScheme;
  subjectsMap: Map<string, string>;
}) {
  return (
    <article className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{scheme.name}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {subjectsMap.get(scheme.classSubjectId) ?? scheme.classSubjectId}
          </p>
        </div>
        <StatusBadge tone={gradingStatusTone(scheme.status)}>
          {gradingStatusLabel(scheme.status)}
        </StatusBadge>
      </div>
      <dl className="grid grid-cols-1 gap-3 text-xs">
        <div>
          <dt className="text-slate-400">Diubah</dt>
          <dd className="mt-1 font-medium text-slate-700">
            {formatDate(scheme.updatedAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function GradingDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const [state, action, isPending] = useActionState(
    createGradingSchemeAction,
    { ok: false, message: null },
  );
  return (
    <EnterpriseDrawer
      eyebrow="Tambah data"
      title="Tambah skema penilaian"
      description="Buat skema yang mengikat class subject, lalu tambahkan komponen penilaian secara terpisah."
      onClose={onClose}
    >
      <form action={action} className="space-y-4">
        <FormField
          label="Class subject ID"
          required
          helper="Gunakan UUID class subject dari sistem akademik."
        >
          <input
            name="classSubjectId"
            required
            placeholder="UUID class subject"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Nama skema" required>
          <input
            name="name"
            required
            maxLength={200}
            placeholder="Contoh: Skema Penilaian Hukum Pidana"
            className={enterpriseInputClass}
          />
        </FormField>
        <FormField label="Status" required>
          <select name="status" defaultValue="DRAFT" className={enterpriseInputClass}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Dipublikasikan</option>
            <option value="ARCHIVED">Diarsipkan</option>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}