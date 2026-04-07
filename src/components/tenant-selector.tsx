'use client';

import { useState } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function TenantSelector() {
  const { tenantId, setTenantId } = useTenant();
  const [draft, setDraft] = useState(tenantId);

  const apply = () => {
    const trimmed = draft.trim();
    if (trimmed) setTenantId(trimmed);
  };

  return (
    <div className="space-y-2.5">
      <label htmlFor="tenant-input" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Tenant
      </label>
      <div className="flex items-stretch gap-2">
        <Input
          id="tenant-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="h-9 min-w-0 flex-1 text-xs font-mono"
          autoComplete="off"
        />
        <Button
          size="sm"
          variant={draft.trim() !== tenantId ? 'default' : 'outline'}
          className="h-9 shrink-0 px-3 text-xs font-semibold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
          onClick={apply}
          disabled={!draft.trim() || draft.trim() === tenantId}
          type="button"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
}
