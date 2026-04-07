'use client';

import { useState } from 'react';
import {
  useLead,
  useCreateLead,
  useUpdateFunnel,
  useAddObservation,
  useSetBlocked,
} from '@/hooks/use-leads';
import { useChats } from '@/hooks/use-chats';
import { FUNNEL_STAGES, LEAD_TEMPERATURES } from '@/lib/types/whatsapp';
import { formatContactAddress, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

type Props = {
  sessionId: string;
  remoteJid: string;
};

export function LeadPanel({ sessionId, remoteJid }: Props) {
  const { data: chats } = useChats(sessionId, {});
  const chatRow = chats?.find((c) => c.remoteJid === remoteJid);
  const addressLabel = formatContactAddress(remoteJid, chatRow?.displayRemoteJid);

  const { data: lead, isLoading, isError } = useLead(sessionId, remoteJid);
  const createLead = useCreateLead(sessionId);
  const updateFunnel = useUpdateFunnel(sessionId);
  const addObservation = useAddObservation(sessionId);
  const setBlocked = useSetBlocked(sessionId);

  const [obsText, setObsText] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');

  if (!remoteJid) return null;

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isError || !lead) {
    return (
      <div className="p-6 space-y-4 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="mx-auto h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-xs text-muted-foreground">
            Nenhum lead para {addressLabel}
          </p>
        </div>
        {!showCreate ? (
          <Button size="sm" variant="soft" onClick={() => setShowCreate(true)} className="w-full">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Criar lead
          </Button>
        ) : (
          <div className="space-y-2 animate-slide-up">
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Nome do contato"
              className="text-xs h-8"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1 text-xs"
                disabled={createLead.isPending}
                onClick={() => {
                  createLead.mutate(
                    { remoteJid, name: createName || undefined },
                    {
                      onSuccess: () => {
                        setShowCreate(false);
                        setCreateName('');
                      },
                    },
                  );
                }}
              >
                {createLead.isPending ? <Spinner className="h-3 w-3" /> : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleObservation = () => {
    if (!obsText.trim()) return;
    addObservation.mutate(
      { remoteJid, observation: obsText.trim() },
      { onSuccess: () => setObsText('') },
    );
  };

  return (
    <div className="space-y-5 p-5 text-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-secondary/20 ring-1 ring-primary/15">
            <span className="text-sm font-bold text-primary">
              {(lead.name || formatContactAddress(lead.remoteJid, chatRow?.displayRemoteJid)).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{lead.name || formatContactAddress(lead.remoteJid, chatRow?.displayRemoteJid)}</p>
            {lead.phone && <p className="text-xs text-muted-foreground font-mono">{lead.phone}</p>}
          </div>
        </div>
        <Button
          size="xs"
          variant={lead.blocked ? 'destructive' : 'outline'}
          disabled={setBlocked.isPending}
          onClick={() => setBlocked.mutate({ remoteJid, blocked: !lead.blocked })}
        >
          {lead.blocked ? 'Desbloquear' : 'Bloquear'}
        </Button>
      </div>

      {/* Funnel stage */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Funil</p>
        <div className="flex flex-wrap gap-1.5">
          {FUNNEL_STAGES.map((stage) => (
            <button
              key={stage.value}
              type="button"
              disabled={updateFunnel.isPending}
              onClick={() => {
                if (stage.value !== lead.funnelStage) {
                  updateFunnel.mutate({ remoteJid, funnelStage: stage.value });
                }
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer',
                stage.value === lead.funnelStage
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {/* Temperature */}
      {lead.temperature && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Temperatura</span>
          <Badge variant={
            lead.temperature === 'quente' ? 'success' :
            lead.temperature === 'morno' ? 'warning' : 'info'
          }>
            {LEAD_TEMPERATURES.find((t) => t.value === lead.temperature)?.label ?? lead.temperature}
          </Badge>
        </div>
      )}

      {/* Tags */}
      {lead.tags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag) => (
              <Badge key={tag} variant="default" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Value */}
      {lead.value !== undefined && lead.value > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/40 p-3">
          <span className="text-xs text-muted-foreground">Valor</span>
          <span className="text-sm font-bold text-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
          </span>
        </div>
      )}

      {/* Category */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Categoria</span>
        <span className="text-xs font-medium capitalize">{lead.category}</span>
      </div>

      {/* Observation */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Observação</p>
        {lead.observation && (
          <div className="rounded-xl border border-border/50 bg-muted/35 p-3 text-xs leading-relaxed whitespace-pre-wrap">
            {lead.observation}
          </div>
        )}
        <div className="flex gap-1.5">
          <Input
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleObservation()}
            placeholder="Adicionar observação..."
            className="text-xs h-8 flex-1"
          />
          <Button
            size="xs"
            variant="soft"
            disabled={addObservation.isPending || !obsText.trim()}
            onClick={handleObservation}
          >
            {addObservation.isPending ? <Spinner className="h-3 w-3" /> : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className="text-[10px] text-muted-foreground space-y-1 pt-4 border-t">
        <p>Criado: {new Date(lead.createdAt).toLocaleString('pt-BR')}</p>
        <p>Atualizado: {new Date(lead.updatedAt).toLocaleString('pt-BR')}</p>
        {lead.facebookCampaign && <p>Campanha FB: {lead.facebookCampaign}</p>}
      </div>
    </div>
  );
}
