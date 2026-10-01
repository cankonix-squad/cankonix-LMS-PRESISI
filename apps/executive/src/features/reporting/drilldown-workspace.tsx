'use client';

import type { DrilldownList, ReportingScopeType } from '@lms/api-client';
import Link from 'next/link';
import {
  EmptyState,
  ErrorState,
  ExecutivePage,
  PageHeader,
  StatusBadge,
} from '@/components/executive-design';
import { DataTable, PaginationBar } from '@/components/executive-table';
import {
  drilldownLevelLabel,
  formatCount,
  formatDateTime,
  formatPercent,
} from '@/lib/executive-labels';

type Filters = {
  level: ReportingScopeType;
  parentId?: string;
  page: number;
  limit: number;
};
type Result = {
  data: DrilldownList | null;
  error: string | null;
};

const scopeTone: Record<string, 'slate' | 'green' | 'blue' | 'amber'> = {
  ORGANIZATION: 'blue',
  PROGRAM: 'green',
  BATCH: 'amber',
  CLASS: 'slate',
  CLASS_SUBJECT: 'slate',
  ENROLLMENT: 'slate',
};

export function DrilldownWorkspace({
  result,
  filters,
}: {
  result: Result;
  filters: Filters;
}) {
  const list = result.data;
  const data = list?.data ?? [];
  const total = list?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, filters.limit)));
  const openableLevels = list?.openableLevels ?? [];
  const trail = list?.trail ?? [];

  return (
    <ExecutivePage>
      <PageHeader
        eyebrow="Executive / Drill-down"
        title="Jelajah Struktur Lembaga"
        description={
          result.error
            ? 'Data hierarchy belum dapat dimuat.'
            : `Level ${drilldownLevelLabel(filters.level)} · ${total} entri ditemukan.`
        }
        actions={
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] px-4 text-sm font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
          >
            ← Kembali ke Dashboard
          </Link>
        }
      />

      {/* Breadcrumb trail */}
      <Breadcrumb trail={trail} level={filters.level} />

      {result.error ? (
        <ErrorState message={result.error} />
      ) : data.length === 0 ? (
        <EmptyState>
          <p className="font-semibold text-white">
            Tidak ada entri pada level ini.
          </p>
          <p className="mt-2">
            Level ini mungkin belum memiliki data anak, atau cakupan pimpinan
            belum mencakup cabang ini.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/drilldown"
              className="inline-flex min-h-10 items-center rounded-md border border-[#2c394b] px-4 font-medium text-slate-300 hover:border-[#c8a45d]/60 hover:text-[#e4c679]"
            >
              Kembali ke akar
            </Link>
          </div>
        </EmptyState>
      ) : (
        <>
          <DrilldownTable items={data} openableLevels={openableLevels} />
          <PaginationBar
            page={filters.page}
            limit={filters.limit}
            total={total}
            totalPages={totalPages}
            itemLabel="entri"
            hrefFor={({ page, limit }) =>
              drilldownHref({ ...filters, page, limit })
            }
          />
        </>
      )}
    </ExecutivePage>
  );
}

function Breadcrumb({
  trail,
  level,
}: {
  trail: Array<{ level: ReportingScopeType; id: string | null }>;
  level: ReportingScopeType;
}) {
  // The trail lists levels above the current one. The current level is appended.
  const crumbs: Array<{ label: string; href?: string }> = [
    { label: 'Nasional', href: '/drilldown' },
  ];

  for (const entry of trail) {
    crumbs.push({
      label: drilldownLevelLabel(entry.level),
      href: entry.id
        ? `/drilldown?level=${entry.level}&parentId=${entry.id}`
        : undefined,
    });
  }

  crumbs.push({ label: drilldownLevelLabel(level) });

  return (
    <nav
      aria-label="Breadcrumb hierarchy"
      className="flex flex-wrap items-center gap-1 rounded-lg border border-[#1e3146] bg-[#0a1a2e] px-4 py-2 text-sm text-slate-400"
    >
      {crumbs.map((crumb, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-slate-600">/</span>}
          {index === crumbs.length - 1 || !crumb.href ? (
            <span
              className={
                index === crumbs.length - 1
                  ? 'font-semibold text-white'
                  : undefined
              }
              aria-current={index === crumbs.length - 1 ? 'page' : undefined}
            >
              {crumb.label}
            </span>
          ) : (
            <Link href={crumb.href} className="transition hover:text-[#e4c679]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function DrilldownTable({
  items,
  openableLevels,
}: {
  items: Array<{
    level: ReportingScopeType;
    id: string;
    name: string | null;
    code: string | null;
    parentId: string | null;
    childCount: number;
    hasChildren: boolean;
    metrics: {
      participants: number;
      averageProgressPercent: number;
      attendancePercentage: number;
      averageFinalScore: number;
      gradedCount: number;
    } | null;
    recalculatedAt: string | null;
  }>;
  openableLevels: ReportingScopeType[];
}) {
  function childHref(itemId: string, childLevel: ReportingScopeType) {
    const params = new URLSearchParams();
    params.set('level', childLevel);
    params.set('parentId', itemId);
    return `/drilldown?${params.toString()}`;
  }

  return (
    <DataTable
      columns={[
        { label: 'Nama' },
        { label: 'Tipe' },
        { label: 'Peserta' },
        { label: 'Progress' },
        { label: 'Kehadiran' },
        { label: 'Nilai rata-rata' },
        { label: 'Anak' },
        { label: 'Aksi' },
      ]}
      minWidth={900}
      colWidths={['22%', '12%', '9%', '9%', '9%', '10%', '7%', '22%']}
      mobile={
        <>
          {items.map((item) => (
            <div key={item.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {item.name ?? `${item.level} ${item.id.slice(0, 8)}`}
                </p>
                <StatusBadge tone={scopeTone[item.level] ?? 'slate'}>
                  {drilldownLevelLabel(item.level)}
                </StatusBadge>
              </div>
              {item.code ? (
                <p className="text-xs text-slate-500">{item.code}</p>
              ) : null}
              {item.metrics ? (
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
              ) : (
                <p className="text-xs text-slate-500">
                  Belum tersedia data reporting
                </p>
              )}
              {item.hasChildren && openableLevels.length > 0 ? (
                <Link
                  href={childHref(item.id, openableLevels[0] ?? item.level)}
                  className="inline-flex min-h-9 items-center rounded-md border border-[#c8a45d]/40 px-3 text-xs font-medium text-[#e4c679] hover:border-[#c8a45d]"
                >
                  Buka ({formatCount(item.childCount)})
                </Link>
              ) : null}
            </div>
          ))}
        </>
      }
    >
      {items.map((item) => (
        <tr key={item.id} className="group transition hover:bg-[#0e2036]">
          <td className="px-4 py-3 text-sm font-medium text-white">
            {item.name ?? `${item.level} ${item.id.slice(0, 8)}`}
            {item.code ? (
              <span className="ml-2 text-xs text-slate-500">{item.code}</span>
            ) : null}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={scopeTone[item.level] ?? 'slate'}>
              {drilldownLevelLabel(item.level)}
            </StatusBadge>
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {item.metrics ? formatCount(item.metrics.participants) : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {item.metrics
              ? formatPercent(item.metrics.averageProgressPercent)
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {item.metrics
              ? formatPercent(item.metrics.attendancePercentage)
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-300">
            {item.metrics && item.metrics.gradedCount > 0
              ? item.metrics.averageFinalScore.toFixed(1)
              : '—'}
          </td>
          <td className="px-4 py-3 text-sm tabular-nums text-slate-400">
            {formatCount(item.childCount)}
          </td>
          <td className="px-4 py-3">
            {item.hasChildren && openableLevels.length > 0 ? (
              <Link
                href={childHref(item.id, openableLevels[0] ?? item.level)}
                className="inline-flex min-h-9 items-center rounded-md border border-[#c8a45d]/40 px-3 text-xs font-medium text-[#e4c679] hover:border-[#c8a45d]"
              >
                Buka
              </Link>
            ) : (
              <span className="text-xs text-slate-600">
                {formatDateTime(item.recalculatedAt)}
              </span>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

function drilldownHref(filters: Filters) {
  const params = new URLSearchParams();
  params.set('level', filters.level);
  if (filters.parentId) params.set('parentId', filters.parentId);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return `/drilldown?${params.toString()}`;
}
