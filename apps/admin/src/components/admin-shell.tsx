'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AdminSidebarNav } from './admin-sidebar-nav';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function toggleSidebar() {
    setSidebarCollapsed((current) => !current);
  }

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
            'border-b border-slate-800/80 bg-[#071120] px-4 py-4 text-slate-100 transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-6',
            sidebarCollapsed ? 'lg:px-3' : 'lg:px-5',
          )}
        >
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link
              href="/"
              className={cn('block', sidebarCollapsed && 'lg:hidden')}
            >
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
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'
              }
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 bg-slate-950/40 text-sm font-semibold text-slate-200 transition hover:border-sky-400 hover:text-white lg:mt-0"
            >
              {sidebarCollapsed ? '>' : '<'}
            </button>
            <div
              className={cn(
                'flex items-center gap-2 lg:mt-6',
                sidebarCollapsed && 'lg:hidden',
              )}
            >
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

          <AdminSidebarNav
            primaryNavigation={primaryNavigation}
            navigationGroups={navigationGroups}
            collapsed={sidebarCollapsed}
          />
          <div
            className={cn(
              'mt-6 hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-xs leading-5 text-emerald-100 lg:block',
              sidebarCollapsed && 'lg:hidden',
            )}
          >
            Permission + Scope aktif di backend.
          </div>
        </aside>

        <div className="flex min-w-0 flex-col bg-slate-100">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Pusat / Administrasi
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                  Administrasi Platform Nasional
                </h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="min-w-64 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                  Cari organisasi, personel, atau permission
                </div>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
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
