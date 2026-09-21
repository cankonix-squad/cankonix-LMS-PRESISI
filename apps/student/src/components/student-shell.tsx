import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
  { href: '/', label: 'Dashboard & Kelas' },
  { href: '/materi', label: 'Materi & Pertemuan' },
  { href: '/tugas', label: 'Tugas Saya' },
  { href: '/ujian', label: 'Ujian' },
  { href: '/kemajuan', label: 'Kemajuan Belajar' },
];

export function StudentShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-slate-100 sm:pb-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-sky-400 sm:text-xs">
                Lemdiklat Polri
              </span>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Portal Peserta Didik
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                ● Peserta Aktif
              </span>
              <a href="/api/auth/login" className="rounded-full bg-sky-500 px-3 py-1 text-xs font-medium text-slate-950">Masuk</a>
              <a href="/api/auth/logout" className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200">Keluar</a>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-400 sm:text-sm">
            Akses jadwal, materi pembelajaran, kumpulkan tugas, dan pantau
            kemajuan belajar Anda secara mandiri.
          </p>

          {/* Desktop Navigation */}
          <nav className="hidden flex-wrap gap-2 sm:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-400 hover:bg-slate-800 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>

        {children}
      </div>

      {/* Mobile-first bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-slate-800 bg-slate-950/95 px-2 py-2 backdrop-blur sm:hidden">
        {navigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:text-sky-400"
          >
            {item.label}
          </a>
        ))}
      </nav>
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
        'rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-slate-950/20 sm:rounded-3xl sm:p-5',
        className,
      )}
    >
      <div className="mb-4 border-b border-slate-800 pb-3 sm:mb-5 sm:pb-4">
        <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}
