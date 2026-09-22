'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href?: string;
  label: string;
  marker: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export function AdminSidebarNav({
  primaryNavigation,
  navigationGroups,
}: {
  primaryNavigation: Required<NavItem>[];
  navigationGroups: NavGroup[];
}) {
  const pathname = usePathname();

  return (
    <nav
      className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Navigasi Admin"
    >
      {primaryNavigation.map((item) => (
        <NavLink key={item.href} item={item} active={pathname === item.href} />
      ))}
      {navigationGroups.map((group) => (
        <div key={group.label} className="contents lg:block">
          <p className="hidden px-2 pt-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400 lg:block">
            {group.label}
          </p>
          <div className="contents lg:mt-2 lg:flex lg:flex-col lg:gap-1">
            {group.items.map((item) =>
              item.href ? (
                <NavLink
                  key={item.label}
                  item={item as Required<NavItem>}
                  active={pathname === item.href}
                />
              ) : (
                <span
                  key={item.label}
                  className="hidden items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 lg:flex"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-white/5 text-[0.65rem] font-semibold text-slate-500">
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
  );
}

function NavLink({
  item,
  active,
}: {
  item: Required<NavItem>;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-3 rounded-md border px-3 py-2 text-sm transition lg:border-transparent',
        active
          ? 'border-sky-400 bg-sky-500/15 font-semibold text-white shadow-sm shadow-sky-950/20'
          : 'border-slate-800/80 bg-slate-950/30 text-slate-300 hover:border-sky-400/70 hover:bg-white/5 hover:text-white lg:bg-transparent',
      )}
    >
      <span
        className={cn(
          'grid h-7 w-7 place-items-center rounded-md text-[0.65rem] font-semibold',
          active ? 'bg-sky-500 text-white' : 'bg-white/5 text-sky-200',
        )}
      >
        {item.marker}
      </span>
      {item.label}
    </Link>
  );
}
