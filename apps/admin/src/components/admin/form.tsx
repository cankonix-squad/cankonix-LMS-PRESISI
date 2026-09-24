import type { ReactNode } from 'react';

export function FormPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </aside>
  );
}

export function FormField({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      {required ? <span className="text-rose-600"> *</span> : null}
      {children}
      {helper ? (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

export function FormActions({
  onCancel,
  pending,
  submitLabel,
  pendingLabel = 'Menyimpan...',
}: {
  onCancel: () => void;
  pending?: boolean;
  submitLabel: string;
  pendingLabel?: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Batal
      </button>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}
