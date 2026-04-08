'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useMessages, useSendMessage, useSendMedia } from '@/hooks/use-messages';
import {
  useLead,
  useCreateLead,
  useUpdateFunnel,
  useAddObservation,
  useSetBlocked,
} from '@/hooks/use-leads';
import { formatJid, formatContactAddress, formatTimestamp, cn } from '@/lib/utils';
import { FUNNEL_STAGES, LEAD_CATEGORIES, type LeadCategory, type LeadFunnelStage } from '@/lib/types/whatsapp';
import { notifyYaguarSaleRegistered } from '@/lib/yaguar-sale-contract';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { EmojiPicker } from '@/components/emoji-picker';
import { ScheduleMessageDialog } from '@/components/schedule-message-dialog';
import { AttachSourceModal, GalleryPickerModal } from '@/components/attach-media-modals';
import { QuickAudioLibraryModal } from '@/components/quick-audio-library-modal';
import { MessageMediaBlock } from '@/components/message-media';
import { useCreateMeeting } from '@/hooks/use-meetings';
import { useCreateSale } from '@/hooks/use-sales';
import { useChats } from '@/hooks/use-chats';
import { useTenant } from '@/lib/tenant-context';
import { downloadMediaItemAsFile, exportConversationForCrm } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { MediaItemDto } from '@/lib/types/whatsapp';

type Props = {
  sessionId: string;
  activeJid: string;
  disabled?: boolean;
};

type QuickAction = 'none' | 'funnel' | 'observation' | 'create-lead' | 'lost' | 'meeting' | 'sale';

function fallbackMediaLabel(contentType?: string): string {
  switch (contentType) {
    case 'imageMessage':
      return '📷 Imagem';
    case 'videoMessage':
      return '▶ Vídeo';
    case 'audioMessage':
      return '🎤 Áudio';
    case 'documentMessage':
      return '📎 Documento';
    case 'stickerMessage':
      return 'Figurinha';
    default:
      return `[${contentType ?? 'mídia'}]`;
  }
}

export function MessageThread({ sessionId, activeJid, disabled }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [activeAction, setActiveAction] = useState<QuickAction>('none');
  const [obsText, setObsText] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createValue, setCreateValue] = useState('');
  const [createCcl, setCreateCcl] = useState('');
  const [createCategory, setCreateCategory] = useState<LeadCategory>('outro');
  const [createFunnelStage, setCreateFunnelStage] = useState<LeadFunnelStage>('novo');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [saleProduct, setSaleProduct] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [showAttachSource, setShowAttachSource] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showQuickAudios, setShowQuickAudios] = useState(false);
  const [gallerySending, setGallerySending] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { tenantId } = useTenant();
  const { data: messages, isLoading, isError } = useMessages(sessionId, activeJid || undefined);
  const send = useSendMessage(sessionId);
  const sendMedia = useSendMedia(sessionId);

  const { data: lead } = useLead(sessionId, activeJid);
  const { data: chats } = useChats(sessionId, {});
  const activeChat = chats?.find((c) => c.remoteJid === activeJid);
  const peerDisplayName =
    lead?.name || activeChat?.lastPushName || formatContactAddress(activeJid, activeChat?.displayRemoteJid);
  const createLead = useCreateLead(sessionId);
  const updateFunnel = useUpdateFunnel(sessionId);
  const addObservation = useAddObservation(sessionId);
  const setBlocked = useSetBlocked(sessionId);
  const createMeeting = useCreateMeeting(sessionId);
  const createSale = useCreateSale(sessionId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setShowActions(false);
    setActiveAction('none');
    setShowEmoji(false);
    setShowSchedule(false);
    setShowAttachSource(false);
    setShowGalleryPicker(false);
    setShowQuickAudios(false);
    setCreateName('');
    setCreatePhone('');
    setCreateValue('');
    setCreateCcl('');
    setCreateCategory('outro');
    setCreateFunnelStage('novo');
  }, [activeJid]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
         mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeJid || disabled) return;

    setError('');
    send.mutate(
      { remoteJid: activeJid, text: text.trim() },
      {
        onSuccess: () => setText(''),
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Falha ao enviar');
        },
      },
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeJid) return;
    setError('');
    const voiceNote = file.type.startsWith('audio/');
    sendMedia.mutate(
      { remoteJid: activeJid, file, ...(voiceNote ? { mediaType: 'audio' as const, ptt: true } : {}) },
      {
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Falha ao enviar mídia');
        },
      },
    );
    e.target.value = '';
  };

  const openComputerUpload = () => {
    window.setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleGalleryPick = async (item: MediaItemDto) => {
    if (!activeJid) return;
    setGallerySending(true);
    setError('');
    try {
      const file = await downloadMediaItemAsFile(tenantId, sessionId, item);
      await sendMedia.mutateAsync({
        remoteJid: activeJid,
        file,
        mediaType: item.type,
        ...(item.type === 'audio' ? { ptt: true } : {}),
      });
      setShowGalleryPicker(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar da galeria');
    } finally {
      setGallerySending(false);
    }
  };

  const handleQuickAudioSend = async (item: MediaItemDto) => {
    if (!activeJid) return;
    setGallerySending(true);
    setError('');
    try {
      const file = await downloadMediaItemAsFile(tenantId, sessionId, item);
      await sendMedia.mutateAsync({
        remoteJid: activeJid,
        file,
        mediaType: 'audio',
        ptt: true,
      });
      setShowQuickAudios(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao enviar áudio');
    } finally {
      setGallerySending(false);
    }
  };

  const handleExportHistory = async () => {
    if (!activeJid) return;
    setExportBusy(true);
    setError('');
    try {
      const payload = await exportConversationForCrm(tenantId, sessionId, activeJid);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historico-whatsapp-${activeJid.replace(/[^\w@.-]+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowActions(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao exportar histórico');
    } finally {
      setExportBusy(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Permissão de microfone negada. Verifique as configurações do navegador.');
    }
  };

  const stopRecordingTracks = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    stopRecordingTracks();
    audioChunksRef.current = [];
    setRecordingDuration(0);
  };

  const sendRecording = () => {
    stopRecordingTracks();
    setTimeout(() => {
      if (!activeJid || audioChunksRef.current.length === 0) return;
      const type = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type });
      const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type });

      setError('');
      sendMedia.mutate(
        { remoteJid: activeJid, file: audioFile, ptt: true },
        {
          onError: (err) => {
            setError(err instanceof ApiError ? err.message : 'Falha ao enviar áudio');
          },
        }
      );
      audioChunksRef.current = [];
      setRecordingDuration(0);
    }, 200); // Dar tempo ao MediaRecorder para gerar o último ondataavailable
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuickFunnel = (stage: string) => {
    updateFunnel.mutate({ remoteJid: activeJid, funnelStage: stage });
    setActiveAction('none');
    setShowActions(false);
  };

  const handleQuickObservation = () => {
    if (!obsText.trim()) return;
    addObservation.mutate(
      { remoteJid: activeJid, observation: obsText.trim() },
      { onSuccess: () => { setObsText(''); setActiveAction('none'); setShowActions(false); } },
    );
  };

  const handleQuickCreateLead = () => {
    const valueNum = createValue.trim() ? Number(createValue.replace(',', '.')) : undefined;
    createLead.mutate(
      {
        remoteJid: activeJid,
        name: createName.trim() || undefined,
        phone: createPhone.trim() || undefined,
        value: valueNum !== undefined && !Number.isNaN(valueNum) ? valueNum : undefined,
        ccl: createCcl.trim() || undefined,
        category: createCategory,
        funnelStage: createFunnelStage,
      },
      {
        onSuccess: () => {
          setCreateName('');
          setCreatePhone('');
          setCreateValue('');
          setCreateCcl('');
          setCreateCategory('outro');
          setCreateFunnelStage('novo');
          setActiveAction('none');
          setShowActions(false);
        },
      },
    );
  };

  const handleQuickMeeting = () => {
    if (!meetingTitle.trim() || !meetingDate) return;
    createMeeting.mutate(
      {
        remoteJid: activeJid,
        title: meetingTitle.trim(),
        scheduledAt: new Date(meetingDate).toISOString(),
      },
      {
        onSuccess: () => {
          setMeetingTitle('');
          setMeetingDate('');
          setActiveAction('none');
          setShowActions(false);
        },
      },
    );
  };

  const handleQuickSale = () => {
    if (!saleProduct.trim() || !saleValue) return;
    createSale.mutate(
      {
        remoteJid: activeJid,
        product: saleProduct.trim(),
        value: Number(saleValue),
        leadName: lead?.name,
      },
      {
        onSuccess: (res) => {
          notifyYaguarSaleRegistered({
            version: 1,
            tenantId,
            sessionId,
            remoteJid: activeJid,
            sale: res.sale,
          });
          setSaleProduct('');
          setSaleValue('');
          setActiveAction('none');
          setShowActions(false);
        },
      },
    );
  };

  const handleQuickLost = () => {
    updateFunnel.mutate(
      { remoteJid: activeJid, funnelStage: 'perdido' },
      { onSuccess: () => { setActiveAction('none'); setShowActions(false); } },
    );
  };

  if (!activeJid) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          }
          title="Selecione uma conversa"
          description="Escolha um contato na lista ou digite um número para iniciar."
        />
      </div>
    );
  }

  return (
    <div className="isolate flex h-full flex-col">
      {/* Header with quick actions — z-index acima da lista de mensagens para o menu não ficar atrás das bolhas */}
      <div className="relative z-30 flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {peerDisplayName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {peerDisplayName}
            </p>
            {(lead?.name || activeChat?.lastPushName) && (
              <p className="truncate font-mono text-[10px] text-muted-foreground" title={activeJid}>
                {formatContactAddress(activeJid, activeChat?.displayRemoteJid)}
              </p>
            )}
            {lead && (
              <p className="text-[10px] text-muted-foreground">
                {FUNNEL_STAGES.find((s) => s.value === lead.funnelStage)?.label}
                {lead.temperature && ` · ${lead.temperature}`}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions button */}
        <div className="relative" ref={actionsRef}>
          <button
            type="button"
            onClick={() => setShowActions((v) => !v)}
            aria-expanded={showActions}
            aria-haspopup="menu"
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer',
              showActions
                ? 'border-primary/35 bg-primary/12 text-primary shadow-[0_0_0_1px_rgba(52,211,153,0.12)]'
                : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
            <span className="hidden sm:inline">Ações</span>
          </button>

          {showActions && (
            <div
              role="menu"
              className={cn(
                'absolute right-0 top-full z-100 mt-2 max-h-[min(72vh,540px)] animate-slide-up',
                'w-[min(20rem,calc(100vw-1.25rem))] overflow-y-auto overflow-x-hidden',
                'rounded-2xl border border-border/50 bg-card/95 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
                'ring-1 ring-primary/8',
                activeAction === 'none' ? 'min-w-70 py-2' : 'min-w-76 py-3',
              )}
            >
              {activeAction === 'none' && (
                <>
                  <ActionMenuSectionLabel className="pt-0">CRM</ActionMenuSectionLabel>
                  <ActionMenuItem
                    icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                    label={exportBusy ? 'Exportando…' : 'Exportar histórico (CRM)'}
                    onClick={() => void handleExportHistory()}
                    disabled={exportBusy}
                  />
                  {!lead && (
                    <ActionMenuItem
                      icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      label="Criar contato"
                      onClick={() => setActiveAction('create-lead')}
                    />
                  )}
                  {lead && (
                    <>
                      <ActionMenuSectionLabel>Pipeline</ActionMenuSectionLabel>
                      <ActionMenuItem
                        icon="M22 11.08V12a10 10 0 1 1-5.93-9.14"
                        label="Mover funil"
                        onClick={() => setActiveAction('funnel')}
                      />
                      <ActionMenuItem
                        icon="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                        label="Adicionar observação"
                        onClick={() => setActiveAction('observation')}
                      />
                      <ActionMenuItem
                        icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        label="Agendar reunião"
                        onClick={() => setActiveAction('meeting')}
                        highlight="calendar"
                      />
                      <ActionMenuItem
                        icon="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                        label="Registrar venda"
                        onClick={() => setActiveAction('sale')}
                      />
                      <ActionMenuSectionLabel className="mt-1">Risco</ActionMenuSectionLabel>
                      <ActionMenuItem
                        icon="M18 6L6 18M6 6l12 12"
                        label="Marcar como perdido"
                        onClick={handleQuickLost}
                        destructive
                      />
                      <div className="mx-2 my-2 h-px bg-border/60" role="separator" />
                      <ActionMenuItem
                        icon={lead.blocked
                          ? 'M18 11V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h4'
                          : 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10'}
                        label={lead.blocked ? 'Desbloquear contato' : 'Bloquear contato'}
                        onClick={() => {
                          setBlocked.mutate({ remoteJid: activeJid, blocked: !lead.blocked });
                          setShowActions(false);
                        }}
                        destructive={!lead.blocked}
                      />
                    </>
                  )}
                </>
              )}

              {activeAction === 'funnel' && (
                <div className="space-y-2 px-3">
                  <SubPanelHeader title="Mover no funil" onBack={() => setActiveAction('none')} />
                  <p className="text-[10px] text-muted-foreground">Escolha a etapa para este lead.</p>
                  <div className="flex flex-col gap-0.5 pb-1">
                    {FUNNEL_STAGES.map((stage) => (
                      <button
                        key={stage.value}
                        type="button"
                        disabled={updateFunnel.isPending}
                        onClick={() => handleQuickFunnel(stage.value)}
                        className={cn(
                          'rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors cursor-pointer',
                          lead?.funnelStage === stage.value
                            ? 'bg-primary/15 text-primary ring-1 ring-primary/25'
                            : 'text-foreground hover:bg-muted/80',
                        )}
                      >
                        {stage.label}
                        {lead?.funnelStage === stage.value && (
                          <span className="ml-1.5 text-[10px] opacity-80">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeAction === 'observation' && (
                <div className="space-y-3 px-3">
                  <SubPanelHeader title="Observação" onBack={() => setActiveAction('none')} />
                  <textarea
                    value={obsText}
                    onChange={(e) => setObsText(e.target.value)}
                    placeholder="Anotação visível no lead…"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-border/60 bg-muted/25 px-3 py-2.5 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                  <Button
                    size="xs"
                    className="h-9 w-full rounded-xl text-xs font-semibold"
                    disabled={addObservation.isPending || !obsText.trim()}
                    onClick={handleQuickObservation}
                  >
                    {addObservation.isPending ? <Spinner className="h-3 w-3" /> : 'Salvar observação'}
                  </Button>
                </div>
              )}

              {activeAction === 'meeting' && (
                <div className="space-y-3 px-3">
                  <SubPanelHeader
                    title="Agendar reunião"
                    subtitle="Título e data/hora são salvos na agenda deste contato."
                    onBack={() => setActiveAction('none')}
                  />
                  <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/7 via-card to-card p-3 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.12)]">
                    <div
                      className="pointer-events-none absolute inset-y-2 left-0 w-1 rounded-full bg-linear-to-b from-primary via-secondary to-primary/40"
                      aria-hidden
                    />
                    <div className="space-y-3 pl-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-foreground">Nova reunião</p>
                          <p className="text-[10px] leading-snug text-muted-foreground">Fuso do navegador · ajuste se precisar</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="mtg-title" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Título
                        </label>
                        <Input
                          id="mtg-title"
                          value={meetingTitle}
                          onChange={(e) => setMeetingTitle(e.target.value)}
                          placeholder="Ex.: Alinhamento de proposta"
                          className="h-9 rounded-xl border-border/60 bg-background/80 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="mtg-when" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Data e hora
                        </label>
                        <Input
                          id="mtg-when"
                          type="datetime-local"
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="native-datetime-dark h-10 rounded-xl border-border/60 bg-background/80 font-mono text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        className="h-10 w-full rounded-xl text-xs font-semibold shadow-sm"
                        disabled={createMeeting.isPending || !meetingTitle.trim() || !meetingDate}
                        onClick={handleQuickMeeting}
                      >
                        {createMeeting.isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Confirmar na agenda'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeAction === 'sale' && (
                <div className="space-y-3 px-3">
                  <SubPanelHeader
                    title="Registrar venda"
                    subtitle="Integração: payload em window.__YAGUAR_ON_SALE_REGISTERED__ e webhook opcional (env)."
                    onBack={() => setActiveAction('none')}
                  />
                  <Input
                    value={saleProduct}
                    onChange={(e) => setSaleProduct(e.target.value)}
                    placeholder="Produto / serviço"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <Input
                    type="number"
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                    placeholder="Valor (R$)"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <Button
                    size="xs"
                    className="h-10 w-full rounded-xl text-xs font-semibold"
                    disabled={createSale.isPending || !saleProduct.trim() || !saleValue}
                    onClick={handleQuickSale}
                  >
                    {createSale.isPending ? <Spinner className="h-3 w-3" /> : 'Registrar venda'}
                  </Button>
                </div>
              )}

              {activeAction === 'create-lead' && (
                <div className="max-h-[min(70vh,420px)] space-y-2.5 overflow-y-auto px-3">
                  <SubPanelHeader
                    title="Novo contato"
                    subtitle="Campos alinhados ao lead no painel."
                    onBack={() => setActiveAction('none')}
                  />
                  <Input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Nome"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <Input
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <Input
                    type="number"
                    value={createValue}
                    onChange={(e) => setCreateValue(e.target.value)}
                    placeholder="Valor (R$, opcional)"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <Input
                    value={createCcl}
                    onChange={(e) => setCreateCcl(e.target.value)}
                    placeholder="CCL (opcional)"
                    className="h-9 rounded-xl border-border/60 bg-muted/20 text-xs"
                  />
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
                    <select
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value as LeadCategory)}
                      className="h-9 w-full rounded-xl border border-border/60 bg-card px-2.5 text-[11px]"
                    >
                      {LEAD_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa do funil</label>
                    <select
                      value={createFunnelStage}
                      onChange={(e) => setCreateFunnelStage(e.target.value as LeadFunnelStage)}
                      className="h-9 w-full rounded-xl border border-border/60 bg-card px-2.5 text-[11px]"
                    >
                      {FUNNEL_STAGES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    size="xs"
                    className="h-10 w-full rounded-xl text-xs font-semibold"
                    disabled={createLead.isPending}
                    onClick={handleQuickCreateLead}
                  >
                    {createLead.isPending ? <Spinner className="h-3 w-3" /> : 'Criar contato'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages — z-0 para não cobrir o dropdown do header (irmão posterior no DOM) */}
      <div ref={scrollRef} className="relative z-0 min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/10 p-4">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        )}
        {isError && (
          <EmptyState
            title="Erro ao carregar mensagens"
            className="py-8"
          />
        )}
        {!isLoading && !isError && messages && messages.length === 0 && (
          <EmptyState
            title="Sem mensagens"
            description={`Nenhuma mensagem com ${formatJid(activeJid)} ainda.`}
            className="py-8"
          />
        )}
        {messages
          ?.slice()
          .reverse()
          .map((m, i) => (
            <div
              key={m.waMessageId}
              className={cn(
                'flex w-full min-w-0 animate-slide-up',
                m.fromMe ? 'justify-end' : 'justify-start',
              )}
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <div
                className={cn(
                  'w-fit min-w-0 max-w-[min(420px,calc(100%-1.5rem))] rounded-2xl px-2.5 py-1.5 text-sm shadow-sm',
                  m.fromMe
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted rounded-bl-md',
                )}
              >
                {!m.fromMe && m.pushName && (
                  <p className="mb-1 text-[11px] font-semibold leading-tight opacity-70">{m.pushName}</p>
                )}
                <div className="flex flex-col gap-1">
                  {m.hasMedia ? (
                    <MessageMediaBlock
                      sessionId={sessionId}
                      remoteJid={m.remoteJid}
                      waMessageId={m.waMessageId}
                      contentType={m.contentType}
                      caption={m.text}
                      documentFileName={m.documentFileName}
                      fromMe={m.fromMe}
                    />
                  ) : m.text?.trim() ? (
                    <p className="whitespace-pre-wrap wrap-break-word text-[13px] leading-snug">{m.text}</p>
                  ) : (
                    <p className="text-[12px] leading-snug opacity-75 italic">{fallbackMediaLabel(m.contentType)}</p>
                  )}
                  <p
                    className={cn(
                      'text-[10px] tabular-nums',
                      m.fromMe ? 'self-end text-primary-foreground/55' : 'self-end text-muted-foreground',
                    )}
                  >
                    {formatTimestamp(m.waTimestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Composer */}
      <div className="relative">
        {showEmoji && (
          <div className="absolute bottom-full left-0 right-0 z-50 mb-2 flex justify-center sm:left-3 sm:right-auto sm:justify-start">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}
        <form onSubmit={handleSend} className="relative flex shrink-0 items-center gap-2 border-t border-border/60 bg-card/95 p-3 backdrop-blur-md min-h-[60px]">
          {isRecording ? (
            <div className="flex flex-1 items-center justify-between gap-3 px-2 animate-slide-up">
              <button
                type="button"
                onClick={cancelRecording}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                title="Cancelar gravação"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2 text-destructive">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                </span>
                <span className="font-mono text-[13px] tracking-wider">{formatDuration(recordingDuration)}</span>
              </div>
              
              <Button
                type="button"
                size="icon"
                onClick={sendRecording}
                disabled={sendMedia.isPending}
                className="rounded-xl shrink-0 shadow-sm"
                title="Enviar Áudio"
              >
                {sendMedia.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                )}
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowEmoji((v) => !v)}
                className={cn(
                  'flex items-center justify-center h-9 w-9 rounded-xl transition-colors shrink-0 cursor-pointer',
                  showEmoji ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                title="Emojis"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => {
                  setShowEmoji(false);
                  setShowQuickAudios(true);
                }}
                className="flex items-center justify-center h-9 w-9 rounded-xl transition-colors shrink-0 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Áudios prontos da galeria"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowAttachSource(true)}
                className="flex items-center justify-center h-9 w-9 rounded-xl transition-colors shrink-0 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Enviar mídia"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setShowSchedule(true)}
                className="flex items-center justify-center h-9 w-9 rounded-xl transition-colors shrink-0 cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Agendar mensagem"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onFocus={() => setShowEmoji(false)}
                placeholder={disabled ? 'Sessão não conectada' : 'Digite uma mensagem...'}
                disabled={disabled || send.isPending}
                className="flex-1 rounded-xl"
              />
              {text.trim() ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={disabled || send.isPending}
                  className="rounded-xl shrink-0"
                >
                  {send.isPending ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  disabled={disabled}
                  onClick={startRecording}
                  className="rounded-xl shrink-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground shadow-none"
                  title="Gravar Áudio"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </Button>
              )}
            </>
          )}
          {error && <p className="absolute bottom-full right-4 mb-2 -translate-y-2 text-xs font-medium text-destructive px-3 py-1.5 bg-destructive/10 rounded-lg backdrop-blur-sm shadow-sm animate-slide-up ring-1 ring-destructive/20">{error}</p>}
        </form>
        {showSchedule && activeJid && (
          <ScheduleMessageDialog
            sessionId={sessionId}
            remoteJid={activeJid}
            addressLabel={formatContactAddress(activeJid, activeChat?.displayRemoteJid)}
            open={showSchedule}
            onClose={() => setShowSchedule(false)}
          />
        )}
        <AttachSourceModal
          open={showAttachSource}
          onOpenChange={setShowAttachSource}
          onChooseComputer={openComputerUpload}
          onChooseGallery={() => setShowGalleryPicker(true)}
        />
        <GalleryPickerModal
          open={showGalleryPicker}
          onOpenChange={setShowGalleryPicker}
          sessionId={sessionId}
          onPick={handleGalleryPick}
          isSending={gallerySending}
        />
        <QuickAudioLibraryModal
          open={showQuickAudios}
          onOpenChange={setShowQuickAudios}
          sessionId={sessionId}
          onSend={handleQuickAudioSend}
          isSending={gallerySending}
        />
      </div>
    </div>
  );
}

function ActionMenuSectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/90',
        className,
      )}
      role="presentation"
    >
      {children}
    </p>
  );
}

function SubPanelHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-0.5 mb-1 space-y-1 border-b border-border/50 bg-card/95 pb-2.5 pt-0.5 backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        className="group inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-primary cursor-pointer"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Voltar
      </button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{title}</p>
      {subtitle ? <p className="text-[10px] leading-relaxed text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function ActionMenuItem({
  icon,
  label,
  onClick,
  destructive = false,
  disabled = false,
  highlight,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Destaque visual (ex.: agendar reunião). */
  highlight?: 'calendar';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group mx-1.5 flex w-[calc(100%-0.75rem)] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-xs font-medium transition-all duration-150 cursor-pointer',
        'disabled:pointer-events-none disabled:opacity-45',
        destructive &&
          'text-destructive hover:bg-destructive/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30',
        !destructive && !highlight && 'text-foreground hover:bg-muted/70',
        highlight === 'calendar' &&
          'border border-primary/25 bg-linear-to-r from-primary/9 to-transparent text-foreground hover:border-primary/40 hover:from-primary/12',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors',
          destructive
            ? 'border-destructive/25 bg-destructive/[0.07] text-destructive'
            : highlight === 'calendar'
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border/50 bg-muted/40 text-muted-foreground group-hover:border-border group-hover:text-foreground',
        )}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d={icon} />
        </svg>
      </span>
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </button>
  );
}
