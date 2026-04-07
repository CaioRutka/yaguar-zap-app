'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/lib/query-provider';
import { TenantProvider } from '@/lib/tenant-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TenantProvider>{children}</TenantProvider>
    </QueryProvider>
  );
}
