'use client';

import type {
  GraduationTrend,
  GraduationTrendGranularity,
} from '@lms/api-client';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  ExecutivePage,
  PageHeader,
  StatCard,
  StatusBadge,
} from '@/components/executive-design';
import { DataTable, FilterToolbar } from '@/components/executive-table';
import {
  accessLevelLabel,
  formatCount,
  formatDateTime,
  formatPercent,
  granularityLabel,
} from '@/lib/executive-labels';

type Filters = {
  scope?: string;
  scopeId?: string;
  level?: string;
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

const scopeOptions = [
  { label: 'Nasional', value: 'NATIONAL' },
  { label: 'Lembaga', value: 'ORGANIZATION' },
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
];

const levelOptions: Array<{ label: string; value: string }> = [
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
  { label: 'Kelas', value: 'CLASS' },
  { label: 'Mata pelajaran', value: 'CLASS_SUBJECT' },
  { label: 'Peserta', value: 'ENROLLMENT' },
];

export function GraduationTrendWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const trend = result.data;
  const points = trend?.trends ?? [];
  const scope = trend?.scope;
  const latest = points.at(-1);

  return (
    <ExecutivePage>
      <PageHeader
        eyebrow="Executive / Tren Kelulusan"
        title="Analisis Tren Kelulusan"
        description={
          result.error
            ? 'Data tren kelulusan belum dapat dimuat.'
            : scope
              ? `Cakupan ${accessLevelLabel(scope.accessLevel)} · Granularitas ${granularityLabel(trend?.granularity ?? 'COHORT')} · Data per ${formatDateTime(trend?.generatedAt ?? null)}`
              : 'Memuat tren kelulusan per periode.'
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
      ) : !trend ? (
        <EmptyState>
          <p className="font-semibold text-white">Data tren belum tersedia.</p>
          <p className="mt-2">
            Read model reporting belum menghasilkan tren untuk parameter ini.
          </p>
        </EmptyState>
      ) : (
        <>
          {/* Summary KPI */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Periode"
              value={formatCount(points.length)}
              note="Jumlah titik data tren"
              accent="default"
            />
            <StatCard
              label="Evaluasi Periode Terbaru"
              value={formatCount(latest?.evaluationCount ?? 0)}
              note={latest?.period ?? 'Belum ada periode'}
              accent="sky"
            />
            <StatCard
              label="Keputusan Lulus Terbaru"
              value={formatCount(latest?.passCount ?? 0)}
              note={`${formatCount(latest?.certificateIssuedCount ?? 0)} sertifikat terbit`}
              accent="emerald"
            />
            <StatCard
              label="Pass Rate Terbaru"
              value={latest ? formatPercent(latest.passRate) : '—'}
              note="Lulus per keputusan yang disetujui"
              accent="gold"
            />
          </div>

          {/* Filter */}
          <div className="pt-1">
            <FilterToolbar filters={trendToolbar(filters)} />
          </div>

          {points.length > 0 ? <GraduationTrendChart points={points} /> : null}

          {/* Trend Table */}
          <div className="pb-5">
            {points.length === 0 ? (
              <EmptyState>
                <p className="font-semibold text-white">
                  Tidak ada data tren untuk filter ini.
                </p>
                <p className="mt-2">
                  Coba ubah granularitas, periode, atau scope.
                </p>
                <Link
                  href="/trend"
                  className="mt-4 inline-flex min-h-10 items-center rounded-md border border-[#2c394b] px-4 font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
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
    </ExecutivePage>
  );
}

function trendToolbar(filters: Filters) {
  return (
    <form method="get" action="/trend" className="flex flex-wrap gap-3">
      <label className="flex flex-col text-xs text-slate-400">
        Granularitas
        <select
          name="granularity"
          defaultValue={filters.granularity ?? 'COHORT'}
          className="mt-1 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        >
          {granularityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        Level analisis
        <select
          name="level"
          defaultValue={filters.level ?? 'BATCH'}
          className="mt-1 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
        >
          {levelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-slate-400">
        Cakupan
        <select
          name="scope"
          defaultValue={filters.scope ?? 'NATIONAL'}
          className="mt-1 rounded-md border border-[#2c394b] bg-[#061524] px-3 py-2 text-sm text-slate-200"
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
        href="/trend"
        className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] bg-transparent px-4 text-sm font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
      >
        Reset
      </Link>
    </form>
  );
}

function GraduationTrendChart({
  points,
}: {
  points: GraduationTrend['trends'];
}) {
  return (
    <section
      aria-labelledby="graduation-chart-title"
      className="rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-5"
    >
      <h2
        id="graduation-chart-title"
        className="text-sm font-semibold text-white"
      >
        Komposisi keputusan per periode
      </h2>
      <p className="mt-1 text-xs text-slate-400">
        Persentase dihitung dari keputusan yang sudah disetujui.
      </p>
      <div
        className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400"
        aria-hidden="true"
      >
        <Legend color="bg-emerald-400" label="Lulus" />
        <Legend color="bg-rose-400" label="Gagal" />
        <Legend color="bg-amber-400" label="Remedial" />
      </div>
      <div
        className="mt-5 space-y-4"
        role="list"
        aria-label="Grafik komposisi kelulusan"
      >
        {points.map((point) => {
          const segments = [
            { label: 'Lulus', value: point.passRate, color: 'bg-emerald-400' },
            { label: 'Gagal', value: point.failRate, color: 'bg-rose-400' },
            {
              label: 'Remedial',
              value: point.remedialRate,
              color: 'bg-amber-400',
            },
          ];
          return (
            <div
              key={point.period}
              role="listitem"
              className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_4rem] sm:items-center sm:gap-4"
            >
              <div>
                <p className="text-sm text-slate-200">{point.period}</p>
                <p className="text-xs text-slate-500">
                  {formatCount(point.approvedCount)} keputusan
                </p>
              </div>
              <div
                className="flex h-4 overflow-hidden rounded-full bg-[#061524]"
                role="img"
                aria-label={`${point.period}: lulus ${formatPercent(point.passRate)}, gagal ${formatPercent(point.failRate)}, remedial ${formatPercent(point.remedialRate)}`}
              >
                {segments.map((segment) => (
                  <span
                    key={segment.label}
                    className={segment.color}
                    style={{ width: `${safePercent(segment.value)}%` }}
                  />
                ))}
              </div>
              <span className="text-left text-xs tabular-nums text-emerald-200 sm:text-right">
                {formatPercent(point.passRate)} lulus
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function safePercent(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
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
    <DataTable
      columns={[
        { label: 'Periode' },
        { label: 'Evaluasi' },
        { label: 'Lulus' },
        { label: 'Gagal' },
        { label: 'Remedial' },
        { label: 'Withdrawn' },
        { label: 'Pass Rate' },
        { label: 'Sertifikasi' },
      ]}
      minWidth={900}
      colWidths={['16%', '9%', '8%', '8%', '9%', '9%', '9%', '32%']}
      mobile={
        <>
          {points.map((point) => (
            <div key={point.period} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {point.period}
                </p>
                <StatusBadge tone={point.passRate >= 50 ? 'green' : 'amber'}>
                  {formatPercent(point.passRate)} lulus
                </StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>
                  Evaluasi:{' '}
                  <strong className="text-white">
                    {formatCount(point.evaluationCount)}
                  </strong>
                </span>
                <span>
                  Lulus:{' '}
                  <strong className="text-white">
                    {formatCount(point.passCount)}
                  </strong>
                </span>
                <span>
                  Gagal:{' '}
                  <strong className="text-white">
                    {formatCount(point.failCount)}
                  </strong>
                </span>
                <span>
                  Remedial:{' '}
                  <strong className="text-white">
                    {formatCount(point.remedialCount)}
                  </strong>
                </span>
                <span>
                  Sertifikasi:{' '}
                  <strong className="text-white">
                    {formatPercent(point.certificationRate)}
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
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatCount(point.evaluationCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-emerald-200">
            {formatCount(point.passCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-rose-200">
            {formatCount(point.failCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-amber-200">
            {formatCount(point.remedialCount)}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatCount(point.withdrawnCount)}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={point.passRate >= 50 ? 'green' : 'amber'}>
              {formatPercent(point.passRate)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {formatPercent(point.certificationRate)}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
