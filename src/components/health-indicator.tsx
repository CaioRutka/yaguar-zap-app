'use client';

import { useHealth } from '@/hooks/use-diagnostics';
import { cn } from '@/lib/utils';

export function HealthIndicator() {
  const { data, isError } = useHealth();

  const ok = data?.ok && !isError;

  return (
    <div
      className="flex cursor-default items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors duration-200"
      title={ok ? 'API online' : 'API offline'}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          ok ? 'bg-emerald-500 animate-pulse-dot' : 'bg-red-400',
        )}
      />
      <span className={ok ? 'text-muted-foreground' : 'text-destructive'}>
        {ok ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
