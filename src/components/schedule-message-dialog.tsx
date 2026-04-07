'use client';

import { useState } from 'react';
import {
  useScheduledMessages,
  useCreateScheduledMessage,
  useCancelScheduledMessage,
  useUpdateScheduledMessage,
} from '@/hooks/use-scheduled-messages';
import { formatTimestamp, cn, isoToDatetimeLocalValue } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { SegmentedControl } from '@/components/ui/segmented-control';

type Props = {
  sessionId: string;
  remoteJid: string;
  /** Número/JID amigável (ex.: após resolver @lid → telefone) */
  addressLabel: string;
  open: boolean;
  onClose: () => void;
};

const CANCEL_CONDITIONS = [
  { value: 'clientReplied', label: 'Cliente respondeu' },
  { value: 'leadLost', label: 'Lead marcado como perdido' },
  { value: 'leadWon', label: 'Lead marcado como ganho' },
];

export function ScheduleMessageDialog({ sessionId, remoteJid, addressLabel, open, onClose }: Props) {
  const [text, setText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [tab, setTab] = useState<'create' | 'list'>('create');

  const { data: scheduled, isLoading } = useScheduledMessages(sessionId, remoteJid);
  const create = useCreateScheduledMessage(sessionId);
  const cancel = useCancelScheduledMessage(sessionId);
  const update = useUpdateScheduledMessage(sessionId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editAt, setEditAt] = useState('');

  const toggleCondition = (c: string) => {
    setConditions((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleCreate = () => {
    if (!text.trim() || !scheduledAt) return;
    create.mutate(
      {
        remoteJid,
        text: text.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        cancelConditions: conditions,
      },
      {
        onSuccess: () => {
          setText('');
          setScheduledAt('');
          setConditions([]);
          setTab('list');
        },
      },
    );
  };

  const pendingMessages = scheduled?.filter((m) => m.status === 'pending') ?? [];

  const startEdit = (id: string, text: string, scheduledAtIso: string) => {
    setEditingId(id);
    setEditText(text);
    setEditAt(isoToDatetimeLocalValue(scheduledAtIso));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditAt('');
  };

  const saveEdit = () => {
    if (!editingId || !editText.trim() || !editAt) return;
    update.mutate(
      {
        scheduledId: editingId,
        body: {
          text: editText.trim(),
          scheduledAt: new Date(editAt).toISOString(),
        },
      },
      { onSuccess: () => cancelEdit() },
    );
  };

  const tabOptions = [
    { value: 'create' as const, label: 'Agendar' },
    { value: 'list' as const, label: `Agendadas (${pendingMessages.length})` },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      flush
      className="max-h-[min(90dvh,680px)] max-w-lg w-[calc(100%-1.25rem)] overflow-hidden sm:w-full"
    >
      <div className="flex max-h-[min(90dvh,680px)] flex-col">
        <header className="shrink-0 border-b border-border/60 bg-muted/20 px-5 pb-4 pt-5 backdrop-blur-sm sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Agendamento
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                Mensagem programada
              </h2>
              <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={remoteJid}>
                {addressLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted/60 hover:text-foreground cursor-pointer"
              aria-label="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="shrink-0 border-b border-border/50 px-5 py-3 sm:px-6">
          <SegmentedControl value={tab} onChange={setTab} options={tabOptions} size="md" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {tab === 'create' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="schedule-msg-text" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Mensagem
                </label>
                <textarea
                  id="schedule-msg-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Digite o texto que será enviado no horário escolhido…"
                  rows={4}
                  className="min-h-[120px] w-full resize-none rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/80 focus-visible:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="schedule-msg-dt" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Data e hora
                </label>
                <Input
                  id="schedule-msg-dt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="native-datetime-dark h-11 rounded-xl border-border/60 bg-muted/25 font-mono text-sm shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary/25"
                />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Fuso horário do seu navegador. Ajuste o horário conforme necessário.
                </p>
              </div>

              <fieldset className="space-y-3">
                <legend className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Cancelar automaticamente se
                </legend>
                <p className="-mt-1 text-[11px] text-muted-foreground">
                  O envio é desmarcado se uma destas condições ocorrer antes da data.
                </p>
                <div className="space-y-2">
                  {CANCEL_CONDITIONS.map((cc) => {
                    const on = conditions.includes(cc.value);
                    return (
                      <label
                        key={cc.value}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200',
                          on
                            ? 'border-primary/40 bg-primary/8 ring-1 ring-primary/15'
                            : 'border-border/60 bg-muted/15 hover:border-border hover:bg-muted/30',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggleCondition(cc.value)}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-card group-hover:border-muted-foreground/60',
                          )}
                          aria-hidden
                        >
                          {on && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm font-medium leading-snug text-foreground">{cc.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {tab === 'list' && (
            <div className="space-y-3">
              {isLoading && (
                <div className="flex justify-center py-14">
                  <Spinner className="h-7 w-7" />
                </div>
              )}
              {!isLoading && pendingMessages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/15 px-4 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground">Nada agendado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Use a aba Agendar para programar o próximo envio.
                  </p>
                </div>
              )}
              {pendingMessages.map((msg, i) => (
                <div
                  key={msg._id}
                  className="app-glass-panel space-y-3 p-4 animate-slide-up"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {editingId === msg._id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={4}
                        className="min-h-[100px] w-full resize-none rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground"
                      />
                      <Input
                        type="datetime-local"
                        value={editAt}
                        onChange={(e) => setEditAt(e.target.value)}
                        className="native-datetime-dark h-10 font-mono text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg"
                          disabled={update.isPending || !editText.trim() || !editAt}
                          onClick={saveEdit}
                        >
                          {update.isPending ? <Spinner className="h-3.5 w-3.5" /> : 'Salvar'}
                        </Button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted cursor-pointer"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed text-foreground wrap-break-word">{msg.text}</p>
                      <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="muted" className="text-[10px] font-medium">
                            {formatTimestamp(msg.scheduledAt)}
                          </Badge>
                          {msg.cancelConditions.map((cc) => (
                            <Badge key={cc} variant="info" className="text-[10px]">
                              {CANCEL_CONDITIONS.find((c) => c.value === cc)?.label ?? cc}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => startEdit(msg._id, msg.text, msg.scheduledAt)}
                            disabled={cancel.isPending || update.isPending}
                            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 cursor-pointer disabled:opacity-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => cancel.mutate(msg._id)}
                            disabled={cancel.isPending}
                            className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
                          >
                            Cancelar envio
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {tab === 'create' && (
          <footer className="shrink-0 border-t border-border/60 bg-muted/20 px-5 py-4 backdrop-blur-sm sm:px-6">
            <Button
              className="h-11 w-full rounded-xl text-sm font-semibold shadow-md transition-all duration-200 hover:shadow-lg disabled:shadow-none"
              disabled={!text.trim() || !scheduledAt || create.isPending}
              onClick={handleCreate}
            >
              {create.isPending ? <Spinner className="h-4 w-4" /> : 'Agendar mensagem'}
            </Button>
          </footer>
        )}
      </div>
    </Dialog>
  );
}
