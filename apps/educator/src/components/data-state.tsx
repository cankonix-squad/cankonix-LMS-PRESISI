import type { ReactNode } from 'react';

import type { LoadResult } from '@/lib/api';

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-medium">Data belum dapat dimuat.</p>
      <p className="mt-1 text-amber-100/80">{message}</p>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'blue' | 'amber';
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800 text-slate-200',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    blue: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

/**
 * Renders the three states of a read in one place.
 *
 * `empty` is separate from `error` on purpose: "the API answered, there is
 * simply nothing yet" is a different message to an educator than "the API
 * could not be reached".
 */
export function DataBlock<T>({
  result,
  empty,
  children,
  isEmpty,
}: {
  result: LoadResult<T>;
  empty: string;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
}) {
  if (result.error) return <ErrorState message={result.error} />;
  if (!result.data) return <EmptyState>{empty}</EmptyState>;
  if (isEmpty?.(result.data)) return <EmptyState>{empty}</EmptyState>;
  return <>{children(result.data)}</>;
}

export function FieldLabel({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400';

export const textareaClassName = `${inputClassName} min-h-24`;

export function SubmitButton({
  children,
  disabled,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-xl border border-sky-500/40 bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-400 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Formats a server timestamp, tolerating null and unparseable values. */
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
