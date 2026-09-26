'use client';

import type { ExecutiveOverview } from '@lms/api-client';
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
  StatCard,
} from '@/components/admin';
import {
  accessLevelLabel,
  formatCount,
  formatDateTime,
  formatPercent,
  scopeTypeLabel,
  scopeTypeTone,
} from './reporting-labels';

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
  { label: 'Nasional', value: '' },
  { label: 'Organisasi', value: 'ORGANIZATION' },
  { label: 'Program', value: 'PROGRAM' },
  { label: 'Angkatan', value: 'BATCH' },
];

export function ReportingWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const breakdown = result.data?.breakdown;
  const kpis = result.data?.kpis;
  const scope = result.data?.scope;
  const items = breakdown?.data ?? [];
  const total = breakdown?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Reporting / Report Center"
        title="Pusat Laporan Operasional"
        description={
          result.error
            ? 'Data laporan belum dapat dimuat.'
            : scope
              ? `Cakupan ${accessLevelLabel(scope.accessLevel)} · ${formatCount(scope.institutionCount)} institusi · Data per ${formatDateTime(result.data?.generatedAt ?? null)}`
              : 'Memuat ringkasan KPI dan data laporan.'
        }
      />

      {result.error ? (
        <div className="px-5 pb-5">
          <ErrorState message={result.error} />
        </div>
      ) : !kpis ? (
        <div className="px-5 pb-5">
          <EmptyState>
            <p className="font-semibold text-slate-950">
              Data KPI belum tersedia.
            </p>
            <p className="mt-2">
              Coba refresh read model reporting dari halaman metrics atau
              hubungi administrator.
            </p>
          </EmptyState>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="px-5 pt-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Peserta"
                value={formatCount(kpis.participants)}
                note={`${formatCount(kpis.activeParticipants)} aktif`}
              />
              <StatCard
                label="Progress Pembelajaran"
                value={formatPercent(kpis.averageProgressPercent)}
                note={`${formatCount(kpis.programs)} program · ${formatCount(kpis.batches)} angkatan · ${formatCount(kpis.classes)} kelas`}
              />
              <StatCard
                label="Tingkat Kehadiran"
                value={formatPercent(kpis.attendancePercentage)}
                note={`${formatCount(kpis.totalSessions)} sesi`}
              />
              <StatCard
                label="Nilai Akhir Rata-rata"
                value={
                  kpis.gradedCount > 0 ? kpis.averageFinalScore.toFixed(1) : '—'
                }
                note={`${formatCount(kpis.gradedCount)} dinilai${kpis.unapprovedGradeCount > 0 ? ` · ${formatCount(kpis.unapprovedGradeCount)} belum disetujui` : ''}`}
              />
            </div>
          </div>

          {/* Kelulusan KPI Cards */}
          <div className="px-5 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Evaluasi Kelulusan"
                value={formatCount(kpis.graduationEvaluationCount)}
                note={`${formatCount(kpis.graduationEligibleCount)} eligible`}
              />
              <StatCard
                label="Lulusan"
                value={formatCount(kpis.graduationPassCount)}
                note={
                  kpis.graduationApprovedCount > 0
                    ? `${formatCount(kpis.graduationApprovedCount)} disetujui · ${formatCount(kpis.graduationFailCount)} gagal · ${formatCount(kpis.graduationRemedialCount)} remedial`
                    : 'Belum ada keputusan'
                }
              />
              <StatCard
                label="Tingkat Sertifikasi"
                value={formatPercent(kpis.certificationRate)}
                note={`${formatCount(kpis.graduatedCount)} lulus`}
              />
              <StatCard
                label="Withdrawn"
                value={formatCount(kpis.graduationWithdrawnCount)}
                note="Peserta mengundurkan diri"
              />
            </div>
          </div>

          {/* Filter + Table */}
          <div className="px-5 pt-1">
            <ReportingFilterToolbar filters={filters} />
          </div>

          <div className="px-5 pb-5">
            {items.length === 0 ? (
              <EmptyState>
                <p className="font-semibold text-slate-950">
                  Tidak ada data rincian untuk filter ini.
                </p>
                <p className="mt-2">
                  Coba ubah scope, periode, atau gunakan tampilan metrics / tren
                  untuk analisis lain.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link
                    href="/laporan"
                    className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
                  >
                    Reset filter
                  </Link>
                  <Link
                    href="/laporan/metrics"
                    className="inline-flex min-h-10 items-center rounded-md border border-sky-300 px-4 font-medium text-sky-700 hover:bg-sky-50"
                  >
                    Buka metrik detail
                  </Link>
                </div>
              </EmptyState>
            ) : (
              <>
                <BreakdownTable items={items} />
                <PaginationBar
                  page={filters.page}
                  limit={filters.limit}
                  total={total}
                  totalPages={totalPages}
                  itemLabel="institusi"
                  hrefFor={({ page, limit }) =>
                    reportingHref({ ...filters, page, limit })
                  }
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Quick nav to other reporting pages */}
      <div className="px-5 pb-5">
        <div className="rounded-lg border border-sky-100 bg-sky-50 px-5 py-4">
          <p className="text-sm font-semibold text-sky-900">
            Jelajahi laporan lain
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/laporan/metrics"
              className="inline-flex min-h-9 items-center rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              Tabel Metrics
            </Link>
            <Link
              href="/laporan/trend-kelulusan"
              className="inline-flex min-h-9 items-center rounded-md border border-sky-300 bg-white px-3 text-sm font-medium text-sky-700 hover:bg-sky-100"
            >
              Tren Kelulusan
            </Link>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

function ReportingFilterToolbar({ filters }: { filters: Filters }) {
  return (
    <FilterToolbar
      label="Filter laporan"
      filters={
        <form action="/laporan" className="flex flex-wrap items-center gap-2">
          <select
            name="scope"
            defaultValue={filters.scope ?? ''}
            aria-label="Cakupan laporan"
            className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 sm:w-48"
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
            href="/laporan"
            className="inline-flex min-h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"
          >
            Reset
          </Link>
        </form>
      }
    />
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
    <EnterpriseTable
      columns={[
        { label: 'Institusi' },
        { label: 'Tipe' },
        { label: 'Peserta' },
        { label: 'Progress' },
        { label: 'Kehadiran' },
        { label: 'Nilai rata-rata' },
        { label: 'Dinilai' },
        { label: 'Update', className: 'hidden lg:table-cell' },
      ]}
      minWidth={900}
      colWidths={['25%', '10%', '8%', '8%', '8%', '10%', '8%', '23%']}
      mobile={
        <>
          {items.map((item) => (
            <BreakdownMobileCard
              key={`${item.scopeType}-${item.scopeId}`}
              item={item}
            />
          ))}
        </>
      }
    >
      {items.map((item) => (
        <tr
          key={`${item.scopeType}-${item.scopeId}`}
          className="group transition hover:bg-slate-50"
        >
          <td className="px-4 py-3 text-sm font-medium text-slate-950">
            {item.scopeName ?? `${item.scopeType} ${item.scopeId.slice(0, 8)}`}
          </td>
          <td className="px-4 py-3">
            <StatusBadge
              tone={scopeTypeTone(
                item.scopeType as Parameters<typeof scopeTypeTone>[0],
              )}
            >
              {scopeTypeLabel(
                item.scopeType as Parameters<typeof scopeTypeLabel>[0],
              )}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
            {formatCount(item.metrics.participants)}
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
          <td className="hidden px-4 py-3 text-xs text-slate-400 lg:table-cell">
            {formatDateTime(item.recalculatedAt)}
          </td>
        </tr>
      ))}
    </EnterpriseTable>
  );
}

function BreakdownMobileCard({
  item,
}: {
  item: {
    scopeType: string;
    scopeName: string | null;
    metrics: {
      participants: number;
      averageProgressPercent: number;
      attendancePercentage: number;
      averageFinalScore: number;
      gradedCount: number;
    };
    recalculatedAt: string;
  };
}) {
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-950">
          {item.scopeName ?? item.scopeType}
        </p>
        <StatusBadge
          tone={scopeTypeTone(
            item.scopeType as Parameters<typeof scopeTypeTone>[0],
          )}
        >
          {scopeTypeLabel(
            item.scopeType as Parameters<typeof scopeTypeLabel>[0],
          )}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          Peserta: <strong>{formatCount(item.metrics.participants)}</strong>
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
      </div>
      <p className="text-xs text-slate-400">
        Update {formatDateTime(item.recalculatedAt)}
      </p>
    </div>
  );
}

function reportingHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.scopeId) params.set('scopeId', filters.scopeId);
  if (filters.periodFrom) params.set('periodFrom', filters.periodFrom);
  if (filters.periodTo) params.set('periodTo', filters.periodTo);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return `/laporan${qs ? `?${qs}` : ''}`;
}
