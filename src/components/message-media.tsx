'use client';

import { useEffect, useState } from 'react';
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
      <p className="text-xs opacity-80 italic">
        Não foi possível carregar a mídia.
      </p>
    );
  }

  if (!blobUrl) {
    return (
      <div className="flex items-center gap-2 py-1">
        <Spinner className="h-4 w-4" />
        <span className="text-[11px] opacity-70">Carregando mídia…</span>
      </div>
    );
  }

  const kind = mediaKind(contentType);
  const cap = caption?.trim();

  const captionEl =
    cap ? (
      <p className={cn('mt-1.5 text-sm whitespace-pre-wrap wrap-break-word', fromMe ? 'text-primary-foreground/95' : '')}>
        {cap}
      </p>
    ) : null;

  if (kind === 'image') {
    const isSticker = contentType === 'stickerMessage';
    return (
      <div className="space-y-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs from authenticated API */}
        <img
          src={blobUrl}
          alt=""
          className={
            isSticker
              ? 'h-36 w-36 object-contain sm:h-40 sm:w-40'
              : 'max-h-64 max-w-[min(100%,280px)] rounded-md object-cover sm:max-h-80 sm:max-w-[min(100%,320px)]'
          }
        />
        {captionEl}
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className="space-y-0">
        <video
          src={blobUrl}
          controls
          className="max-h-64 max-w-[min(100%,280px)] rounded-md sm:max-h-80 sm:max-w-[min(100%,320px)]"
        />
        {captionEl}
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="min-w-[200px] max-w-full">
        <audio src={blobUrl} controls className="h-9 w-full max-w-[min(100%,280px)]" />
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
            'inline-flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
            fromMe
              ? 'border-primary-foreground/25 bg-primary-foreground/10 hover:bg-primary-foreground/15'
              : 'border-border bg-background/50 hover:bg-muted',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="max-w-[200px] truncate">{name}</span>
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
