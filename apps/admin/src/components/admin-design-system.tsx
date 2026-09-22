import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'slate' | 'green' | 'red' | 'blue' | 'amber';

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
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
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

export function StatusBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  const tones: Record<Tone, string> = {
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-rose-200 bg-rose-50 text-rose-700',
    blue: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  const friendly = toFriendlyError(message);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-semibold">{friendly.title}</p>
      <p className="mt-1 leading-6 text-amber-800">{friendly.description}</p>
      {friendly.detail ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-white px-3 py-2 font-mono text-xs text-amber-800">
          {friendly.detail}
        </p>
      ) : null}
    </div>
  );
}

function toFriendlyError(message: string) {
  if (message.toLowerCase().includes('access denied')) {
    const permission = message.match(/permission\s+([a-z0-9._:-]+)/i)?.[1];
    return {
      title: 'Akses belum tersedia untuk akun ini.',
      description:
        'Hubungi pengelola akses untuk menambahkan permission yang diperlukan, lalu muat ulang halaman setelah assignment aktif.',
      detail: permission ? `Permission diperlukan: ${permission}` : message,
    };
  }

  if (message.toLowerCase().includes('bearer access token is required')) {
    return {
      title: 'Sesi login belum aktif.',
      description:
        'Masuk ulang lewat SSO Admin agar dashboard dapat membaca data protected dari API.',
      detail: null,
    };
  }

  return {
    title: 'Data belum dapat dimuat.',
    description:
      'API belum mengembalikan data yang diminta. Coba muat ulang halaman atau lanjutkan dari menu lain bila pekerjaan mendesak.',
    detail: message,
  };
}
