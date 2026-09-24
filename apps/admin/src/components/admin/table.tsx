import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TableColumn = {
  label: ReactNode;
  className?: string;
  sticky?: boolean;
};

export function DataTable({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function EnterpriseTable({
  columns,
  children,
  mobile,
  minWidth = 980,
  colWidths,
}: {
  columns: TableColumn[];
  children: ReactNode;
  mobile: ReactNode;
  minWidth?: number;
  colWidths?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-4 py-3',
                    column.sticky &&
                      'sticky right-0 bg-slate-50 text-right shadow-[-8px_0_16px_rgba(15,23,42,0.05)]',
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">{mobile}</div>
    </div>
  );
}

export function StickyActionCell({ children }: { children: ReactNode }) {
  return (
    <td className="sticky right-0 bg-white px-4 py-3 align-middle shadow-[-8px_0_16px_rgba(15,23,42,0.05)] group-hover:bg-slate-50">
      {children}
    </td>
  );
}
