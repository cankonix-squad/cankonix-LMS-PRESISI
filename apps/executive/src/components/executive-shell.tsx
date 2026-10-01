'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Executive sidebar — read-heavy hierarchy navigation for pimpinan.
// The sidebar mirrors the drill-down structure and reporting surfaces.
// ---------------------------------------------------------------------------

const primaryNavigation = [{ href: '/', label: 'Dashboard', marker: 'D' }];

const navigationGroups = [
  {
    label: 'Pemantauan',
    items: [
      { href: '/drilldown', label: 'Drill-down Lembaga', marker: 'DL' },
      { href: '/kpi', label: 'Detail KPI', marker: 'KP' },
      { href: '/trend', label: 'Tren Kelulusan', marker: 'TR' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function ExecutiveShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  function toggleSidebar() {
    setSidebarCollapsed((prev) => !prev);
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#061524] text-slate-100 lg:flex-row">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-[#1e3146] bg-[#0a1a2e] transition-all',
          sidebarCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-60',
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-[#1e3146] px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[#c8a45d] text-[0.65rem] font-bold text-[#071d38]">
              LP
            </span>
            {!sidebarCollapsed && (
              <span className="text-sm font-extrabold uppercase tracking-[0.12em] text-white">
                LMS PRESISI
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'
            }
            className={cn(
              'ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2c394b] bg-transparent text-xs font-semibold text-slate-400 transition hover:border-[#c8a45d]/70 hover:bg-[#141f2e] hover:text-[#e4c679]',
              sidebarCollapsed && 'lg:mx-auto lg:ml-0',
            )}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        {/* Navigation */}
        <nav
          className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:overflow-visible lg:pb-0"
          aria-label="Navigasi Executive"
        >
          {primaryNavigation.map((item) => (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              marker={item.marker}
              active={pathname === item.href}
              collapsed={sidebarCollapsed}
            />
          ))}

          {navigationGroups.map((group) => (
            <div key={group.label} className="contents lg:block">
              <p
                className={cn(
                  'hidden px-3 pt-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#6b7d94] lg:block',
                  sidebarCollapsed && 'lg:hidden',
                )}
              >
                {group.label}
              </p>
              <div className="contents lg:mt-1.5 lg:flex lg:flex-col lg:gap-0.5">
                {group.items.map((item) => (
                  <SidebarNavLink
                    key={item.label}
                    href={item.href}
                    label={item.label}
                    marker={item.marker}
                    active={pathname === item.href}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Auth actions */}
          <div className="contents lg:mt-4 lg:block">
            <a
              href="/api/auth/logout"
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm text-slate-400 transition hover:border-[#c8a45d]/60 hover:text-[#e4c679] lg:flex',
                sidebarCollapsed && 'lg:justify-center lg:px-0',
              )}
            >
              <span className="grid h-7 w-7 place-items-center rounded-md bg-[#162235] text-[0.65rem] text-[#7c8799]">
                K
              </span>
              <span className={cn(sidebarCollapsed && 'lg:hidden')}>
                Keluar
              </span>
            </a>
          </div>
        </nav>

        {/* Status footer */}
        <div
          className={cn(
            'mt-auto hidden rounded-lg border border-[#2c6b57]/40 bg-[#0f2d2a] px-3 py-3 text-xs leading-5 text-emerald-100 lg:block',
            sidebarCollapsed && 'lg:hidden',
          )}
        >
          Portal Pimpinan · Read-only
        </div>
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#061524]">
        <header className="sticky top-0 z-10 border-b border-[#1e3146] bg-[#071220]/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c8a45d]">
                Lemdiklat Polri / Portal Executive
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                Pemantauan Capaian Pendidikan
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-md border border-[#1e3146] bg-[#0a1a2e] px-3 py-2 text-sm text-slate-400">
                Read-only Dashboard
              </div>
              <div className="rounded-md border border-[#2c6b57]/40 bg-[#0f2d2a] px-3 py-2 text-xs font-medium text-emerald-200">
                Reporting API
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sidebar nav link
// ---------------------------------------------------------------------------

function SidebarNavLink({
  href,
  label,
  marker,
  active,
  collapsed,
}: {
  href: string;
  label: string;
  marker: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition lg:border-transparent',
        active
          ? 'border-[#c8a45d]/70 bg-[#172538] font-semibold text-white shadow-sm shadow-black/20'
          : 'border-[#1e3856] bg-[#0d1e30] text-[#b8c7dd] hover:border-[#c8a45d]/60 hover:bg-[#132238] hover:text-white lg:bg-transparent',
        collapsed && 'lg:justify-center lg:px-0',
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-md text-[0.65rem] font-semibold',
          active
            ? 'bg-[#c8a45d] text-[#071d38]'
            : 'bg-[#162235] text-[#7c8799]',
        )}
      >
        {marker}
      </span>
      <span className={cn(collapsed && 'lg:hidden')}>{label}</span>
    </Link>
  );
}
