'use client';

import type { ExecutiveKpiDetail, KpiTrendPoint } from '@lms/api-client';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  ExecutivePage,
  PageHeader,
  StatCard,
} from '@/components/executive-design';
import {
  DataTable,
  FilterToolbar,
  PaginationBar,
} from '@/components/executive-table';
import {
  accessLevelLabel,
  drilldownLevelLabel,
  formatCount,
  formatPercent,
} from '@/lib/executive-labels';

type Filters = {
  scope?: string;
  scopeId?: string;
  level?: string;
  periodFrom?: string;
  periodTo?: string;
  page: number;
  limit: number;
};
type Result = {
  data: ExecutiveKpiDetail | null;
  error: string | null;
};

const scopeOptions = [
  { label: 'Nasional', value: 'NATIONAL' },
  { label: 'Lembaga', value: 'ORGANIZATION' },
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
];

const levelOptions = [
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
  { label: 'Kelas', value: 'CLASS' },
  { label: 'Mata pelajaran', value: 'CLASS_SUBJECT' },
  { label: 'Peserta', value: 'ENROLLMENT' },
];

export function KpiDetailWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const detail = result.data;
  const summary = detail?.summary;
  const scope = detail?.scope;
  const distributions = detail?.distributions;
  const attention = detail?.attention ?? [];
  const trendPoints = detail?.trends ?? [];
  const total = detail?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, filters.limit)));

  return (
    <ExecutivePage>
      <PageHeader
        eyebrow="Executive / KPI Detail"
        title="Analisis Detail Capaian"
        description={
          result.error
            ? 'Data KPI detail belum dapat dimuat.'
            : scope
              ? `Level ${drilldownLevelLabel(detail?.level ?? 'CLASS')} · Cakupan ${accessLevelLabel(scope.accessLevel)} · ${formatCount(scope.institutionCount)} institusi`
              : 'Memuat distribusi kehadiran, progress, nilai, dan tren.'
        }
        actions={
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] px-4 text-sm font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
          >
            ← Dashboard
          </Link>
        }
      />

      {result.error ? (
        <ErrorState message={result.error} />
      ) : !summary ? (
        <EmptyState>
          <p className="font-semibold text-white">Data KPI belum tersedia.</p>
          <p className="mt-2">
            Read model reporting belum menghasilkan detail KPI untuk parameter
            ini.
          </p>
        </EmptyState>
      ) : (
        <>
          {/* Summary KPI */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Peserta"
              value={formatCount(summary.participants)}
              note={`${formatCount(summary.activeParticipants)} aktif`}
              accent="sky"
            />
            <StatCard
              label="Progress"
              value={formatPercent(summary.averageProgressPercent)}
              note={`${formatCount(summary.classes)} kelas`}
              accent="gold"
            />
            <StatCard
              label="Kehadiran"
              value={formatPercent(summary.attendancePercentage)}
              note={`${formatCount(summary.totalSessions)} sesi`}
              accent="emerald"
            />
            <StatCard
              label="Nilai Rata-rata"
              value={
                summary.gradedCount > 0
                  ? summary.averageFinalScore.toFixed(1)
                  : '—'
              }
              note={`${formatCount(summary.gradedCount)} dinilai`}
              accent="rose"
            />
          </div>

          <FilterToolbar filters={kpiToolbar(filters)}>
            <p className="max-w-xs text-xs leading-5 text-slate-400">
              Scope data dibatasi ulang oleh server berdasarkan permission dan
              scope akun yang masuk.
            </p>
          </FilterToolbar>

          {/* Distributions */}
          {distributions ? (
            <DistributionSection distributions={distributions} />
          ) : null}

          {/* Trend points */}
          {trendPoints.length > 0 ? (
            <TrendSection points={trendPoints} />
          ) : null}

          {/* Attention items */}
          {attention.length > 0 ? <AttentionSection items={attention} /> : null}

          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="entri"
            hrefFor={({ page, limit }) => kpiHref({ ...filters, page, limit })}
          />
        </>
      )}
    </ExecutivePage>
  );
}

function kpiToolbar(filters: Filters) {
  return (
    <form method="get" action="/kpi" className="flex flex-wrap items-end gap-3">
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
          name="scopeId"
          defaultValue={filters.scopeId ?? ''}
          placeholder="UUID lembaga/program/angkatan"
          className="mt-1 min-w-56 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600"
        />
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        Level analisis
        <select
          name="level"
          defaultValue={filters.level ?? 'CLASS'}
          className="mt-1 min-w-40 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        >
          {levelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
        className="inline-flex min-h-10 items-center rounded-md bg-[#c8a45d] px-4 text-sm font-semibold text-[#071d38] hover:bg-[#e0b963]"
      >
        Terapkan
      </button>
      <Link
        href="/kpi"
        className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] px-4 text-sm font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
      >
        Reset
      </Link>
    </form>
  );
}

function DistributionSection({
  distributions,
}: {
  distributions: {
    attendance: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
      participants: number;
    }>;
    learningProgress: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
      participants: number;
    }>;
    finalScore: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
      participants: number;
    }>;
    remedialRisk: Array<{
      label: string;
      min: number;
      max: number;
      count: number;
      participants: number;
    }>;
  };
}) {
  const sections = [
    { label: 'Distribusi Kehadiran', data: distributions.attendance },
    { label: 'Distribusi Progress', data: distributions.learningProgress },
    { label: 'Distribusi Nilai', data: distributions.finalScore },
    { label: 'Risiko Remedial', data: distributions.remedialRisk },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map((section) => (
        <div
          key={section.label}
          className="rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-5"
        >
          <h3 className="text-sm font-semibold text-white">{section.label}</h3>
          <div className="mt-3 space-y-2">
            {section.data.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data.</p>
            ) : (
              section.data.map((bucket, index) => (
                <DistributionBar
                  key={index}
                  label={bucket.label}
                  count={bucket.count}
                  participants={bucket.participants}
                  maxCount={Math.max(...section.data.map((b) => b.count), 1)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DistributionBar({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  participants: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-slate-400">{label}</span>
      <span className="relative h-3 flex-1 rounded-full bg-[#061524]">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#c8a45d]/70"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="w-16 text-right tabular-nums text-slate-300">
        {formatCount(count)}
      </span>
    </div>
  );
}

function TrendSection({ points }: { points: KpiTrendPoint[] }) {
  return (
    <div className="rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-5">
      <h3 className="text-sm font-semibold text-white">Tren KPI per Periode</h3>
      <div className="mt-3">
        <DataTable
          columns={[
            { label: 'Periode' },
            { label: 'Scope' },
            { label: 'Peserta' },
            { label: 'Progress' },
            { label: 'Kehadiran' },
            { label: 'Nilai' },
          ]}
          minWidth={700}
          colWidths={['20%', '12%', '12%', '12%', '12%', '32%']}
          mobile={
            <>
              {points.map((point) => (
                <div key={point.period} className="space-y-2 px-4 py-3">
                  <p className="text-sm font-semibold text-white">
                    {point.period}
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>Scope: {formatCount(point.scopeCount)}</span>
                    <span>
                      Peserta:{' '}
                      <strong className="text-white">
                        {formatCount(point.kpis.participants)}
                      </strong>
                    </span>
                    <span>
                      Progress:{' '}
                      <strong className="text-white">
                        {formatPercent(point.kpis.averageProgressPercent)}
                      </strong>
                    </span>
                    <span>
                      Kehadiran:{' '}
                      <strong className="text-white">
                        {formatPercent(point.kpis.attendancePercentage)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </>
          }
        >
          {points.map((point) => (
            <tr key={point.period} className="transition hover:bg-[#0e2036]">
              <td className="px-4 py-3 text-sm font-medium text-white">
                {point.period}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-400">
                {formatCount(point.scopeCount)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {formatCount(point.kpis.participants)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {formatPercent(point.kpis.averageProgressPercent)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {formatPercent(point.kpis.attendancePercentage)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {typeof point.kpis.averageFinalScore === 'number'
                  ? point.kpis.averageFinalScore.toFixed(1)
                  : '—'}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}

function AttentionSection({
  items,
}: {
  items: Array<{
    scopeType: string;
    scopeId: string;
    scopeName: string | null;
    severity: number;
    reasons: string[];
    metrics: {
      participants: number;
      averageProgressPercent: number;
      attendancePercentage: number;
      averageFinalScore: number;
      gradedCount: number;
    };
  }>;
}) {
  return (
    <div className="rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-5">
      <h3 className="text-sm font-semibold text-amber-200">
        Perhatian Diperlukan
      </h3>
      <p className="mt-1 text-sm text-slate-400">
        Scope dengan performa di bawah ambang batas yang memerlukan perhatian
        pimpinan.
      </p>
      <div className="mt-3">
        <DataTable
          columns={[
            { label: 'Scope' },
            { label: 'Peserta' },
            { label: 'Progress' },
            { label: 'Kehadiran' },
            { label: 'Nilai' },
            { label: 'Alasan' },
          ]}
          minWidth={800}
          colWidths={['20%', '10%', '10%', '10%', '10%', '40%']}
          mobile={
            <>
              {items.map((item) => (
                <div
                  key={`${item.scopeType}-${item.scopeId}`}
                  className="space-y-2 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-white">
                    {item.scopeName ?? item.scopeId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-amber-300">
                    {item.reasons.join(' · ')}
                  </p>
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
                  </div>
                </div>
              ))}
            </>
          }
        >
          {items.map((item) => (
            <tr
              key={`${item.scopeType}-${item.scopeId}`}
              className="transition hover:bg-[#0e2036]"
            >
              <td className="px-4 py-3 text-sm font-medium text-white">
                {item.scopeName ?? item.scopeId.slice(0, 8)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {formatCount(item.metrics.participants)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-amber-200">
                {formatPercent(item.metrics.averageProgressPercent)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-amber-200">
                {formatPercent(item.metrics.attendancePercentage)}
              </td>
              <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
                {item.metrics.gradedCount > 0
                  ? item.metrics.averageFinalScore.toFixed(1)
                  : '—'}
              </td>
              <td className="px-4 py-3 text-sm text-slate-400">
                {item.reasons.join(' · ')}
              </td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}

function kpiHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.scopeId) params.set('scopeId', filters.scopeId);
  if (filters.level) params.set('level', filters.level);
  if (filters.periodFrom) params.set('periodFrom', filters.periodFrom);
  if (filters.periodTo) params.set('periodTo', filters.periodTo);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return `/kpi?${params.toString()}`;
}
