'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useBroadcasts,
  useCreateBroadcast,
  useStartBroadcast,
  useCancelBroadcast,
} from '@/hooks/use-broadcasts';
import { FUNNEL_STAGES, LEAD_TEMPERATURES, LEAD_CATEGORIES } from '@/lib/types/whatsapp';
import { formatTimestamp, cn } from '@/lib/utils';
import { AppPageShell } from '@/components/app-page-shell';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api/errors';

function parseDelayPatternSeconds(input: string): number[] | undefined {
  const parts = input
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((p) => {
    const n = Number(p.replace(',', '.'));
    if (!Number.isFinite(n) || n < 3) throw new Error('Cada intervalo da cadência deve ser ≥ 3 segundos.');
    return Math.round(n * 1000);
  });
}

export default function BroadcastPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: broadcasts, isLoading } = useBroadcasts(sessionId);
  const createBroadcast = useCreateBroadcast(sessionId);
  const startBroadcast = useStartBroadcast(sessionId);
  const cancelBroadcast = useCancelBroadcast(sessionId);

  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [name, setName] = useState('');
  const [baseMessage, setBaseMessage] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [deliveryChannel, setDeliveryChannel] = useState<'baileys_web' | 'cloud_api'>('baileys_web');
  const [recipientLimit, setRecipientLimit] = useState('500');
  const [funnelStage, setFunnelStage] = useState('');
  const [temperature, setTemperature] = useState('');
  const [category, setCategory] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [search, setSearch] = useState('');
  const [createdAtFrom, setCreatedAtFrom] = useState('');
  const [createdAtTo, setCreatedAtTo] = useState('');
  const [facebookCampaign, setFacebookCampaign] = useState('');
  const [valueMin, setValueMin] = useState('');
  const [valueMax, setValueMax] = useState('');
  const [ccl, setCcl] = useState('');
  const [minDelay, setMinDelay] = useState('5');
  const [maxDelay, setMaxDelay] = useState('15');
  const [delayPatternStr, setDelayPatternStr] = useState('');
  const [batchSize, setBatchSize] = useState('5');
  const [pauseBatch, setPauseBatch] = useState('60');

  const handleCreate = () => {
    if (!name.trim() || !baseMessage.trim()) return;
    setFormError('');
    let delayPatternMs: number[] | undefined;
    try {
      delayPatternMs = delayPatternStr.trim() ? parseDelayPatternSeconds(delayPatternStr) : undefined;
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Cadência inválida');
      return;
    }

    const tags = tagsStr
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    createBroadcast.mutate(
      {
        name: name.trim(),
        baseMessage: baseMessage.trim(),
        useAiVariation: useAi,
        deliveryChannel,
        recipientLimit: Math.min(5000, Math.max(1, Number(recipientLimit) || 500)),
        filters: {
          funnelStage: funnelStage || undefined,
          temperature: temperature || undefined,
          category: category || undefined,
          tags: tags.length ? tags : undefined,
          search: search.trim() || undefined,
          createdAtFrom: createdAtFrom ? new Date(createdAtFrom).toISOString() : undefined,
          createdAtTo: createdAtTo ? new Date(createdAtTo).toISOString() : undefined,
          facebookCampaign: facebookCampaign.trim() || undefined,
          valueMin: valueMin.trim() !== '' ? Number(valueMin) : undefined,
          valueMax: valueMax.trim() !== '' ? Number(valueMax) : undefined,
          ccl: ccl.trim() || undefined,
        },
        cadence: {
          minDelayMs: Number(minDelay) * 1000,
          maxDelayMs: Number(maxDelay) * 1000,
          batchSize: Number(batchSize),
          pauseBetweenBatchesMs: Number(pauseBatch) * 1000,
          ...(delayPatternMs?.length ? { delayPatternMs } : {}),
        },
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setName('');
          setBaseMessage('');
          setTagsStr('');
          setSearch('');
          setCreatedAtFrom('');
          setCreatedAtTo('');
          setFacebookCampaign('');
          setValueMin('');
          setValueMax('');
          setCcl('');
          setDelayPatternStr('');
        },
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : 'Falha ao criar campanha');
        },
      },
    );
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground ring-1 ring-border/60',
    running: 'bg-primary/12 text-primary ring-1 ring-primary/25',
    paused: 'bg-amber-500/12 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20',
    completed: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20',
    cancelled: 'bg-destructive/12 text-destructive ring-1 ring-destructive/20',
  };

  return (
    <AppPageShell size="content" className="animate-fade-in">
      <div className="space-y-8">
        {actionError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{actionError}</p>
        )}

        <PageHeader
          kicker="Campanhas"
          title="Envio em massa"
          description={`Dispare mensagens para leads filtrados da sessão ${sessionId}, com cadência anti-bloqueio e filtros avançados.`}
          backHref={`/sessions/${sessionId}`}
          actions={
            <Button onClick={() => setShowForm(true)} className="h-10 gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nova campanha
            </Button>
          }
        />

        {showForm && (
          <div className="app-glass-panel space-y-5 p-6 sm:p-8 animate-slide-up">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">Nova campanha</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Mensagem, filtros de lead (tags, datas, campanha FB, valor, CCL), canal de entrega e cadência.
              </p>
            </div>

            {formError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{formError}</p>
            )}

            <div className="space-y-2">
              <label htmlFor="bc-name" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nome
              </label>
              <Input id="bc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Promoção Janeiro" className="h-10 text-sm" />
            </div>

            <div className="space-y-2">
              <label htmlFor="bc-msg" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mensagem base
              </label>
              <textarea
                id="bc-msg"
                value={baseMessage}
                onChange={(e) => setBaseMessage(e.target.value)}
                placeholder="Texto enviado aos destinatários (pode ser variado pela IA sem alterar números quando GEMINI_API_KEY está configurada no servidor)"
                rows={4}
                className="w-full resize-none rounded-xl border border-input bg-card/80 px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 transition-colors hover:bg-muted/35">
              <input
                type="checkbox"
                checked={useAi}
                onChange={(e) => setUseAi(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-xs font-medium">Variar mensagem com IA (anti-bloqueio; preserva valores com Gemini)</span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Canal de entrega</label>
                <select
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel(e.target.value as 'baileys_web' | 'cloud_api')}
                  className="h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-2 text-xs shadow-sm"
                >
                  <option value="baileys_web">WhatsApp Web (sessão conectada)</option>
                  <option value="cloud_api">API oficial Meta (indisponível — use para planejar)</option>
                </select>
                <p className="text-[10px] text-muted-foreground">API oficial: criação permitida; o envio retorna erro até integração F4.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Máx. destinatários</label>
                <Input
                  type="number"
                  value={recipientLimit}
                  onChange={(e) => setRecipientLimit(e.target.value)}
                  className="h-9 text-xs"
                  min={1}
                  max={5000}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros de lead</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Funil</label>
                  <select
                    value={funnelStage}
                    onChange={(e) => setFunnelStage(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-2 text-xs shadow-sm"
                  >
                    <option value="">Todos</option>
                    {FUNNEL_STAGES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Temperatura</label>
                  <select
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-2 text-xs shadow-sm"
                  >
                    <option value="">Todos</option>
                    {LEAD_TEMPERATURES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-2 text-xs shadow-sm"
                  >
                    <option value="">Todos</option>
                    {LEAD_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Tags (todas devem existir — vírgula)</label>
                  <Input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="vip, retorno" className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Busca nome / telefone / JID</label>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Maria ou 5511..." className="h-9 text-xs" />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Lead criado a partir de</label>
                  <Input
                    type="datetime-local"
                    value={createdAtFrom}
                    onChange={(e) => setCreatedAtFrom(e.target.value)}
                    className="h-9 text-xs native-datetime-dark"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Lead criado até</label>
                  <Input
                    type="datetime-local"
                    value={createdAtTo}
                    onChange={(e) => setCreatedAtTo(e.target.value)}
                    className="h-9 text-xs native-datetime-dark"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Campanha Facebook</label>
                  <Input value={facebookCampaign} onChange={(e) => setFacebookCampaign(e.target.value)} placeholder="Contém..." className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Valor mín. (R$)</label>
                  <Input type="number" value={valueMin} onChange={(e) => setValueMin(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground">Valor máx. (R$)</label>
                  <Input type="number" value={valueMax} onChange={(e) => setValueMax(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[10px] text-muted-foreground">CCL (como conheceu)</label>
                <Input value={ccl} onChange={(e) => setCcl(e.target.value)} placeholder="Contém..." className="mt-1 h-9 text-xs" />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cadência</p>
              <p className="text-[10px] text-muted-foreground">
                Se preencher <strong>sequência</strong>, ela substitui o delay aleatório min/max entre cada envio (valores em segundos, ex.: 10, 15, 25).
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Delay mín (s)</label>
                  <Input type="number" value={minDelay} onChange={(e) => setMinDelay(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Delay máx (s)</label>
                  <Input type="number" value={maxDelay} onChange={(e) => setMaxDelay(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Lote</label>
                  <Input type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Pausa entre lotes (s)</label>
                  <Input type="number" value={pauseBatch} onChange={(e) => setPauseBatch(e.target.value)} className="h-9 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Sequência de intervalos (s), opcional</label>
                <Input
                  value={delayPatternStr}
                  onChange={(e) => setDelayPatternStr(e.target.value)}
                  placeholder="10, 15, 25, 15"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-5">
              <Button
                onClick={handleCreate}
                disabled={!name.trim() || !baseMessage.trim() || createBroadcast.isPending}
                className="gap-2"
              >
                {createBroadcast.isPending ? <Spinner className="h-4 w-4" /> : 'Criar campanha'}
              </Button>
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center rounded-2xl border border-dashed border-border/60 py-20">
            <Spinner className="h-7 w-7" />
          </div>
        )}

        {!isLoading && (!broadcasts || broadcasts.length === 0) && !showForm && (
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            }
            title="Nenhuma campanha"
            description="Crie uma campanha de envio em massa para seus leads."
            className="py-14"
          />
        )}

        <div className="space-y-4">
          {broadcasts?.map((b, i) => (
            <div
              key={b._id}
              className="app-session-card p-5 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-bold tracking-tight">{b.name}</h3>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize', statusColors[b.status])}>
                      {b.status}
                    </span>
                    {b.deliveryChannel === 'cloud_api' && (
                      <Badge variant="muted" className="text-[9px]">
                        API oficial
                      </Badge>
                    )}
                    {b.useAiVariation && <Badge variant="info" className="text-[9px]">IA</Badge>}
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{b.baseMessage}</p>
                  <div className="flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
                    {b.filters.tags && b.filters.tags.length > 0 && (
                      <span className="rounded bg-muted/80 px-1.5 py-0.5">tags: {b.filters.tags.join(', ')}</span>
                    )}
                    {b.filters.search && <span className="rounded bg-muted/80 px-1.5 py-0.5">busca</span>}
                    {(b.filters.createdAtFrom || b.filters.createdAtTo) && <span className="rounded bg-muted/80 px-1.5 py-0.5">data criação</span>}
                    {b.filters.facebookCampaign && <span className="rounded bg-muted/80 px-1.5 py-0.5">FB</span>}
                    {(b.filters.valueMin != null || b.filters.valueMax != null) && <span className="rounded bg-muted/80 px-1.5 py-0.5">valor</span>}
                    {b.filters.ccl && <span className="rounded bg-muted/80 px-1.5 py-0.5">CCL</span>}
                    {b.cadence.delayPatternMs && b.cadence.delayPatternMs.length > 0 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">cadência sequencial</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span>{b.totalRecipients} destinatários</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{b.sentCount} enviadas</span>
                    {b.failedCount > 0 && <span className="font-medium text-destructive">{b.failedCount} falhas</span>}
                    <span>{formatTimestamp(b.createdAt)}</span>
                  </div>

                  {b.status === 'running' && b.totalRecipients > 0 && (
                    <div className="mt-3">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.round(((b.sentCount + b.failedCount) / b.totalRecipients) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {Math.round(((b.sentCount + b.failedCount) / b.totalRecipients) * 100)}% concluído
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  {b.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionError('');
                        startBroadcast.mutate(b._id, {
                          onError: (err) => {
                            setActionError(err instanceof ApiError ? `${err.message}` : 'Não foi possível iniciar a campanha.');
                          },
                        });
                      }}
                      disabled={startBroadcast.isPending}
                      className="cursor-pointer"
                    >
                      Iniciar
                    </Button>
                  )}
                  {b.status === 'running' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelBroadcast.mutate(b._id)}
                      disabled={cancelBroadcast.isPending}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppPageShell>
  );
}
