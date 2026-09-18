import type { ReactNode } from 'react';

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
  tone?: 'slate' | 'green' | 'red' | 'blue';
}) {
  const tones = {
    slate: 'border-slate-700 bg-slate-800 text-slate-200',
    green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    red: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    blue: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}
