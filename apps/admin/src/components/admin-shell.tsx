import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '#organizations', label: 'Organisasi' },
  { href: '#persons', label: 'Personel' },
  { href: '#roles', label: 'Role & Permission' },
  { href: '#assignments', label: 'Assignment & Scope' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/30">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">
                Lemdiklat Polri LMS
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Admin Foundation Console
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Shell operasional untuk data organisasi, personel, role,
                permission, assignment, dan scope. UI ini membantu operator
                memakai API foundation; otorisasi tetap ditegakkan oleh backend.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                Permission + Scope enforced by API
              </div>
              <a
                href="/login"
                className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
              >
                Masuk
              </a>
              <a
                href="/api/auth/logout"
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200"
              >
                Keluar
              </a>
            </div>
          </div>
          <nav
            className="mt-6 flex flex-wrap gap-2"
            aria-label="Navigasi Admin"
          >
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        {children}
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
        'rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20',
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
