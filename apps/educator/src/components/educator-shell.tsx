'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type NavigationItem = {
  href: string;
  label: string;
  marker: string;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Pengajaran',
    items: [
      { href: '/', label: 'Dashboard', marker: 'D' },
      { href: '/kelas', label: 'Kelas Diampu', marker: 'K' },
      { href: '/pertemuan', label: 'Pertemuan', marker: 'P' },
      { href: '/aktivitas', label: 'Aktivitas', marker: 'A' },
      { href: '/tugas', label: 'Tugas & Penilaian', marker: 'T' },
    ],
  },
  {
    label: 'Assessment',
    items: [
      { href: '/exam', label: 'Exam', marker: 'EX' },
      { href: '/kehadiran', label: 'Kehadiran', marker: 'KH' },
      { href: '/pemantauan', label: 'Pemantauan', marker: 'PM' },
    ],
  },
];

export function EducatorShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div
        className={cn(
          'grid min-h-screen w-full transition-[grid-template-columns] duration-200 lg:grid-cols-[304px_minmax(0,1fr)]',
          sidebarCollapsed && 'lg:grid-cols-[76px_minmax(0,1fr)]',
        )}
      >
        <aside
          className={cn(
            'border-b border-[#1f2a3a] bg-[#0d1420] px-4 py-4 text-slate-100 shadow-[inset_-1px_0_0_rgba(148,163,184,0.14)] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-6',
            sidebarCollapsed ? 'lg:px-3' : 'lg:px-5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <Link
              href="/"
              className={cn('min-w-0 flex-1', sidebarCollapsed && 'lg:hidden')}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8eb8d8]">
                LMS PRESISI
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">
                Portal Educator
              </h1>
              <p className="mt-1 hidden text-xs text-slate-400 lg:block">
                Kelola pembelajaran dan penilaian
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              aria-label={
                sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'
              }
              className={cn(
                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2c394b] bg-transparent text-xs font-semibold text-slate-400 transition hover:border-[#c8a45d]/70 hover:bg-[#141f2e] hover:text-[#e4c679]',
                sidebarCollapsed && 'lg:mx-auto',
              )}
            >
              {sidebarCollapsed ? '»' : '«'}
            </button>
          </div>

          <EducatorSidebarNav
            groups={navigationGroups}
            collapsed={sidebarCollapsed}
          />

          <div
            className={cn(
              'mt-6 hidden rounded-lg border border-[#2c6b57]/40 bg-[#0f2d2a] px-3 py-3 text-xs leading-5 text-emerald-100 lg:block',
              sidebarCollapsed && 'lg:hidden',
            )}
          >
            Akses dibatasi oleh kelas dan assignment Anda.
          </div>
        </aside>

        <div className="flex min-w-0 flex-col bg-slate-100">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Portal / Educator
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                  Pembelajaran dan Penilaian
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Kelas yang menjadi tanggung jawab Anda
                </div>
                <div className="flex gap-2">
                  <a
                    href="/api/auth/login"
                    className="rounded-md bg-[#d6b46a] px-3 py-2 text-sm font-semibold text-[#172033] transition hover:bg-[#e4c679]"
                  >
                    Masuk
                  </a>
                  <a
                    href="/api/auth/logout"
                    className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    Keluar
                  </a>
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

function EducatorSidebarNav({
  groups,
  collapsed,
}: {
  groups: { label: string; items: NavigationItem[] }[];
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Navigasi Educator"
    >
      {groups.map((group) => (
        <div key={group.label} className="contents lg:block">
          <p
            className={cn(
              'hidden px-2 pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#8a96aa] lg:block',
              collapsed && 'lg:hidden',
            )}
          >
            {group.label}
          </p>
          <div className="contents lg:mt-2 lg:flex lg:flex-col lg:gap-1">
            {group.items.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-sm transition lg:border-transparent',
                    active
                      ? 'border-[#c8a45d]/70 bg-[#172538] font-semibold text-white shadow-sm shadow-black/20'
                      : 'border-[#253246] bg-[#111b2a] text-[#c7d0df] hover:border-[#c8a45d]/60 hover:bg-[#162235] hover:text-white lg:bg-transparent',
                    collapsed && 'lg:justify-center lg:px-0',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-md text-[0.65rem] font-semibold',
                      active
                        ? 'bg-[#d6b46a] text-[#172033]'
                        : 'bg-[#162235] text-[#9fb3c8]',
                    )}
                  >
                    {item.marker}
                  </span>
                  <span className={cn(collapsed && 'lg:hidden')}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
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
        'rounded-lg border border-slate-200 bg-white p-5 shadow-sm',
        className,
      )}
    >
      <div className="mb-5 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}
