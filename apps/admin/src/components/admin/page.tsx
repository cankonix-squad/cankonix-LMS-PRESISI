import type { ReactNode } from 'react';

export function AdminPage({ children }: { children: ReactNode }) {
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
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
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

export function PrimaryActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </article>
  );
}
