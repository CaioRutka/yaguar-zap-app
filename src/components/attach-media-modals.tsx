'use client';

import { useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { useMediaLibrary } from '@/hooks/use-media-library';
import { MediaThumbnail } from '@/components/media-thumbnail';
import { formatTimestamp } from '@/lib/utils';
import type { MediaItemDto } from '@/lib/types/whatsapp';

type MediaKind = MediaItemDto['type'];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_ICONS: Record<MediaKind, ReactNode> = {
  image: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  video: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="M16 10l6-3v10l-6-3v-4z" fill="currentColor" />
    </svg>
  ),
  audio: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  ),
  document: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  ),
};

type GalleryFilterTab = 'all' | MediaKind;

const GALLERY_TYPE_TABS: { value: GalleryFilterTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'image', label: 'Fotos' },
  { value: 'audio', label: 'Áudio' },
  { value: 'video', label: 'Vídeo' },
  { value: 'document', label: 'Arquivos' },
];

type AttachSourceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseComputer: () => void;
  onChooseGallery: () => void;
};

export function AttachSourceModal({
  open,
  onOpenChange,
  onChooseComputer,
  onChooseGallery,
}: AttachSourceModalProps) {
  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      flush
      className="max-w-md w-[calc(100%-1.25rem)] border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl sm:w-full"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br from-card via-card to-primary/4 p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <header className="relative flex items-start justify-between gap-3 pb-4 text-left">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Enviar arquivo</p>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">De onde você quer enviar?</h2>
            <p className="text-sm text-muted-foreground">
              Escolha um arquivo do seu computador ou da galeria desta sessão.
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
        </header>
        <div className="relative grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              close();
              onChooseComputer();
            }}
            className="group flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4 text-left transition-all hover:border-primary/35 hover:bg-primary/6 hover:shadow-[0_12px_40px_-20px_rgba(34,197,94,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-primary transition-transform group-hover:scale-105">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold text-foreground">Computador</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Fazer upload de um arquivo deste dispositivo
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              onChooseGallery();
            }}
            className="group flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4 text-left transition-all hover:border-primary/35 hover:bg-primary/6 hover:shadow-[0_12px_40px_-20px_rgba(34,197,94,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-primary transition-transform group-hover:scale-105">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold text-foreground">Galeria</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Fotos, vídeos, áudios e arquivos já salvos na sessão
              </span>
            </span>
          </button>
        </div>
      </div>
    </Dialog>
  );
}

type GalleryPickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onPick: (item: MediaItemDto) => Promise<void>;
  isSending: boolean;
};

export function GalleryPickerModal({
  open,
  onOpenChange,
  sessionId,
  onPick,
  isSending,
}: GalleryPickerModalProps) {
  const [typeFilter, setTypeFilter] = useState<GalleryFilterTab>('all');
  const { data, isLoading, isError, error } = useMediaLibrary(
    sessionId,
    typeFilter === 'all' ? undefined : typeFilter,
  );

  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onClose={close}
      flush
      className="max-h-[85dvh] max-w-2xl w-[calc(100%-1.25rem)] border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl sm:w-full"
    >
      <div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-border/50 bg-linear-to-b from-card to-card/95">
        <header className="shrink-0 space-y-3 border-b border-border/40 px-5 pb-4 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Galeria da sessão</p>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Escolher arquivo</h2>
              <p className="text-sm text-muted-foreground">Toque em um item para enviar no chat atual.</p>
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
          <SegmentedControl<GalleryFilterTab>
            value={typeFilter}
            onChange={setTypeFilter}
            options={GALLERY_TYPE_TABS}
            className="w-full"
            size="md"
          />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Carregando galeria…
            </div>
          )}
          {isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error instanceof Error ? error.message : 'Não foi possível carregar a galeria.'}
            </div>
          )}
          {!isLoading && !isError && data && data.length === 0 && (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
              Nenhum item nesta categoria. Envie mídia pelo WhatsApp ou altere o filtro.
            </div>
          )}
          {!isLoading && !isError && data && data.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    disabled={isSending}
                    onClick={() => void onPick(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/6 disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/40 bg-muted/30 text-muted-foreground">
                      {item.type === 'image' ? (
                        <MediaThumbnail
                          sessionId={sessionId}
                          mediaId={item._id}
                          mediaUrl={item.mediaUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        TYPE_ICONS[item.type]
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{item.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                        <span>{formatSize(item.size)}</span>
                        <span>·</span>
                        <span>{formatTimestamp(item.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="shrink-0 border-t border-border/40 px-5 py-3">
          <Button type="button" variant="outline" className="w-full" onClick={close}>
            Cancelar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
