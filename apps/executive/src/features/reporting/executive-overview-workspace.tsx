'use client';

import type { ExecutiveOverview } from '@lms/api-client';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  ExecutivePage,
  PageHeader,
  StatCard,
  StatusBadge,
} from '@/components/executive-design';
import {
  DataTable,
  FilterToolbar,
  PaginationBar,
} from '@/components/executive-table';
import { MetricComparisonChart } from '@/features/reporting/metric-comparison-chart';
import {
  accessLevelLabel,
  formatCount,
  formatDateTime,
  formatPercent,
  scopeTypeLabel,
} from '@/lib/executive-labels';

type Filters = {
  scope?: string;
  scopeId?: string;
  periodFrom?: string;
  periodTo?: string;
  page: number;
  limit: number;
};
type Result = {
  data: ExecutiveOverview | null;
  error: string | null;
};

const scopeOptions = [
  { label: 'Nasional', value: 'NATIONAL' },
  { label: 'Lembaga', value: 'ORGANIZATION' },
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
];

const scopeTone: Record<string, 'slate' | 'green' | 'blue' | 'amber'> = {
  ORGANIZATION: 'blue',
  PROGRAM: 'green',
  BATCH: 'amber',
  CLASS: 'slate',
  CLASS_SUBJECT: 'slate',
  ENROLLMENT: 'slate',
};

export function ExecutiveOverviewWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const overview = result.data;
  const kpis = overview?.kpis;
  const scope = overview?.scope;
  const items = overview?.breakdown?.data ?? [];
  const total = overview?.breakdown?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (filters.limit || 25)));

  return (
    <ExecutivePage>
      <PageHeader
        eyebrow="Executive / Dashboard"
        title="Ringkasan Capaian Pendidikan"
        description={
          result.error
            ? 'Data ringkasan belum dapat dimuat.'
            : scope
              ? `Cakupan ${accessLevelLabel(scope.accessLevel)} · ${formatCount(scope.institutionCount)} institusi · Data per ${formatDateTime(overview?.generatedAt ?? null)}`
              : 'Memuat ringkasan KPI dan daftar institusi.'
        }
        actions={
          <Link
            href="/drilldown"
            className="inline-flex min-h-10 items-center rounded-md bg-[#c8a45d] px-4 text-sm font-semibold text-[#071d38] transition hover:bg-[#e0b963]"
          >
            Jelajahi Drill-down
          </Link>
        }
      />

      {result.error ? (
        <ErrorState message={result.error} />
      ) : !kpis ? (
        <EmptyState>
          <p className="font-semibold text-white">Data KPI belum tersedia.</p>
          <p className="mt-2">
            Read model reporting belum menghasilkan ringkasan untuk cakupan ini.
            Hubungi administrator bila data tidak kunjung tersedia.
          </p>
        </EmptyState>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Peserta"
              value={formatCount(kpis.participants)}
              note={`${formatCount(kpis.activeParticipants)} aktif`}
              accent="sky"
            />
            <StatCard
              label="Progress Pembelajaran"
              value={formatPercent(kpis.averageProgressPercent)}
              note={`${formatCount(kpis.classes)} kelas aktif`}
              accent="gold"
            />
            <StatCard
              label="Kehadiran"
              value={formatPercent(kpis.attendancePercentage)}
              note={`${formatCount(kpis.totalSessions)} sesi`}
              accent="emerald"
            />
            <StatCard
              label="Lulusan"
              value={formatCount(kpis.graduatedCount)}
              note={`Tingkat sertifikasi ${formatPercent(kpis.certificationRate)}`}
              accent="rose"
            />
          </div>

          {/* Filters */}
          <div className="pt-1">
            <FilterToolbar filters={overviewToolbar(filters)}>
              <InfoHelper />
            </FilterToolbar>
          </div>

          <MetricComparisonChart items={items} />

          {/* Breakdown table */}
          <div className="pb-5">
            <BreakdownTable items={items} />
            <PaginationBar
              page={filters.page}
              limit={filters.limit}
              total={total}
              totalPages={totalPages}
              itemLabel="institusi"
              hrefFor={({ page, limit }) =>
                overviewHref({ ...filters, page, limit })
              }
            />
          </div>
        </>
      )}
    </ExecutivePage>
  );
}

function overviewToolbar(filters: Filters) {
  return (
    <form method="get" action="/" className="flex flex-wrap gap-3">
      <label className="flex flex-col text-xs text-slate-400">
        Cakupan
        <select
          name="scope"
          defaultValue={filters.scope ?? 'NATIONAL'}
          className="mt-1 min-w-40 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        >
          {scopeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        ID cakupan
        <input
          type="text"
          name="scopeId"
          defaultValue={filters.scopeId ?? ''}
          placeholder="UUID lembaga/program/angkatan"
          aria-describedby="scope-id-help"
          className="mt-1 min-w-56 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
        />
        <span
          id="scope-id-help"
          className="mt-1 max-w-64 text-[11px] text-slate-500"
        >
          Kosongkan untuk Nasional. Scope selain Nasional memerlukan ID.
        </span>
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        Periode mulai
        <input
          type="date"
          name="periodFrom"
          defaultValue={filters.periodFrom ?? ''}
          className="mt-1 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        Periode akhir
        <input
          type="date"
          name="periodTo"
          defaultValue={filters.periodTo ?? ''}
          className="mt-1 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-10 items-center rounded-md bg-[#c8a45d] px-4 text-sm font-semibold text-[#071d38] transition hover:bg-[#e0b963]"
      >
        Terapkan
      </button>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] bg-transparent px-4 text-sm font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
      >
        Reset
      </Link>
    </form>
  );
}

function InfoHelper() {
  return (
    <p className="max-w-xs text-xs leading-5 text-slate-400">
      Cakupan diizinkan ditentukan server berdasarkan scope pimpinan. Meminta
      cakupan di luar wewenang akan ditolak API.
    </p>
  );
}

function BreakdownTable({
  items,
}: {
  items: Array<{
    scopeType: string;
    scopeId: string;
    scopeName: string | null;
    metrics: {
      participants: number;
      averageProgressPercent: number;
      attendancePercentage: number;
      averageFinalScore: number;
      gradedCount: number;
    };
    recalculatedAt: string;
  }>;
}) {
  return (
    <DataTable
      columns={[
        { label: 'Institusi' },
        { label: 'Tipe' },
        { label: 'Peserta' },
        { label: 'Progress' },
        { label: 'Kehadiran' },
        { label: 'Nilai rata-rata' },
        { label: 'Dinilai' },
        { label: 'Update', className: 'hidden lg:table-cell' },
        { label: 'Aksi' },
      ]}
      minWidth={1020}
      colWidths={['20%', '9%', '7%', '7%', '7%', '9%', '7%', '17%', '17%']}
      mobile={
        <>
          {items.map((item) => (
            <div
              key={`${item.scopeType}-${item.scopeId}`}
              className="space-y-2 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {item.scopeName ?? item.scopeType}
                </p>
                <StatusBadge tone={scopeTone[item.scopeType] ?? 'slate'}>
                  {scopeTypeLabel(item.scopeType as never)}
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>
                  Peserta:{' '}
                  <strong className="text-white">
                    {formatCount(item.metrics.participants)}
                  </strong>
                </span>
                <span>
                  Progress:{' '}
                  <strong className="text-white">
                    {formatPercent(item.metrics.averageProgressPercent)}
                  </strong>
                </span>
                <span>
                  Kehadiran:{' '}
                  <strong className="text-white">
                    {formatPercent(item.metrics.attendancePercentage)}
                  </strong>
                </span>
                <span>
                  Nilai:{' '}
                  <strong className="text-white">
                    {item.metrics.gradedCount > 0
                      ? item.metrics.averageFinalScore.toFixed(1)
                      : '—'}
                  </strong>
                </span>
              </div>
              {nextDrilldownLevel(item.scopeType) ? (
                <Link
                  href={drilldownHref(item.scopeType, item.scopeId)}
                  className="inline-flex min-h-9 items-center rounded-md border border-[#c8a45d]/40 px-3 text-xs font-medium text-[#e4c679] hover:border-[#c8a45d]"
                >
                  Buka rincian
                </Link>
              ) : null}
            </div>
          ))}
        </>
      }
    >
      {items.map((item) => (
        <tr
          key={`${item.scopeType}-${item.scopeId}`}
          className="group transition hover:bg-[#0e2036]"
        >
          <td className="px-4 py-3 text-sm font-medium text-white">
            {item.scopeName ?? `${item.scopeType} ${item.scopeId.slice(0, 8)}`}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={scopeTone[item.scopeType] ?? 'slate'}>
              {scopeTypeLabel(item.scopeType as never)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatCount(item.metrics.participants)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatPercent(item.metrics.averageProgressPercent)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatPercent(item.metrics.attendancePercentage)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {item.metrics.gradedCount > 0
              ? item.metrics.averageFinalScore.toFixed(1)
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-400">
            {formatCount(item.metrics.gradedCount)}
          </td>
          <td className="hidden px-4 py-3 text-xs text-slate-500 lg:table-cell">
            {formatDateTime(item.recalculatedAt)}
          </td>
          <td className="px-4 py-3">
            {nextDrilldownLevel(item.scopeType) ? (
              <Link
                href={drilldownHref(item.scopeType, item.scopeId)}
                className="inline-flex min-h-9 items-center rounded-md border border-[#c8a45d]/40 px-3 text-xs font-medium text-[#e4c679] hover:border-[#c8a45d]"
              >
                Buka rincian
              </Link>
            ) : (
              <span className="text-xs text-slate-500">Lihat drill-down</span>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function nextDrilldownLevel(scopeType: string) {
  const next: Record<string, string> = {
    ORGANIZATION: 'PROGRAM',
    PROGRAM: 'BATCH',
    BATCH: 'CLASS',
    CLASS: 'CLASS_SUBJECT',
    CLASS_SUBJECT: 'ENROLLMENT',
  };
  return next[scopeType];
}

function drilldownHref(scopeType: string, scopeId: string) {
  const params = new URLSearchParams({
    level: nextDrilldownLevel(scopeType) ?? 'ORGANIZATION',
    parentId: scopeId,
  });
  return `/drilldown?${params.toString()}`;
}

function overviewHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.scopeId) params.set('scopeId', filters.scopeId);
  if (filters.periodFrom) params.set('periodFrom', filters.periodFrom);
  if (filters.periodTo) params.set('periodTo', filters.periodTo);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}
