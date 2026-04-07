'use client';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMediaLibrary } from '@/hooks/use-media-library';
import { formatTimestamp } from '@/lib/utils';
import type { MediaItemDto } from '@/lib/types/whatsapp';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onSend: (item: MediaItemDto) => Promise<void>;
  isSending: boolean;
};

export function QuickAudioLibraryModal({ open, onOpenChange, sessionId, onSend, isSending }: Props) {
  const { data, isLoading, isError, error } = useMediaLibrary(sessionId, 'audio');
  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      flush
      className="max-h-[80dvh] max-w-md w-[calc(100%-1.25rem)] border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl sm:w-full"
    >
      <div className="flex max-h-[80dvh] flex-col overflow-hidden rounded-2xl border border-border/50 bg-linear-to-b from-card to-card/95">
        <header className="shrink-0 border-b border-border/40 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Resposta rápida</p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Áudios prontos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O <strong className="font-medium text-foreground/90">nome</strong> na galeria aparece como título. Um toque
                envia no chat atual.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-all duration-200 hover:border-border hover:bg-muted/60 hover:text-foreground cursor-pointer"
              aria-label="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Carregando áudios…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Não foi possível carregar os áudios.'}
            </div>
          )}
          {!isLoading && !isError && data && data.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-5 py-10 text-center text-sm text-muted-foreground">
              Nenhum áudio na galeria. Envie arquivos de áudio em{' '}
              <span className="font-medium text-foreground">Mídia → Galeria</span>.
            </div>
          )}
          {!isLoading && !isError && data && data.length > 0 && (
            <ul className="space-y-3">
              {data.map((item) => (
                <li key={item._id}>
                  <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                    <p className="text-base font-semibold leading-snug text-foreground">{item.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatSize(item.size)} · {formatTimestamp(item.createdAt)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 w-full rounded-lg"
                      disabled={isSending}
                      onClick={() => void onSend(item)}
                    >
                      {isSending ? 'Enviando…' : 'Enviar áudio'}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-border/40 px-5 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={close}>
            Fechar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
