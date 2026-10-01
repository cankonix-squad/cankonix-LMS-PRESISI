'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Executive read-only primitives (dark theme).
// These mirror the Admin design system but are tuned for the executive portal.
// All data flows in through props; nothing here fetches or mutates.
// ---------------------------------------------------------------------------

export function ExecutivePage({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[#1e3146] bg-[#0a1a2e] px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c8a45d]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  accent = 'default',
}: {
  label: string;
  value: string;
  note?: string;
  accent?: 'gold' | 'sky' | 'emerald' | 'rose' | 'default';
}) {
  const accentStyles: Record<string, string> = {
    gold: 'border-[#c8a45d]/40 bg-gradient-to-b from-[#1a2433] to-[#0a1a2e]',
    sky: 'border-sky-500/30 bg-gradient-to-b from-[#102538] to-[#0a1a2e]',
    emerald:
      'border-emerald-500/30 bg-gradient-to-b from-[#0f2d2a] to-[#0a1a2e]',
    rose: 'border-rose-500/30 bg-gradient-to-b from-[#2a1720] to-[#0a1a2e]',
    default: 'border-[#1e3146] bg-gradient-to-b from-[#0e2036] to-[#0a1a2e]',
  };

  return (
    <article
      className={cn(
        'rounded-lg border p-5 shadow-sm',
        accentStyles[accent] ?? accentStyles.default,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {note ? <p className="mt-2 text-sm text-slate-500">{note}</p> : null}
    </article>
  );
}

export function StatusBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'blue' | 'amber';
}) {
  const tones: Record<string, string> = {
    slate: 'border-slate-600 bg-slate-700/40 text-slate-200',
    green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    red: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
    blue: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#2c394b] bg-[#0a1a2e] p-8 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="font-semibold">Data belum dapat dimuat.</p>
      <p className="mt-1 leading-6 text-amber-100/80">
        API belum mengembalikan data yang diminta. Coba muat ulang halaman.
      </p>
      <p className="mt-3 rounded-md border border-amber-500/30 bg-[#0a1a2e] px-3 py-2 font-mono text-xs text-amber-200/80">
        {message}
      </p>
    </div>
  );
}
