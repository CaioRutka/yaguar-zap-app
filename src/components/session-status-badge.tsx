import type { WaConnectionStatus } from '@/lib/types/whatsapp';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const map: Record<WaConnectionStatus, { label: string; variant: 'success' | 'warning' | 'error'; dot: string }> = {
  open: { label: 'Conectado', variant: 'success', dot: 'bg-emerald-500 animate-pulse-dot' },
  connecting: { label: 'Conectando', variant: 'warning', dot: 'bg-amber-500 animate-pulse-dot' },
  close: { label: 'Desconectado', variant: 'error', dot: 'bg-red-400' },
};

export function SessionStatusBadge({ status }: { status: WaConnectionStatus }) {
  const { label, variant, dot } = map[status];
  return (
    <Badge variant={variant} className="gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {label}
    </Badge>
  );
}
