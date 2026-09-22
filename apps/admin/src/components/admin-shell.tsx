import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Dashboard', marker: 'D' },
  { href: '/organisasi', label: 'Organisasi', marker: 'O' },
  { href: '/personel', label: 'Personel', marker: 'P' },
  { href: '/roles', label: 'Role & Permission', marker: 'R' },
  { href: '/assignments', label: 'Assignment & Scope', marker: 'A' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/" className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                Lemdiklat Polri LMS
              </p>
              <h1 className="mt-2 text-lg font-semibold tracking-tight">
                Admin
              </h1>
            </Link>
            <div className="flex items-center gap-2 lg:mt-6">
              <a
                href="/login"
                className="rounded-lg bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950"
              >
                Masuk
              </a>
              <a
                href="/api/auth/logout"
                className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200"
              >
                Keluar
              </a>
            </div>
          </div>

          <nav
            className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Navigasi Admin"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300 transition hover:border-sky-400 hover:bg-slate-900 hover:text-white"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-xs font-semibold text-sky-200">
                  {item.marker}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs leading-5 text-emerald-100 lg:block">
            Permission + Scope enforced by API.
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="border-b border-slate-800 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Foundation
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Admin Operational Console
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Kelola data organisasi, personel, role, permission, assignment,
              dan scope. UI membantu operator memakai API foundation; otorisasi
              tetap ditegakkan oleh backend.
            </p>
          </header>
          {children}
        </div>
      </div>
    </main>
  );
}

export function SectionCard({
  id,
  title,
  description,
  children,
  className,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-lg border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20',
        className,
      )}
    >
      <div className="mb-5 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {children}
    </section>
  );
}
