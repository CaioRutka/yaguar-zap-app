'use client';

import Link from 'next/link';
import { TenantSelector } from './tenant-selector';
import { HealthIndicator } from './health-indicator';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-base font-bold tracking-tight text-primary">
          YaguarZap
        </Link>
        <nav className="hidden sm:flex items-center gap-3 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Sessões
          </Link>
          <Link href="/diagnostics" className="text-muted-foreground hover:text-foreground transition-colors">
            Diagnósticos
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <HealthIndicator />
        <TenantSelector />
      </div>
    </header>
  );
}
