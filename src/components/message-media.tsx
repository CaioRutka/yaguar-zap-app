'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { getMessageMediaRequestUrl } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

type Props = {
  sessionId: string;
  remoteJid: string;
  waMessageId: string;
  contentType?: string;
  caption?: string;
  documentFileName?: string;
  fromMe: boolean;
};

function mediaKind(ct?: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
  switch (ct) {
    case 'imageMessage':
    case 'stickerMessage':
      return 'image';
    case 'videoMessage':
      return 'video';
    case 'audioMessage':
      return 'audio';
    case 'documentMessage':
      return 'document';
    default:
      return 'unknown';
  }
}

/* ─── Lightbox for images ─── */
function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
        aria-label="Fechar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ─── Custom Audio Player ─── */
function ChatAudioPlayer({ src, fromMe }: { src: string; fromMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play();
    }
  }, [playing]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      setDuration(Number.isFinite(d) ? d : 0);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const idx = speeds.indexOf(playbackRate);
    const next = speeds[(idx + 1) % speeds.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate decorative waveform bars (stays consistent per component)
  const [bars] = useState(() =>
    Array.from({ length: 28 }, () => 0.2 + Math.random() * 0.8)
  );

  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-2xl px-3 py-2 min-w-[220px] max-w-[300px]',
      fromMe ? 'bg-primary-foreground/8' : 'bg-background/40',
    )}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Play button */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all cursor-pointer',
          fromMe
            ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30'
            : 'bg-primary/15 text-primary hover:bg-primary/25',
        )}
        aria-label={playing ? 'Pausar' : 'Reproduzir'}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform + Progress */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className="relative flex h-7 cursor-pointer items-end gap-[1.5px]"
          onClick={handleSeek}
          role="slider"
          aria-valuenow={currentTime}
          aria-valuemin={0}
          aria-valuemax={duration}
          tabIndex={0}
        >
          {bars.map((h, i) => {
            const barProgress = ((i + 1) / bars.length) * 100;
            const isPlayed = barProgress <= progress;
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors duration-150',
                  isPlayed
                    ? fromMe ? 'bg-primary-foreground/80' : 'bg-primary'
                    : fromMe ? 'bg-primary-foreground/20' : 'bg-muted-foreground/25',
                )}
                style={{ height: `${h * 100}%`, minWidth: 2 }}
              />
            );
          })}
        </div>

        {/* Time + Speed */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-[10px] tabular-nums',
            fromMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
          )}>
            {fmtTime(currentTime)}{duration > 0 && ` / ${fmtTime(duration)}`}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[9px] font-bold tabular-nums transition-colors cursor-pointer',
              fromMe
                ? 'bg-primary-foreground/15 text-primary-foreground/70 hover:bg-primary-foreground/25'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            )}
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export function MessageMediaBlock({
  sessionId,
  remoteJid,
  waMessageId,
  contentType,
  caption,
  documentFileName,
  fromMe,
}: Props) {
  const { tenantId } = useTenant();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    (async () => {
      try {
        const res = await fetch(getMessageMediaRequestUrl(sessionId, waMessageId, remoteJid), {
          headers: { 'X-Tenant-Id': tenantId },
        });
        if (!res.ok) throw new Error('media');
        const blob = await res.blob();
        created = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(created);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [tenantId, sessionId, remoteJid, waMessageId]);

  if (failed) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
        fromMe ? 'bg-primary-foreground/8 text-primary-foreground/60' : 'bg-muted/40 text-muted-foreground',
      )}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="italic">Não foi possível carregar a mídia.</span>
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2.5',
        fromMe ? 'bg-primary-foreground/8' : 'bg-muted/30',
      )}>
        <Spinner className="h-4 w-4" />
        <span className={cn(
          'text-[11px]',
          fromMe ? 'text-primary-foreground/60' : 'text-muted-foreground',
        )}>Carregando mídia…</span>
      </div>
    );
  }

  const kind = mediaKind(contentType);
  const cap = caption?.trim();

  const captionEl =
    cap ? (
      <p className={cn('mt-1.5 text-[13px] leading-snug whitespace-pre-wrap wrap-break-word', fromMe ? 'text-primary-foreground/95' : '')}>
        {cap}
      </p>
    ) : null;

  if (kind === 'image') {
    const isSticker = contentType === 'stickerMessage';
    return (
      <>
        <div className="space-y-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs from authenticated API */}
          <img
            src={blobUrl}
            alt=""
            onClick={() => !isSticker && setLightbox(true)}
            className={cn(
              isSticker
                ? 'h-36 w-36 object-contain sm:h-40 sm:w-40'
                : 'max-h-64 max-w-[min(100%,280px)] rounded-lg object-cover sm:max-h-80 sm:max-w-[min(100%,320px)] cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]',
            )}
          />
          {captionEl}
        </div>
        {lightbox && <ImageLightbox src={blobUrl} onClose={() => setLightbox(false)} />}
      </>
    );
  }

  if (kind === 'video') {
    return (
      <div className="space-y-0">
        <video
          src={blobUrl}
          controls
          className="max-h-64 max-w-[min(100%,280px)] rounded-lg sm:max-h-80 sm:max-w-[min(100%,320px)]"
        />
        {captionEl}
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="space-y-1">
        <ChatAudioPlayer src={blobUrl} fromMe={fromMe} />
        {captionEl}
      </div>
    );
  }

  if (kind === 'document') {
    const name = documentFileName || 'Documento';
    return (
      <div className="space-y-1">
        <a
          href={blobUrl}
          download={name}
          className={cn(
            'inline-flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all',
            fromMe
              ? 'border-primary-foreground/20 bg-primary-foreground/8 hover:bg-primary-foreground/14'
              : 'border-border/60 bg-background/50 hover:bg-muted/80',
          )}
        >
          <span className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            fromMe ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-primary/10 text-primary',
          )}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </span>
          <span className="flex flex-col min-w-0">
            <span className="max-w-[180px] truncate font-semibold">{name}</span>
            <span className={cn(
              'text-[10px]',
              fromMe ? 'text-primary-foreground/50' : 'text-muted-foreground',
            )}>
              Toque para baixar
            </span>
          </span>
        </a>
        {captionEl}
      </div>
    );
  }

  return (
    <a
      href={blobUrl}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-medium underline underline-offset-2"
    >
      Abrir arquivo
    </a>
  );
}
