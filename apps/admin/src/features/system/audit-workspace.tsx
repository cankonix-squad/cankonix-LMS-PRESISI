'use client';

import type { AuditLogList } from '@lms/api-client';
import Link from 'next/link';
import {
  AdminPage,
  EmptyState,
  EnterpriseTable,
  ErrorState,
  FilterToolbar,
  PageHeader,
  PaginationBar,
  StatusBadge,
  StickyActionCell,
} from '@/components/admin';
import {
  actionLabel,
  actorLabel,
  formatAuditDateTime,
  resourceTypeTone,
  snapshotSummary,
} from './audit-labels';

type Filters = {
  action?: string;
  resourceType?: string;
  actor?: string;
  search?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

type Result = {
  data: AuditLogList | null;
  error: string | null;
};

const resourceTypeOptions: Array<{ label: string; value: string }> = [
  { label: 'Semua resource', value: '' },
  { label: 'Organisasi', value: 'organization' },
  { label: 'Program', value: 'education_program' },
  { label: 'Angkatan', value: 'education_batch' },
  { label: 'Kelas', value: 'academic_class' },
  { label: 'Mata Pelajaran', value: 'class_subject' },
  { label: 'Enrollment', value: 'enrollment' },
  { label: 'Pengajar', value: 'educator_assignment' },
  { label: 'Pembelajaran', value: 'learning_activity' },
  { label: 'Ujian/Penilaian', value: 'assessment' },
  { label: 'Kelulusan', value: 'graduation_decision' },
  { label: 'Sertifikat', value: 'certificate' },
  { label: 'Personel', value: 'person' },
  { label: 'Role/Permission', value: 'role' },
  { label: 'Kehadiran', value: 'attendance_session' },
  { label: 'Tugas', value: 'assignment' },
];

export function auditHref(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.action) params.set('action', filters.action);
  if (filters.resourceType) params.set('resourceType', filters.resourceType);
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.search) params.set('search', filters.search);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 20) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return `/audit${qs ? `?${qs}` : ''}`;
}

export function AuditWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const items = result.data?.data ?? [];
  const total = result.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Audit & System / Riwayat Audit"
        title="Riwayat Audit Trail"
        description={
          result.error
            ? 'Data audit belum dapat dimuat.'
            : total > 0
              ? `${total} entri audit ditemukan. Gunakan filter untuk mempersempit pencarian.`
              : 'Menampilkan catatan aktivitas terbaru di sistem.'
        }
      />

      <div className="px-5 pt-1">
        <AuditFilterToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : items.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada entri audit yang cocok.
            </p>
            <p className="mt-2">
              Coba ubah filter actor, resource, atau periode. Audit trail hanya
              mencatat aktivitas setelah fitur audit diaktifkan.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/audit"
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
              >
                Reset filter
              </Link>
            </div>
          </EmptyState>
        ) : (
          <>
            <AuditTable items={items} />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="entri audit"
              hrefFor={({ page, limit }) =>
                auditHref({ ...filters, page, limit })
              }
            />
          </>
        )}
      </div>
    </AdminPage>
  );
}

function AuditFilterToolbar({ filters }: { filters: Filters }) {
  return (
    <FilterToolbar
      label="Filter audit"
      filters={
        <form action="/audit" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="search"
            defaultValue={filters.search ?? ''}
            placeholder="Cari kata kunci..."
            aria-label="Cari"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-48"
          />
          <select
            name="resourceType"
            defaultValue={filters.resourceType ?? ''}
            aria-label="Resource"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-48"
          >
            {resourceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="actor"
            defaultValue={filters.actor ?? ''}
            placeholder="Actor ID"
            aria-label="Actor"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-36"
          />
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ''}
            aria-label="Periode awal"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-44"
          />
          <span className="text-sm text-slate-400">sampai</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ''}
            aria-label="Periode akhir"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-44"
          />
          <button
            type="submit"
            className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Cari
          </button>
          <Link
            href="/audit"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Reset
          </Link>
        </form>
      }
    />
  );
}

function AuditTable({ items }: { items: AuditLogList['data'] }) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Waktu' },
        { label: 'Actor' },
        { label: 'Action' },
        { label: 'Resource' },
        { label: 'Detail', className: 'hidden xl:table-cell' },
        { label: 'IP', className: 'hidden lg:table-cell', sticky: true },
      ]}
      colWidths={['14%', '15%', '20%', '15%', '22%', '14%']}
      minWidth={1100}
      mobile={
        <>
          {items.map((item) => (
            <AuditMobileCard key={item.id} item={item} />
          ))}
        </>
      }
    >
      {items.map((item) => (
        <tr key={item.id} className="group transition hover:bg-slate-50">
          <td className="px-4 py-3 text-xs tabular-nums text-slate-500">
            {formatAuditDateTime(item.createdAt)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-600">
            {actorLabel(item.actorUserAccountId)}
          </td>
          <td className="px-4 py-3 text-sm">
            <StatusBadge tone={resourceTypeTone(item.resourceType)}>
              {actionLabel(item.action)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm text-slate-600">
            {item.resourceId ? (
              <span className="tabular-nums text-xs">
                {item.resourceId.slice(0, 12)}…
              </span>
            ) : (
              '—'
            )}
          </td>
          <td className="hidden px-4 py-3 text-xs text-slate-500 xl:table-cell">
            {snapshotSummary(item.after ?? item.before)}
          </td>
          <StickyActionCell>
            <span className="text-xs tabular-nums text-slate-400">
              {item.ipAddress ?? 'N/A'}
            </span>
          </StickyActionCell>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function AuditMobileCard({ item }: { item: AuditLogList['data'][number] }) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {actionLabel(item.action)}
        </p>
        <StatusBadge tone={resourceTypeTone(item.resourceType)}>
          {item.resourceType}
        </StatusBadge>
      </div>
      <p className="text-xs text-slate-500">
        {formatAuditDateTime(item.createdAt)}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>Actor: {actorLabel(item.actorUserAccountId)}</span>
        {item.resourceId ? (
          <span>ID: {item.resourceId.slice(0, 12)}…</span>
        ) : null}
        {item.ipAddress ? <span>IP: {item.ipAddress}</span> : null}
      </div>
      <p className="text-xs text-slate-400">
        {snapshotSummary(item.after ?? item.before)}
      </p>
    </div>
  );
}
