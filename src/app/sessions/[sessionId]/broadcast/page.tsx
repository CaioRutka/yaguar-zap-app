'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  useBroadcasts,
  useCreateBroadcast,
  useUpdateBroadcast,
  useStartBroadcast,
  useCancelBroadcast,
} from '@/hooks/use-broadcasts';
import type {
  BroadcastBlockDto,
  BroadcastDto,
  BroadcastTextDeliveryMode,
  CreateBroadcastBlock,
  MediaItemDto,
  UpdateBroadcastBlock,
} from '@/lib/types/whatsapp';
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
import { downloadMediaItemAsFile } from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';
import { AttachSourceModal, GalleryPickerModal } from '@/components/attach-media-modals';

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

function newBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type UiTextBlock = {
  id: string;
  kind: 'text';
  content: string;
  mode: 'fixed' | 'variable';
};

type UiMediaBlock = {
  id: string;
  kind: 'media';
  mediaType: 'image' | 'audio' | 'video' | 'document';
  file: File | null;
  caption: string;
  audioPtt: boolean;
  /** Edição: mídia já persistida — envio com keepExisting se o usuário não trocar o arquivo. */
  preservedFromServer?: boolean;
  serverMediaLabel?: string;
};

type UiBlock = UiTextBlock | UiMediaBlock;

function acceptForMediaType(t: UiMediaBlock['mediaType']): string {
  if (t === 'image') return 'image/*';
  if (t === 'audio') return 'audio/*';
  if (t === 'video') return 'video/*';
  return '*/*';
}

function BroadcastMediaFilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const mime = file.type || '';
    if (mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/')) {
      const u = URL.createObjectURL(file);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    setUrl(null);
  }, [file]);

  if (!url) return null;

  if (file.type.startsWith('image/')) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Pré-visualização: ${file.name}`}
          className="mx-auto max-h-56 w-full object-contain"
        />
      </div>
    );
  }

  if (file.type.startsWith('video/')) {
    return (
      <div className="overflow-hidden rounded-xl border border-border/60 bg-black/30">
        <video src={url} controls className="mx-auto max-h-56 w-full" />
      </div>
    );
  }

  if (file.type.startsWith('audio/')) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
        <audio src={url} controls className="w-full" />
      </div>
    );
  }

  return null;
}

function broadcastBlocksSummary(blocks: BroadcastBlockDto[]): string {
  if (!blocks.length) return '—';
  return [...blocks]
    .sort((a, b) => a.order - b.order)
    .map((bl, i) => {
      if (bl.type === 'text') {
        const preview = (bl.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 36);
        const tag = bl.mode === 'variable' ? 'IA' : 'fixo';
        return `${i + 1}. Texto (${tag})${preview ? ` — ${preview}${(bl.content ?? '').length > 36 ? '…' : ''}` : ''}`;
      }
      return `${i + 1}. ${bl.mediaType ?? 'mídia'}`;
    })
    .join(' · ');
}

function campaignUsesAi(b: BroadcastDto): boolean {
  if (b.useAiVariation) return true;
  return b.blocks.some((bl) => bl.type === 'text' && bl.mode === 'variable');
}

function interBlockHint(
  prev: UiBlock,
  curr: UiBlock,
  textDeliveryMode: BroadcastTextDeliveryMode,
): 'merged-text' | 'delay' {
  if (textDeliveryMode === 'merged' && prev.kind === 'text' && curr.kind === 'text') {
    return 'merged-text';
  }
  return 'delay';
}

type MergedPreviewSeg = { kind: 'textRun'; body: string } | { kind: 'media'; label: string };

/** Pré-visualização no modo texto unificado: mantém a ordem (trechos de texto vs mídia). */
function buildMergedPreviewSegments(blocks: UiBlock[]): MergedPreviewSeg[] {
  const out: MergedPreviewSeg[] = [];
  let textBuf: string[] = [];

  const flushText = () => {
    const joined = textBuf.join('\n\n').trim();
    textBuf = [];
    if (joined) out.push({ kind: 'textRun', body: joined });
  };

  for (const b of blocks) {
    if (b.kind === 'text') {
      const t = b.content.trim();
      if (t) textBuf.push(t);
    } else {
      flushText();
      out.push({ kind: 'media', label: b.mediaType });
    }
  }
  flushText();
  return out;
}

function isoToDatetimeLocal(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Rascunho com blocos reais no banco (não formato legado baseMessage). */
function isBroadcastEditable(b: BroadcastDto): boolean {
  return b.status === 'draft' && b.baseMessage === undefined;
}

function dtoToUiBlocks(dto: BroadcastDto): UiBlock[] {
  const sorted = [...dto.blocks].sort((a, b) => a.order - b.order);
  return sorted.map((bl) => {
    if (bl.type === 'text') {
      return { id: newBlockId(), kind: 'text', content: bl.content ?? '', mode: bl.mode ?? 'fixed' };
    }
    return {
      id: newBlockId(),
      kind: 'media',
      mediaType: bl.mediaType ?? 'document',
      file: null,
      caption: bl.caption ?? '',
      audioPtt: bl.audioPtt ?? false,
      preservedFromServer: bl.hasMedia,
      serverMediaLabel: bl.hasMedia ? bl.mediaFilename || 'Arquivo da campanha' : undefined,
    };
  });
}

export default function BroadcastPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { tenantId } = useTenant();
  const { data: broadcasts, isLoading } = useBroadcasts(sessionId);
  const createBroadcast = useCreateBroadcast(sessionId);
  const updateBroadcast = useUpdateBroadcast(sessionId);
  const startBroadcast = useStartBroadcast(sessionId);
  const cancelBroadcast = useCancelBroadcast(sessionId);

  const [showForm, setShowForm] = useState(false);
  const [editingBroadcastId, setEditingBroadcastId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [actionError, setActionError] = useState('');
  const [name, setName] = useState('');
  const [blocks, setBlocks] = useState<UiBlock[]>([
    { id: newBlockId(), kind: 'text', content: '', mode: 'fixed' },
  ]);
  const [deliveryChannel, setDeliveryChannel] = useState<'baileys_web' | 'cloud_api'>('baileys_web');
  const [textDeliveryMode, setTextDeliveryMode] = useState<BroadcastTextDeliveryMode>('per_block');
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
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [attachSourceBlockId, setAttachSourceBlockId] = useState<string | null>(null);
  const [galleryPickBlockId, setGalleryPickBlockId] = useState<string | null>(null);
  const [pendingFileBlockId, setPendingFileBlockId] = useState<string | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pendingMediaBlock =
    pendingFileBlockId != null
      ? blocks.find((b): b is UiMediaBlock => b.kind === 'media' && b.id === pendingFileBlockId)
      : undefined;

  const galleryMediaBlock =
    galleryPickBlockId != null
      ? blocks.find((b): b is UiMediaBlock => b.kind === 'media' && b.id === galleryPickBlockId)
      : undefined;

  const addTextBlock = () => {
    setBlocks((prev) => [...prev, { id: newBlockId(), kind: 'text', content: '', mode: 'fixed' }]);
    setShowAddMenu(false);
  };

  const addMediaBlock = (mediaType: UiMediaBlock['mediaType']) => {
    setBlocks((prev) => [
      ...prev,
      { id: newBlockId(), kind: 'media', mediaType, file: null, caption: '', audioPtt: false },
    ]);
    setShowAddMenu(false);
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const updateTextBlock = (id: string, patch: Partial<Pick<UiTextBlock, 'content' | 'mode'>>) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id && b.kind === 'text' ? { ...b, ...patch } : b)),
    );
  };

  const updateMediaBlock = (
    id: string,
    patch: Partial<Pick<UiMediaBlock, 'mediaType' | 'file' | 'caption' | 'audioPtt' | 'preservedFromServer' | 'serverMediaLabel'>>,
  ) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id || b.kind !== 'media') return b;
        const next = { ...b, ...patch };
        if (patch.file != null) {
          next.preservedFromServer = false;
          next.serverMediaLabel = undefined;
        }
        return next;
      }),
    );
  };

  const handleGalleryPick = async (item: MediaItemDto) => {
    const blockId = galleryPickBlockId;
    const b = galleryMediaBlock;
    if (!blockId || !b) return;
    if (item.type !== b.mediaType) {
      setFormError(`Este bloco é do tipo “${b.mediaType}”; o item da galeria é “${item.type}”.`);
      return;
    }
    setFormError('');
    setGalleryLoading(true);
    try {
      const file = await downloadMediaItemAsFile(tenantId, sessionId, item);
      updateMediaBlock(blockId, { file, preservedFromServer: false });
      setGalleryPickBlockId(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Não foi possível carregar o arquivo da galeria.');
    } finally {
      setGalleryLoading(false);
    }
  };

  const buildPayloadBlocks = (): CreateBroadcastBlock[] | null => {
    const out: CreateBroadcastBlock[] = [];
    for (const b of blocks) {
      if (b.kind === 'text') {
        if (!b.content.trim()) return null;
        out.push({ type: 'text', content: b.content.trim(), mode: b.mode });
      } else {
        if (!b.file) return null;
        out.push({
          type: 'media',
          mediaType: b.mediaType,
          file: b.file,
          caption: b.caption.trim() || undefined,
          audioPtt: b.mediaType === 'audio' ? b.audioPtt : undefined,
        });
      }
    }
    return out;
  };

  const buildUpdatePayloadBlocks = (): UpdateBroadcastBlock[] | null => {
    const out: UpdateBroadcastBlock[] = [];
    for (const b of blocks) {
      if (b.kind === 'text') {
        if (!b.content.trim()) return null;
        out.push({ type: 'text', content: b.content.trim(), mode: b.mode });
      } else if (b.file) {
        out.push({
          type: 'media',
          mediaType: b.mediaType,
          file: b.file,
          caption: b.caption.trim() || undefined,
          audioPtt: b.mediaType === 'audio' ? b.audioPtt : undefined,
        });
      } else if (b.preservedFromServer) {
        out.push({
          type: 'media',
          mediaType: b.mediaType,
          keepExisting: true,
          caption: b.caption.trim() || undefined,
          audioPtt: b.mediaType === 'audio' ? b.audioPtt : undefined,
        });
      } else {
        return null;
      }
    }
    return out;
  };

  const resetFormToNew = () => {
    setEditingBroadcastId(null);
    setName('');
    setBlocks([{ id: newBlockId(), kind: 'text', content: '', mode: 'fixed' }]);
    setDeliveryChannel('baileys_web');
    setTextDeliveryMode('per_block');
    setRecipientLimit('500');
    setFunnelStage('');
    setTemperature('');
    setCategory('');
    setTagsStr('');
    setSearch('');
    setCreatedAtFrom('');
    setCreatedAtTo('');
    setFacebookCampaign('');
    setValueMin('');
    setValueMax('');
    setCcl('');
    setMinDelay('5');
    setMaxDelay('15');
    setDelayPatternStr('');
    setBatchSize('5');
    setPauseBatch('60');
    setFormError('');
  };

  const openEditBroadcast = (b: BroadcastDto) => {
    setEditingBroadcastId(b._id);
    setName(b.name);
    setDeliveryChannel(b.deliveryChannel);
    setTextDeliveryMode(b.textDeliveryMode ?? 'per_block');
    setRecipientLimit(String(Math.max(1, b.totalRecipients || 500)));
    setFunnelStage(b.filters.funnelStage ?? '');
    setTemperature(b.filters.temperature ?? '');
    setCategory(b.filters.category ?? '');
    setTagsStr(b.filters.tags?.join(', ') ?? '');
    setSearch(b.filters.search ?? '');
    setCreatedAtFrom(isoToDatetimeLocal(b.filters.createdAtFrom));
    setCreatedAtTo(isoToDatetimeLocal(b.filters.createdAtTo));
    setFacebookCampaign(b.filters.facebookCampaign ?? '');
    setValueMin(b.filters.valueMin != null ? String(b.filters.valueMin) : '');
    setValueMax(b.filters.valueMax != null ? String(b.filters.valueMax) : '');
    setCcl(b.filters.ccl ?? '');
    setMinDelay(String(Math.round(b.cadence.minDelayMs / 1000)));
    setMaxDelay(String(Math.round(b.cadence.maxDelayMs / 1000)));
    setBatchSize(String(b.cadence.batchSize));
    setPauseBatch(String(Math.round(b.cadence.pauseBetweenBatchesMs / 1000)));
    setDelayPatternStr(
      b.cadence.delayPatternMs?.length ? b.cadence.delayPatternMs.map((ms) => String(ms / 1000)).join(', ') : '',
    );
    setBlocks(dtoToUiBlocks(b));
    setFormError('');
    setShowForm(true);
  };

  const submitBroadcastForm = () => {
    if (!name.trim()) return;
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

    const sharedBody = {
      name: name.trim(),
      textDeliveryMode,
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
    };

    if (editingBroadcastId) {
      const payloadBlocks = buildUpdatePayloadBlocks();
      if (!payloadBlocks || payloadBlocks.length === 0) {
        setFormError('Preencha todos os blocos (texto ou mídia; mantenha a mídia já salva ou envie arquivo novo).');
        return;
      }
      updateBroadcast.mutate(
        { broadcastId: editingBroadcastId, body: { ...sharedBody, blocks: payloadBlocks } },
        {
          onSuccess: () => {
            setShowForm(false);
            resetFormToNew();
          },
          onError: (err) => {
            setFormError(err instanceof ApiError ? err.message : 'Falha ao salvar campanha');
          },
        },
      );
      return;
    }

    const payloadBlocks = buildPayloadBlocks();
    if (!payloadBlocks || payloadBlocks.length === 0) {
      setFormError('Adicione pelo menos um bloco válido (texto preenchido ou arquivo de mídia).');
      return;
    }

    createBroadcast.mutate(
      { ...sharedBody, blocks: payloadBlocks },
      {
        onSuccess: () => {
          setShowForm(false);
          resetFormToNew();
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

  const blocksValid =
    blocks.length > 0 &&
    blocks.every((b) =>
      b.kind === 'text'
        ? b.content.trim().length > 0
        : b.file !== null || b.preservedFromServer === true,
    );

  const savePending = createBroadcast.isPending || updateBroadcast.isPending;
  const canSubmit = Boolean(name.trim() && blocksValid && !savePending);

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
            <Button
              onClick={() => {
                resetFormToNew();
                setShowForm(true);
              }}
              className="h-10 gap-2"
            >
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
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {editingBroadcastId ? 'Editar campanha' : 'Nova campanha'}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Monte a sequência de blocos. Com <strong>um WhatsApp por bloco de texto</strong>, há ~10–15s aleatórios entre cada
                envio. Com <strong>texto unificado</strong>, blocos de texto consecutivos viram uma única mensagem (separados por
                linha em branco); blocos de mídia continuam em envios separados. Entre um destinatário e outro vale a cadência
                abaixo.
                {editingBroadcastId && ' Ao salvar, a lista de destinatários é recalculada com os filtros e o limite abaixo.'}
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

            <div className="space-y-3 rounded-xl border border-border/40 bg-muted/5 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Envio dos blocos de texto</p>
              <div className="mt-2 flex flex-col gap-2">
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug">
                  <input
                    type="radio"
                    name="text-delivery-mode"
                    checked={textDeliveryMode === 'per_block'}
                    onChange={() => setTextDeliveryMode('per_block')}
                    className="mt-0.5 h-3.5 w-3.5 border-input text-primary"
                  />
                  <span>
                    <span className="font-medium text-foreground">Um WhatsApp por bloco de texto</span>
                    <span className="block text-[10px] text-muted-foreground">Cada bloco de texto é uma mensagem; ~10–15s entre blocos.</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-snug">
                  <input
                    type="radio"
                    name="text-delivery-mode"
                    checked={textDeliveryMode === 'merged'}
                    onChange={() => setTextDeliveryMode('merged')}
                    className="mt-0.5 h-3.5 w-3.5 border-input text-primary"
                  />
                  <span>
                    <span className="font-medium text-foreground">Texto unificado</span>
                    <span className="block text-[10px] text-muted-foreground">
                      Vários blocos de texto seguidos viram <strong>uma</strong> mensagem (partes com linha em branco). Cada bloco
                      variável (IA) ainda é reescrito por trecho antes de juntar. Mídia continua em mensagens à parte.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blocos da mensagem</p>
                  <p className="text-[10px] text-muted-foreground">Ordem = ordem de envio. Texto: fixo ou variado pela IA por destinatário.</p>
                </div>
                <div className="relative">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddMenu((v) => !v)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Adicionar bloco
                  </Button>
                  {showAddMenu && (
                    <div
                      className="absolute right-0 z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-card py-1 shadow-lg"
                      role="menu"
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-muted/60"
                        onClick={addTextBlock}
                      >
                        Texto
                      </button>
                      <div className="border-t border-border/60 px-2 py-1 text-[9px] font-semibold uppercase text-muted-foreground">Mídia</div>
                      <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-muted/60" onClick={() => addMediaBlock('image')}>
                        Imagem
                      </button>
                      <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-muted/60" onClick={() => addMediaBlock('audio')}>
                        Áudio
                      </button>
                      <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-muted/60" onClick={() => addMediaBlock('video')}>
                        Vídeo
                      </button>
                      <button type="button" className="block w-full px-3 py-2 text-left text-xs hover:bg-muted/60" onClick={() => addMediaBlock('document')}>
                        Arquivo / documento
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-3" aria-label="Lista de blocos">
                {blocks.map((b, index) => (
                  <li key={b.id}>
                    {index > 0 && (
                      <p className="mb-2 text-center text-[9px] font-medium text-primary/70">
                        {interBlockHint(blocks[index - 1]!, b, textDeliveryMode) === 'merged-text' ? (
                          <>↳ Textos unificados no mesmo envio</>
                        ) : (
                          <>↓ ~10–15s aleatórios ↓</>
                        )}
                      </p>
                    )}
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Bloco {index + 1}
                          {b.kind === 'text' ? ' · Texto' : ` · ${b.mediaType}`}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                            Subir
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[10px]"
                            onClick={() => moveBlock(index, 1)}
                            disabled={index === blocks.length - 1}
                          >
                            Descer
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[10px] text-destructive"
                            onClick={() => removeBlock(b.id)}
                            disabled={blocks.length <= 1}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>

                      {b.kind === 'text' && (
                        <>
                          <div className="flex flex-wrap gap-3">
                            <label className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="radio"
                                name={`mode-${b.id}`}
                                checked={b.mode === 'fixed'}
                                onChange={() => updateTextBlock(b.id, { mode: 'fixed' })}
                                className="h-3.5 w-3.5 border-input text-primary"
                              />
                              Fixo (sem IA)
                            </label>
                            <label className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="radio"
                                name={`mode-${b.id}`}
                                checked={b.mode === 'variable'}
                                onChange={() => updateTextBlock(b.id, { mode: 'variable' })}
                                className="h-3.5 w-3.5 border-input text-primary"
                              />
                              Variável (IA anti-bloqueio)
                            </label>
                          </div>
                          <textarea
                            value={b.content}
                            onChange={(e) => updateTextBlock(b.id, { content: e.target.value })}
                            placeholder="Digite o texto deste bloco…"
                            rows={3}
                            className="w-full resize-none rounded-xl border border-input bg-card/80 px-3 py-2.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Texto do bloco ${index + 1}`}
                          />
                        </>
                      )}

                      {b.kind === 'media' && (
                        <>
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-muted-foreground">Arquivo</span>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs"
                                onClick={() => setAttachSourceBlockId(b.id)}
                              >
                                {b.file || b.preservedFromServer ? 'Trocar arquivo' : 'Selecionar arquivo'}
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              Escolha entre arquivo neste dispositivo ou item da galeria da sessão.
                            </p>
                            {b.preservedFromServer && !b.file && b.serverMediaLabel && (
                              <p className="text-[10px] font-medium text-emerald-600/90 dark:text-emerald-400/90">
                                Mantendo: {b.serverMediaLabel} (sem reenvio até você trocar)
                              </p>
                            )}
                            {b.file && (
                              <>
                                <p className="text-[10px] text-muted-foreground">
                                  Selecionado: {b.file.name} ({Math.round(b.file.size / 1024)} KB)
                                </p>
                                {b.mediaType === 'image' && b.file.type.startsWith('image/') && (
                                  <BroadcastMediaFilePreview file={b.file} />
                                )}
                                {b.mediaType === 'video' && b.file.type.startsWith('video/') && (
                                  <BroadcastMediaFilePreview file={b.file} />
                                )}
                                {b.mediaType === 'audio' && b.file.type.startsWith('audio/') && (
                                  <BroadcastMediaFilePreview file={b.file} />
                                )}
                              </>
                            )}
                          </div>
                          {(b.mediaType === 'image' || b.mediaType === 'video') && (
                            <div className="space-y-1">
                              <label className="text-[10px] text-muted-foreground" htmlFor={`cap-${b.id}`}>
                                Legenda (opcional)
                              </label>
                              <Input
                                id={`cap-${b.id}`}
                                value={b.caption}
                                onChange={(e) => updateMediaBlock(b.id, { caption: e.target.value })}
                                className="h-9 text-xs"
                                maxLength={1024}
                              />
                            </div>
                          )}
                          {b.mediaType === 'audio' && (
                            <label className="flex cursor-pointer items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={b.audioPtt}
                                onChange={(e) => updateMediaBlock(b.id, { audioPtt: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary"
                              />
                              Enviar como nota de voz (PTT)
                            </label>
                          )}
                          <div className="space-y-1">
                            <label className="text-[10px] text-muted-foreground">Tipo de mídia</label>
                            <select
                              value={b.mediaType}
                              disabled={Boolean(b.preservedFromServer && !b.file)}
                              title={
                                b.preservedFromServer && !b.file
                                  ? 'Troque o arquivo para mudar o tipo de mídia'
                                  : undefined
                              }
                              onChange={(e) =>
                                updateMediaBlock(b.id, {
                                  mediaType: e.target.value as UiMediaBlock['mediaType'],
                                })
                              }
                              className="h-9 w-full max-w-xs cursor-pointer rounded-lg border border-input bg-card px-2 text-xs shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="image">Imagem</option>
                              <option value="audio">Áudio</option>
                              <option value="video">Vídeo</option>
                              <option value="document">Documento</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {blocks.some((b) => b.kind === 'text' && b.content.trim()) && (
              <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pré-visualização (texto bruto)</p>
                <p className="text-[10px] text-muted-foreground">
                  Blocos variáveis mostram o texto base; a IA reescreve no envio.
                  {textDeliveryMode === 'merged' && (
                    <span className="block mt-1">
                      Modo unificado: a prévia abaixo mostra como as partes de texto aparecerão juntas (sem IA aplicada aqui).
                    </span>
                  )}
                </p>
                {textDeliveryMode === 'merged' ? (
                  <div className="mt-2 space-y-2 text-xs text-foreground/80">
                    {(() => {
                      const segs = buildMergedPreviewSegments(blocks);
                      if (segs.length === 0) return <p className="text-muted-foreground">—</p>;
                      let textRunIdx = 0;
                      return segs.map((seg, i) => {
                        if (seg.kind === 'textRun') {
                          textRunIdx += 1;
                          return (
                            <p
                              key={`t-${i}`}
                              className="whitespace-pre-wrap rounded-lg bg-card/50 p-3 ring-1 ring-border/40"
                            >
                              <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-primary/80">
                                Texto unificado (envio de texto nº {textRunIdx})
                              </span>
                              {seg.body}
                            </p>
                          );
                        }
                        return (
                          <p
                            key={`m-${i}`}
                            className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground"
                          >
                            Mídia ({seg.label}) — envio separado
                          </p>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="mt-2 space-y-2 text-xs text-foreground/80">
                    {blocks.map((b, i) =>
                      b.kind === 'text' && b.content.trim() ? (
                        <p key={b.id} className="whitespace-pre-wrap rounded-lg bg-card/50 p-2 ring-1 ring-border/40">
                          <span className="font-semibold text-primary/80">#{i + 1}</span> {b.content.trim()}
                          {b.mode === 'variable' ? ' · (IA)' : ''}
                        </p>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            )}

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
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cadência (entre destinatários)</p>
              <p className="text-[10px] text-muted-foreground">
                Se preencher <strong>sequência</strong>, ela substitui o delay aleatório min/max entre cada <strong>destinatário</strong> (valores em
                segundos, ex.: 10, 15, 25).
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
                onClick={submitBroadcastForm}
                disabled={!canSubmit}
                title={!name.trim() ? 'Preencha o nome' : !blocksValid ? 'Preencha todos os blocos' : undefined}
                className="gap-2"
              >
                {savePending ? <Spinner className="h-4 w-4" /> : editingBroadcastId ? 'Salvar alterações' : 'Criar campanha'}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetFormToNew();
                }}
              >
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
          {broadcasts?.map((b, i) => {
            const startingThis =
              startBroadcast.isPending && startBroadcast.variables === b._id;
            return (
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
                    {campaignUsesAi(b) && (
                      <Badge variant="info" className="text-[9px]">
                        IA
                      </Badge>
                    )}
                    {(b.textDeliveryMode ?? 'per_block') === 'merged' && (
                      <Badge variant="muted" className="text-[9px]">
                        Texto unificado
                      </Badge>
                    )}
                  </div>
                  <p className="mb-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{broadcastBlocksSummary(b.blocks)}</p>
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
                  {b.failedCount > 0 && b.sampleRecipientError && (
                    <p
                      className="mt-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-[11px] leading-snug text-destructive"
                      title={b.sampleRecipientError}
                    >
                      {b.sampleRecipientError}
                    </p>
                  )}

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

                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-stretch">
                  {b.status === 'draft' && isBroadcastEditable(b) && (
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => openEditBroadcast(b)}
                      className="cursor-pointer gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Editar
                    </Button>
                  )}
                  {b.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionError('');
                        startBroadcast.mutate(b._id, {
                          onError: (err) => {
                            setActionError(
                              err instanceof ApiError
                                ? `${err.message}`
                                : 'Não foi possível iniciar a campanha.',
                            );
                          },
                        });
                      }}
                      disabled={startBroadcast.isPending}
                      aria-busy={startingThis}
                      className="min-w-30 cursor-pointer gap-2"
                    >
                      {startingThis ? (
                        <>
                          <Spinner className="h-3.5 w-3.5 shrink-0" />
                          <span>Iniciando…</span>
                        </>
                      ) : (
                        'Iniciar'
                      )}
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
            );
          })}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        accept={pendingMediaBlock ? acceptForMediaType(pendingMediaBlock.mediaType) : '*/*'}
        onChange={(e) => {
          const id = pendingFileBlockId;
          setPendingFileBlockId(null);
          const f = e.target.files?.[0];
          if (id && f) updateMediaBlock(id, { file: f });
          e.target.value = '';
        }}
      />

      <AttachSourceModal
        open={attachSourceBlockId !== null}
        onOpenChange={(open) => {
          if (!open) setAttachSourceBlockId(null);
        }}
        onChooseComputer={() => {
          const id = attachSourceBlockId;
          setAttachSourceBlockId(null);
          if (id) {
            setPendingFileBlockId(id);
            requestAnimationFrame(() => fileInputRef.current?.click());
          }
        }}
        onChooseGallery={() => {
          const id = attachSourceBlockId;
          setAttachSourceBlockId(null);
          if (id) setGalleryPickBlockId(id);
        }}
      />

      <GalleryPickerModal
        open={galleryPickBlockId !== null && galleryMediaBlock != null}
        onOpenChange={(open) => {
          if (!open) setGalleryPickBlockId(null);
        }}
        sessionId={sessionId}
        onPick={handleGalleryPick}
        isSending={galleryLoading}
        lockTypeFilter
        initialTypeFilter={galleryMediaBlock?.mediaType ?? 'image'}
      />
    </AppPageShell>
  );
}
