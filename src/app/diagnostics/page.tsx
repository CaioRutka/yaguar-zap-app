'use client';

import { useHealth, useMongoPing, useWhatsappRisk } from '@/hooks/use-diagnostics';
import { AppPageShell } from '@/components/app-page-shell';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

function StatusRow({
  label,
  ok,
  loading,
  detail,
  icon,
}: {
  label: string;
  ok?: boolean;
  loading: boolean;
  detail?: string;
  icon: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d={icon} />
          </svg>
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      {loading ? (
        <Spinner className="h-5 w-5 shrink-0" />
      ) : (
        <div className="flex shrink-0 items-center gap-2.5">
          {detail && (
            <span className="hidden max-w-[200px] truncate text-xs font-mono text-muted-foreground sm:inline">
              {detail}
            </span>
          )}
          <Badge variant={ok ? 'success' : 'error'}>
            {ok ? 'Operacional' : 'Falha'}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticsPage() {
  const health = useHealth();
  const mongo = useMongoPing();
  const risk = useWhatsappRisk();

  return (
    <AppPageShell size="medium" className="animate-fade-in">
      <div className="space-y-8">
        <PageHeader
          kicker="Infraestrutura"
          title="Diagnósticos"
          description="Status da API e do MongoDB em tempo real. Use para validar ambiente antes de operar sessões."
        />

        <div className="app-glass-panel divide-y divide-border/60 p-6 sm:p-8">
          <div className="pb-5">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Backend &amp; dados</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Monitoramento dos serviços conectados ao painel.
            </p>
          </div>
          <div className="space-y-0 pt-2">
            <StatusRow
              label="API Health"
              ok={health.data?.ok}
              loading={health.isLoading}
              detail={health.data?.env}
              icon="M22 12h-4l-3 9L9 3l-3 9H2"
            />
            <StatusRow
              label="MongoDB"
              ok={mongo.data?.ok}
              loading={mongo.isLoading}
              detail={mongo.data?.error}
              icon="M12 3v18M3 12h18"
            />
          </div>
        </div>

        <div className="app-glass-panel p-6 sm:p-8">
          <h2 className="text-sm font-bold tracking-tight text-foreground">Risco de bloqueio (broadcast)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Envios em massa registrados nas últimas 24h (Épico G1). Ajuste cadência e conteúdo se os alertas aparecerem.
          </p>
          {risk.isLoading && (
            <div className="mt-4 flex justify-center py-6">
              <Spinner className="h-6 w-6" />
            </div>
          )}
          {!risk.isLoading && risk.data && (
            <div className="mt-4 space-y-3 text-xs">
              <p>
                <span className="font-semibold text-foreground">{risk.data.broadcastSends24h}</span> envios de broadcast
                nas últimas {risk.data.windowHours}h · limite sugerido de alerta:{' '}
                {risk.data.thresholds.alertOverBroadcastSends24h} · teto de destinatários por campanha:{' '}
                {risk.data.thresholds.broadcastMaxRecipients}
              </p>
              {risk.data.alerts.length > 0 && (
                <ul className="list-inside list-disc space-y-1 text-amber-700 dark:text-amber-400">
                  {risk.data.alerts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
              {risk.data.alerts.length === 0 && (
                <p className="text-muted-foreground">Nenhum alerta ativo no momento.</p>
              )}
            </div>
          )}
          {risk.isError && (
            <p className="mt-4 text-xs text-destructive">Não foi possível carregar métricas de risco.</p>
          )}
        </div>
      </div>
    </AppPageShell>
  );
}
