import type { ReactNode } from 'react';
import Link from 'next/link';

export function FilterToolbar({
  label = 'Filter daftar',
  filters,
  children,
}: {
  label?: string;
  filters: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
              ? 'inline-flex min-h-9 items-center rounded-md bg-slate-900 px-3 text-sm font-semibold text-white'
              : 'inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700'
          }
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function Toolbar({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
