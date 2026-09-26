'use client';

import type {
  GraduationTrend,
  GraduationTrendGranularity,
} from '@lms/api-client';
import Link from 'next/link';
import {
  AdminPage,
  EmptyState,
  EnterpriseTable,
  ErrorState,
  FilterToolbar,
  PageHeader,
  StatCard,
} from '@/components/admin';
import {
  accessLevelLabel,
  formatCount,
  formatDateTime,
  formatPercent,
  granularityLabel,
} from './reporting-labels';

type Filters = {
  scope?: string;
  scopeId?: string;
  granularity?: GraduationTrendGranularity;
  periodFrom?: string;
  periodTo?: string;
};
type Result = {
  data: GraduationTrend | null;
  error: string | null;
};

const granularityOptions: Array<{
  label: string;
  value: GraduationTrendGranularity;
}> = [
  { label: 'Cohort', value: 'COHORT' },
  { label: 'Tahunan', value: 'YEAR' },
  { label: 'Triwulan', value: 'QUARTER' },
  { label: 'Bulanan', value: 'MONTH' },
];

export function ReportingTrendWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const trend = result.data;
  const points = trend?.trends ?? [];
  const scope = trend?.scope;

  // Compute summary from all points
  const totalEval = points.reduce((sum, p) => sum + p.evaluationCount, 0);
  const totalPass = points.reduce((sum, p) => sum + p.passCount, 0);
  const totalApproved = points.reduce((sum, p) => sum + p.approvedCount, 0);
  const totalCerts = points.reduce(
    (sum, p) => sum + p.certificateIssuedCount,
    0,
  );

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Reporting / Tren Kelulusan"
        title="Analisis Tren Kelulusan"
        description={
          result.error
            ? 'Data tren kelulusan belum dapat dimuat.'
            : scope
              ? `Cakupan ${accessLevelLabel(scope.accessLevel)} · Granularitas ${granularityLabel(trend?.granularity ?? 'COHORT')} · Data per ${formatDateTime(trend?.generatedAt ?? null)}`
              : 'Memuat data tren kelulusan per periode.'
        }
      />

      {result.error ? (
        <div className="px-5 pb-5">
          <ErrorState message={result.error} />
        </div>
      ) : !trend ? (
        <div className="px-5 pb-5">
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Data tren belum tersedia.
            </p>
            <p className="mt-2">
              Coba refresh read model reporting atau hubungi administrator.
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Summary KPI */}
          <div className="px-5 pt-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Periode"
                value={formatCount(points.length)}
                note="Jumlah titik data tren"
              />
              <StatCard
                label="Total Evaluasi"
                value={formatCount(totalEval)}
                note={`${formatCount(totalApproved)} disetujui`}
              />
              <StatCard
                label="Total Lulus"
                value={formatCount(totalPass)}
                note={`${formatCount(totalCerts)} tersertifikasi`}
              />
              <StatCard
                label="Rata-rata Pass Rate"
                value={
                  points.length > 0
                    ? formatPercent(
                        points.reduce((sum, p) => sum + p.passRate, 0) /
                          points.length,
                      )
                    : '—'
                }
                note="Rata-rata seluruh periode"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="px-5 pt-1">
            <TrendToolbar filters={filters} />
          </div>

          {/* Trend Table */}
          <div className="px-5 pb-5">
            {points.length === 0 ? (
              <EmptyState>
                <p className="font-semibold text-slate-950">
                  Tidak ada data tren untuk filter ini.
                </p>
                <p className="mt-2">
                  Coba ubah granularitas, periode, atau scope.
                </p>
                <Link
                  href="/laporan/trend-kelulusan"
                  className="mt-4 inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                >
                  Reset filter
                </Link>
              </EmptyState>
            ) : (
              <TrendTable points={points} />
            )}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="px-5 pb-5">
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-5 py-4">
          <p className="text-sm font-semibold text-sky-900">
            Jelajahi laporan lain
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/laporan"
              className="inline-flex min-h-9 items-center rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              Report Center
            </Link>
            <Link
              href="/laporan/metrics"
              className="inline-flex min-h-9 items-center rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              Tabel Metrics
            </Link>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

function TrendToolbar({ filters }: { filters: Filters }) {
  const scopeOptions = [
    { label: 'Nasional', value: '' },
    { label: 'Organisasi', value: 'ORGANIZATION' },
    { label: 'Program', value: 'PROGRAM' },
    { label: 'Angkatan', value: 'BATCH' },
  ];

  return (
    <FilterToolbar
      label="Filter tren"
      filters={
        <form
          action="/laporan/trend-kelulusan"
          className="flex flex-wrap items-center gap-2"
        >
          <select
            name="granularity"
            defaultValue={filters.granularity ?? 'COHORT'}
            aria-label="Granularitas"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-40"
          >
            {granularityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            name="scope"
            defaultValue={filters.scope ?? ''}
            aria-label="Cakupan"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-44"
          >
            {scopeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="periodFrom"
            defaultValue={filters.periodFrom ?? ''}
            aria-label="Periode awal"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-44"
          />
          <span className="text-sm text-slate-400">sampai</span>
          <input
            type="date"
            name="periodTo"
            defaultValue={filters.periodTo ?? ''}
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
            href="/laporan/trend-kelulusan"
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

function TrendTable({
  points,
}: {
  points: Array<{
    period: string;
    scopeCount: number;
    evaluationCount: number;
    eligibleCount: number;
    approvedCount: number;
    passCount: number;
    failCount: number;
    remedialCount: number;
    withdrawnCount: number;
    certificateIssuedCount: number;
    passRate: number;
    failRate: number;
    remedialRate: number;
    certificationRate: number;
  }>;
}) {
  return (
    <EnterpriseTable
      columns={[
        { label: 'Periode' },
        { label: 'Evaluasi' },
        { label: 'Lulus' },
        { label: 'Gagal' },
        { label: 'Remedial' },
        { label: 'Withdrawn' },
        { label: 'Pass Rate' },
        { label: 'Sertifikasi' },
        { label: 'Sertifikat diterbitkan' },
      ]}
      minWidth={900}
      colWidths={['16%', '7%', '6%', '5%', '6%', '6%', '7%', '7%', '40%']}
      mobile={
        <>
          {points.map((point) => (
            <TrendMobileCard key={point.period} point={point} />
          ))}
        </>
      }
    >
      {points.map((point) => (
        <tr key={point.period} className="group transition hover:bg-slate-50">
          <td className="px-4 py-3 text-sm font-medium text-slate-950 tabular-nums">
            {point.period}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatCount(point.evaluationCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums font-semibold text-emerald-700">
            {formatCount(point.passCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-rose-700">
            {formatCount(point.failCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-amber-700">
            {formatCount(point.remedialCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-500">
            {formatCount(point.withdrawnCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums font-semibold text-sky-700">
            {formatPercent(point.passRate)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums font-semibold text-emerald-700">
            {formatPercent(point.certificationRate)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-600">
            {formatCount(point.certificateIssuedCount)}
          </td>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function TrendMobileCard({
  point,
}: {
  point: {
    period: string;
    passCount: number;
    failCount: number;
    remedialCount: number;
    passRate: number;
    certificationRate: number;
    certificateIssuedCount: number;
  };
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950 tabular-nums">
          {point.period}
        </p>
        <span className="text-xs font-semibold text-sky-700">
          Pass {formatPercent(point.passRate)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          Lulus:{' '}
          <strong className="text-emerald-700">
            {formatCount(point.passCount)}
          </strong>
        </span>
        <span>
          Gagal:{' '}
          <strong className="text-rose-700">
            {formatCount(point.failCount)}
          </strong>
        </span>
        <span>
          Remedial:{' '}
          <strong className="text-amber-700">
            {formatCount(point.remedialCount)}
          </strong>
        </span>
        <span>
          Sertifikasi: <strong>{formatPercent(point.certificationRate)}</strong>
        </span>
        <span className="col-span-2">
          Sertifikat diterbitkan:{' '}
          <strong>{formatCount(point.certificateIssuedCount)}</strong>
        </span>
      </div>
    </div>
  );
}
