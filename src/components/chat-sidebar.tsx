'use client';

import { useState } from 'react';
import { useChats } from '@/hooks/use-chats';
import { formatContactAddress, formatTimestamp, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  FUNNEL_STAGES,
  LEAD_TEMPERATURES,
  LEAD_CATEGORIES,
  type ChatReadStatus,
  type LeadFunnelStage,
  type LeadTemperature,
  type LeadCategory,
} from '@/lib/types/whatsapp';

type Props = {
  sessionId: string;
  activeJid: string;
  onSelectJid: (jid: string) => void;
};

const READ_STATUS_OPTIONS: { value: ChatReadStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'unread', label: 'Não lidas' },
  { value: 'read', label: 'Lidas' },
];

export function ChatSidebar({ sessionId, activeJid, onSelectJid }: Props) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [readStatus, setReadStatus] = useState<ChatReadStatus>('all');
  const [funnelStage, setFunnelStage] = useState<LeadFunnelStage | ''>('');
  const [temperature, setTemperature] = useState<LeadTemperature | ''>('');
  const [category, setCategory] = useState<LeadCategory | ''>('');
  const [tagsFilter, setTagsFilter] = useState('');

  const tagsParsed =
    tagsFilter
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const hasActiveFilters =
    readStatus !== 'all' || !!funnelStage || !!temperature || !!category || tagsParsed.length > 0;

  const { data: chats, isLoading } = useChats(sessionId, {
    search: search || undefined,
    readStatus,
    funnelStage: funnelStage || undefined,
    temperature: temperature || undefined,
    category: category || undefined,
    tags: tagsParsed.length > 0 ? tagsParsed : undefined,
  });

  const clearFilters = () => {
    setReadStatus('all');
    setFunnelStage('');
    setTemperature('');
    setCategory('');
    setTagsFilter('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search + filter toggle */}
      <div className="space-y-3 border-b border-border/60 bg-card/80 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="h-9 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all duration-200 cursor-pointer',
              showFilters || hasActiveFilters
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'text-muted-foreground hover:border-border/60 hover:bg-muted/80 hover:text-foreground',
            )}
            title="Filtros"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {hasActiveFilters && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-card" aria-hidden />
            )}
          </button>
        </div>

        <SegmentedControl
          value={readStatus}
          onChange={setReadStatus}
          options={READ_STATUS_OPTIONS}
        />
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div className="space-y-2 border-b border-border/50 bg-muted/25 px-4 py-3 animate-slide-up backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filtros</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[10px] text-primary hover:underline cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Etapa do Funil</label>
            <select
              value={funnelStage}
              onChange={(e) => setFunnelStage(e.target.value as LeadFunnelStage | '')}
              className="w-full h-7 text-[11px] rounded-md border bg-card px-2 appearance-none cursor-pointer"
            >
              <option value="">Todas</option>
              {FUNNEL_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Temperatura</label>
            <select
              value={temperature}
              onChange={(e) => setTemperature(e.target.value as LeadTemperature | '')}
              className="w-full h-7 text-[11px] rounded-md border bg-card px-2 appearance-none cursor-pointer"
            >
              <option value="">Todas</option>
              {LEAD_TEMPERATURES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as LeadCategory | '')}
              className="w-full h-7 text-[11px] rounded-md border bg-card px-2 appearance-none cursor-pointer"
            >
              <option value="">Todas</option>
              {LEAD_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Tags (todas — vírgula)</label>
            <Input
              value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
              placeholder="ex.: vip, retorno"
              className="h-7 text-[11px]"
            />
          </div>
        </div>
      )}

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        {!isLoading && (!chats || chats.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="rounded-xl bg-muted p-3 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">
              {search || hasActiveFilters ? 'Nenhum resultado com esses filtros.' : 'Nenhuma conversa ainda.'}
            </p>
          </div>
        )}

        {chats?.map((chat, i) => (
          <button
            key={chat.remoteJid}
            type="button"
            onClick={() => onSelectJid(chat.remoteJid)}
            className={cn(
              'w-full border-b border-border/40 px-3 py-3 text-left transition-all duration-150 cursor-pointer',
              'hover:bg-muted/50',
              activeJid === chat.remoteJid && 'border-l-2 border-l-primary bg-primary/[0.06]',
              'animate-slide-up',
            )}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-primary">
                  {(chat.lead?.name || chat.lastPushName || formatContactAddress(chat.remoteJid, chat.displayRemoteJid)).charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {chat.lead?.name || chat.lastPushName || formatContactAddress(chat.remoteJid, chat.displayRemoteJid)}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {chat.unreadCount > 0 && (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0 min-w-[18px] text-center">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                {(chat.lead?.name || chat.lastPushName) && (
                  <p className="text-[10px] text-muted-foreground truncate font-mono">
                    {formatContactAddress(chat.remoteJid, chat.displayRemoteJid)}
                  </p>
                )}
                <div className="flex items-center justify-between mt-0.5">
                  {chat.lastMessageText && (
                    <p className={cn(
                      'text-xs truncate flex-1',
                      chat.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}>
                      {chat.lastFromMe && <span className="text-muted-foreground">Você: </span>}
                      {chat.lastMessageText}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 shrink-0">
                    {formatTimestamp(chat.lastMessageAt)}
                  </span>
                </div>
                {/* Lead indicators */}
                {chat.lead && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {chat.lead.funnelStage && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                        {FUNNEL_STAGES.find((s) => s.value === chat.lead?.funnelStage)?.label ?? chat.lead.funnelStage}
                      </span>
                    )}
                    {chat.lead.temperature && (
                      <span className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded font-medium',
                        chat.lead.temperature === 'quente' && 'bg-red-500/10 text-red-600',
                        chat.lead.temperature === 'morno' && 'bg-amber-500/10 text-amber-600',
                        chat.lead.temperature === 'frio' && 'bg-blue-500/10 text-blue-600',
                      )}>
                        {LEAD_TEMPERATURES.find((t) => t.value === chat.lead?.temperature)?.label}
                      </span>
                    )}
                    {chat.lead.blocked && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                        Bloqueado
                      </span>
                    )}
                    {chat.lead.tags && chat.lead.tags.length > 0 && chat.lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted/80 text-foreground/90 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
