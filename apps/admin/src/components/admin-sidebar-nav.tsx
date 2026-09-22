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
  collapsed,
}: {
  primaryNavigation: Required<NavItem>[];
  navigationGroups: NavGroup[];
  collapsed: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:mt-8 lg:flex-col lg:overflow-visible lg:pb-0"
      aria-label="Navigasi Admin"
    >
      {primaryNavigation.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={pathname === item.href}
          collapsed={collapsed}
        />
      ))}
      {navigationGroups.map((group) => (
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
            {group.items.map((item) =>
              item.href ? (
                <NavLink
                  key={item.label}
                  item={item as Required<NavItem>}
                  active={pathname === item.href}
                  collapsed={collapsed}
                />
              ) : (
                <span
                  key={item.label}
                  className={cn(
                    'hidden items-center gap-3 rounded-md px-3 py-2 text-sm text-[#667386] lg:flex',
                    collapsed && 'lg:justify-center lg:px-0',
                  )}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[#162235] text-[0.65rem] font-semibold text-[#7c8799]">
                    {item.marker}
                  </span>
                  <span className={cn(collapsed && 'lg:hidden')}>
                    {item.label}
                  </span>
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
  collapsed,
}: {
  item: Required<NavItem>;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
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
      <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
    </Link>
  );
}
