'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TenantSelector } from './tenant-selector';
import { HealthIndicator } from './health-indicator';

function LogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-primary" />
      <path
        d="M8 22.5C8 22.5 9.5 20 16 20C22.5 20 24 22.5 24 22.5"
        stroke="white" strokeWidth="2" strokeLinecap="round"
      />
      <path
        d="M10 14L13 11V17"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="20" cy="14" r="3" stroke="white" strokeWidth="2" />
    </svg>
  );
}

function SidebarIcon({ d, ...props }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

const navItems = [
  {
    href: '/',
    label: 'Sessões',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    exact: true,
  },
  {
    href: '/diagnostics',
    label: 'Diagnósticos',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
    exact: false,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r transition-all duration-300 ease-out',
          'md:relative md:translate-x-0',
          collapsed ? 'md:w-[72px]' : 'md:w-60',
          mobileOpen ? 'translate-x-0 w-60' : '-translate-x-full',
        )}
      >
        <div className={cn(
          'flex items-center h-16 px-4 border-b shrink-0',
          collapsed ? 'justify-center' : 'gap-3',
        )}>
          <LogoIcon className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight text-foreground">
              YaguarZap
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer',
                  active
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <SidebarIcon d={item.icon} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          'border-t border-border/80 p-4 shrink-0 bg-sidebar/95',
          collapsed && 'flex justify-center p-3',
        )}>
          {!collapsed && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 dark:bg-muted/10">
              <TenantSelector />
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" title="Tenant">
              <span className="text-xs font-bold text-primary">T</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:flex items-center justify-center h-10 border-t text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'} />
          </svg>
        </button>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/90 px-4 backdrop-blur-md md:px-6">
          <button
            type="button"
            className="md:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="hidden md:block" />

          <div className="flex items-center gap-4">
            <HealthIndicator />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
