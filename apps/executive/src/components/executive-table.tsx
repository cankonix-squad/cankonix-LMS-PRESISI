import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function FilterToolbar({
  label = 'Filter laporan',
  filters,
  children,
}: {
  label?: string;
  filters: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#1e3146] bg-[#0a1a2e] p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {filters}
      </div>
      {children ? <div className="w-full xl:w-auto">{children}</div> : null}
    </div>
  );
}

export function FilterTabs({
  tabs,
}: {
  tabs: Array<{ label: string; href: string; active: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={
            tab.active
              ? 'inline-flex min-h-9 items-center rounded-md bg-[#c8a45d] px-3 text-sm font-semibold text-[#071d38]'
              : 'inline-flex min-h-9 items-center rounded-md border border-[#2c394b] bg-transparent px-3 text-sm font-medium text-slate-300 transition hover:border-[#c8a45d]/60 hover:text-[#e4c679]'
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  children,
  minWidth = 900,
  colWidths,
  mobile,
}: {
  columns: Array<{ label: ReactNode; className?: string }>;
  children: ReactNode;
  minWidth?: number;
  colWidths?: string[];
  mobile: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#1e3146] bg-[#0a1a2e] shadow-sm">
      <div className="hidden overflow-x-auto md:block">
        <table
          className="w-full table-fixed text-left text-sm"
          style={{ minWidth }}
        >
          {colWidths ? (
            <colgroup>
              {colWidths.map((width, index) => (
                <col key={`${width}-${index}`} style={{ width }} />
              ))}
            </colgroup>
          ) : null}
          <thead className="border-b border-[#1e3146] bg-[#061524] text-xs font-semibold uppercase tracking-wide text-slate-400">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className={cn('px-4 py-3', column.className)}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3146]">{children}</tbody>
        </table>
      </div>
      <div className="divide-y divide-[#1e3146] md:hidden">{mobile}</div>
    </div>
  );
}

export function PaginationBar({
  page,
  limit,
  total,
  totalPages,
  itemLabel,
  hrefFor,
}: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel: string;
  hrefFor: (next: { page: number; limit: number }) => string;
}) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#1e3146] bg-[#0a1a2e] px-4 py-3 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between">
      <p>
        Menampilkan <span className="font-semibold text-white">{start}</span>
        {' - '}
        <span className="font-semibold text-white">{end}</span> dari{' '}
        <span className="font-semibold text-white">{total}</span> {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Jumlah data per halaman"
          defaultValue={limit}
          onChange={(event) => {
            window.location.href = hrefFor({
              limit: Number(event.target.value),
              page: 1,
            });
          }}
          className="min-h-9 rounded-md border border-[#2c394b] bg-[#061524] px-2 text-sm text-slate-200"
        >
          <option value="10">10 / halaman</option>
          <option value="25">25 / halaman</option>
          <option value="50">50 / halaman</option>
        </select>
        <Link
          href={hrefFor({ page: Math.max(1, page - 1), limit })}
          aria-disabled={!hasPrevious}
          className={
            hasPrevious
              ? 'inline-flex min-h-9 items-center rounded-md border border-[#2c394b] bg-transparent px-3 font-medium text-slate-300 transition hover:border-[#c8a45d]/60 hover:text-[#e4c679]'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-[#1e3146] bg-[#061524] px-3 font-medium text-slate-600'
          }
        >
          Sebelumnya
        </Link>
        <span className="px-2 text-slate-400">
          {page} / {totalPages}
        </span>
        <Link
          href={hrefFor({ page: page + 1, limit })}
          aria-disabled={!hasNext}
          className={
            hasNext
              ? 'inline-flex min-h-9 items-center rounded-md border border-[#2c394b] bg-transparent px-3 font-medium text-slate-300 transition hover:border-[#c8a45d]/60 hover:text-[#e4c679]'
              : 'pointer-events-none inline-flex min-h-9 items-center rounded-md border border-[#1e3146] bg-[#061524] px-3 font-medium text-slate-600'
          }
        >
          Berikutnya
        </Link>
      </div>
    </div>
  );
}
