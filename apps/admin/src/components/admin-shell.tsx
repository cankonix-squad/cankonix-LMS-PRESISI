import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const primaryNavigation = [{ href: '/', label: 'Dashboard', marker: 'D' }];

const navigationGroups = [
  {
    label: 'Foundation',
    items: [
      { href: '/organisasi', label: 'Organisasi', marker: 'O' },
      { href: '/personel', label: 'Person & User Account', marker: 'P' },
      { href: '/roles', label: 'Role & Permission', marker: 'R' },
      { href: '/assignments', label: 'Assignment & Scope', marker: 'A' },
    ],
  },
  {
    label: 'Akademik',
    items: [
      { label: 'Program', marker: 'PR' },
      { label: 'Kurikulum', marker: 'K' },
      { label: 'Mata Pelajaran', marker: 'MP' },
      { label: 'Angkatan / Batch', marker: 'B' },
      { label: 'Kelas', marker: 'KL' },
      { label: 'Enrollment', marker: 'E' },
    ],
  },
  {
    label: 'Pembelajaran',
    items: [
      { label: 'Materi', marker: 'M' },
      { label: 'Aktivitas', marker: 'AK' },
      { label: 'Tugas', marker: 'T' },
    ],
  },
  {
    label: 'Ujian & Penilaian',
    items: [
      { label: 'Assessment', marker: 'AS' },
      { label: 'Bank Soal', marker: 'BS' },
      { label: 'Exam', marker: 'EX' },
      { label: 'Grading', marker: 'G' },
    ],
  },
  {
    label: 'Kelulusan & Sertifikat',
    items: [
      { label: 'Final Grade', marker: 'FG' },
      { label: 'Graduation', marker: 'GR' },
      { label: 'Certificate', marker: 'C' },
    ],
  },
  {
    label: 'Reporting',
    items: [{ label: 'Report Center', marker: 'R' }],
  },
  {
    label: 'Audit & System',
    items: [
      { label: 'Audit Log', marker: 'AL' },
      { label: 'System Health', marker: 'SH' },
    ],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#071120] text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1540px] lg:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="border-b border-slate-800/80 bg-[#071120]/98 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/" className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                LMS PRESISI
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Admin Pusat
              </h1>
              <p className="mt-1 hidden text-xs text-slate-500 lg:block">
                Operasional platform nasional
              </p>
            </Link>
            <div className="flex items-center gap-2 lg:mt-6">
              <a
                href="/login"
                className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Masuk
              </a>
              <a
                href="/api/auth/logout"
                className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
              >
                Keluar
              </a>
            </div>
          </div>

          <nav
            className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Navigasi Admin"
          >
            {primaryNavigation.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
            {navigationGroups.map((group) => (
              <div key={group.label} className="contents lg:block">
                <p className="hidden px-2 pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-600 lg:block">
                  {group.label}
                </p>
                <div className="contents lg:mt-2 lg:flex lg:flex-col lg:gap-1">
                  {group.items.map((item) =>
                    'href' in item ? (
                      <NavLink key={item.label} item={item} />
                    ) : (
                      <span
                        key={item.label}
                        className="hidden items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 lg:flex"
                      >
                        <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900/70 text-[0.65rem] font-semibold text-slate-600">
                          {item.marker}
                        </span>
                        {item.label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>
          <div className="mt-6 hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs leading-5 text-emerald-100 lg:block">
            Permission + Scope aktif di backend.
          </div>
        </aside>

        <div className="flex min-w-0 flex-col bg-[#0a1424]">
          <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-[#0a1424]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Pusat / Administrasi
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  Administrasi Platform Nasional
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-64 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-500">
                  Cari organisasi, personel, atau permission
                </div>
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100">
                  Production API
                </div>
              </div>
            </div>
          </header>
          <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

function NavLink({
  item,
}: {
  item: { href: string; label: string; marker: string };
}) {
  return (
    <Link
      href={item.href}
      className="flex shrink-0 items-center gap-3 rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-sm text-slate-300 transition hover:border-sky-400/70 hover:bg-slate-900 hover:text-white lg:border-transparent lg:bg-transparent"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-[0.65rem] font-semibold text-sky-200">
        {item.marker}
      </span>
      {item.label}
    </Link>
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
