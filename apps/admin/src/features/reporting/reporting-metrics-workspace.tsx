'use client';

import type { ReportingMetricsList, ReportingScopeType } from '@lms/api-client';
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
} from '@/components/admin';
import {
  formatCount,
  formatDateTime,
  formatPercent,
  scopeTypeLabel,
  scopeTypeTone,
} from './reporting-labels';

type Filters = {
  scopeType?: ReportingScopeType;
  organizationId?: string;
  page: number;
  limit: number;
};
type Result = {
  data: ReportingMetricsList | null;
  error: string | null;
};

const scopeTypeOptions: Array<{
  label: string;
  value: ReportingScopeType | '';
}> = [
  { label: 'Semua scope', value: '' },
  { label: 'Organisasi', value: 'ORGANIZATION' },
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
  { label: 'Kelas', value: 'CLASS' },
  { label: 'Mata Pelajaran', value: 'CLASS_SUBJECT' },
  { label: 'Peserta', value: 'ENROLLMENT' },
];

export function ReportingMetricsWorkspace({
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
        eyebrow="Reporting / Metrics"
        title="Data Metrik Per Scope"
        description={
          result.error
            ? 'Data metrik belum dapat dimuat.'
            : `${total} baris metrik ditemukan. Gunakan filter scope untuk mempersempit tampilan.`
        }
      />

      <div className="px-5 pt-1">
        <MetricsToolbar filters={filters} />
      </div>

      <div className="px-5 pb-5">
        {result.error ? (
          <ErrorState message={result.error} />
        ) : items.length === 0 ? (
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Belum ada data metrik yang cocok.
            </p>
            <p className="mt-2">
              Metrik dihitung saat read model reporting di-refresh. Coba ubah
              scope atau refresh laporan dari halaman overview.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/laporan/metrics"
                className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
              >
                Reset filter
              </Link>
              <Link
                href="/laporan"
                className="inline-flex min-h-10 items-center rounded-md border border-sky-300 px-4 font-medium text-sky-700 hover:bg-sky-50"
              >
                Kembali ke overview
              </Link>
            </div>
          </EmptyState>
        ) : (
          <>
            <MetricsTable items={items} />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="baris metrik"
              hrefFor={({ page, limit }) =>
                metricsHref({ ...filters, page, limit })
              }
            />
          </>
        )}
      </div>
    </AdminPage>
  );
}

function MetricsToolbar({ filters }: { filters: Filters }) {
  return (
    <FilterToolbar
      label="Filter metrik"
      filters={
        <form
          action="/laporan/metrics"
          className="flex flex-wrap items-center gap-2"
        >
          <select
            name="scopeType"
            defaultValue={filters.scopeType ?? ''}
            aria-label="Tipe scope"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-48"
          >
            {scopeTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Cari
          </button>
          <Link
            href="/laporan/metrics"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Reset
          </Link>
          <Link
            href="/laporan"
            className="inline-flex min-h-10 items-center rounded-md border border-sky-300 bg-white px-4 text-sm font-medium text-sky-700 hover:bg-sky-50"
          >
            ← Kembali
          </Link>
        </form>
      }
    />
  );
}

function MetricsTable({ items }: { items: ReportingMetricsList['data'] }) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Scope' },
        { label: 'Tipe' },
        { label: 'Peserta' },
        { label: 'Aktif' },
        { label: 'Progress' },
        { label: 'Kehadiran' },
        { label: 'Nilai rata-rata' },
        { label: 'Dinilai' },
        { label: 'Belum disetujui' },
        { label: 'Sesi', className: 'hidden xl:table-cell' },
        { label: 'Update', className: 'hidden lg:table-cell' },
      ]}
      minWidth={1100}
      colWidths={[
        '18%',
        '8%',
        '6%',
        '5%',
        '6%',
        '6%',
        '7%',
        '5%',
        '6%',
        '5%',
        '28%',
      ]}
      mobile={
        <>
          {items.map((item) => (
            <MetricsMobileCard key={item.id} item={item} />
          ))}
        </>
      }
    >
      {items.map((item) => (
        <tr key={item.id} className="group transition hover:bg-slate-50">
          <td className="px-4 py-3 text-sm font-medium text-slate-950">
            {item.scopeName ?? `${item.scopeType} ${item.scopeId.slice(0, 8)}`}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={scopeTypeTone(item.scopeType)}>
              {scopeTypeLabel(item.scopeType)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatCount(item.metrics.participants)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatCount(item.metrics.activeParticipants)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatPercent(item.metrics.averageProgressPercent)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatPercent(item.metrics.attendancePercentage)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {item.metrics.gradedCount > 0
              ? item.metrics.averageFinalScore.toFixed(1)
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-500">
            {formatCount(item.metrics.gradedCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-500">
            {formatCount(item.metrics.unapprovedGradeCount)}
          </td>
          <td className="hidden px-4 py-3 text-sm tabular-nums text-slate-500 xl:table-cell">
            {formatCount(item.metrics.totalSessions)}
          </td>
          <td className="hidden px-4 py-3 text-xs text-slate-400 lg:table-cell">
            {formatDateTime(item.recalculatedAt)}
          </td>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function MetricsMobileCard({
  item,
}: {
  item: ReportingMetricsList['data'][0];
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {item.scopeName ?? item.scopeType}
        </p>
        <StatusBadge tone={scopeTypeTone(item.scopeType)}>
          {scopeTypeLabel(item.scopeType)}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          Peserta: <strong>{formatCount(item.metrics.participants)}</strong>
        </span>
        <span>
          Aktif: <strong>{formatCount(item.metrics.activeParticipants)}</strong>
        </span>
        <span>
          Progress:{' '}
          <strong>{formatPercent(item.metrics.averageProgressPercent)}</strong>
        </span>
        <span>
          Kehadiran:{' '}
          <strong>{formatPercent(item.metrics.attendancePercentage)}</strong>
        </span>
        <span>
          Nilai:{' '}
          <strong>
            {item.metrics.gradedCount > 0
              ? item.metrics.averageFinalScore.toFixed(1)
              : '—'}
          </strong>
        </span>
        <span>
          Dinilai: <strong>{formatCount(item.metrics.gradedCount)}</strong>
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Update {formatDateTime(item.recalculatedAt)}
      </p>
    </div>
  );
}

function metricsHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.scopeType) params.set('scopeType', filters.scopeType);
  if (filters.organizationId)
    params.set('organizationId', filters.organizationId);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 50) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return `/laporan/metrics${qs ? `?${qs}` : ''}`;
}
