'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/lib/tenant-context';
import { getMediaDownloadUrl } from '@/lib/api/client';

type MediaThumbnailProps = {
  sessionId: string;
  mediaId: string;
  mediaUrl?: string;
  alt?: string;
  className?: string;
};

/**
 * Miniatura da galeria.
 * Se existir `mediaUrl` (R2), tenta carregar direto; em falha (bucket privado, CORS, URL errada)
 * usa o endpoint autenticado `/download` — mesmo fluxo que quando o arquivo só está no Mongo.
 */
export function MediaThumbnail({ sessionId, mediaId, mediaUrl, alt = '', className = '' }: MediaThumbnailProps) {
  const { tenantId } = useTenant();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** Após erro no `<img>` com URL pública do R2, usa o download autenticado. */
  const [forceApi, setForceApi] = useState(false);
  const tryDirectUrl = Boolean(mediaUrl) && !forceApi;

  const loadFromApi = useCallback(async () => {
    const url = getMediaDownloadUrl(sessionId, mediaId);
    const res = await fetch(url, {
      headers: { 'X-Tenant-Id': tenantId },
    });
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }, [tenantId, sessionId, mediaId]);

  useEffect(() => {
    if (tryDirectUrl && mediaUrl) {
      setSrc(mediaUrl);
      return;
    }

    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      try {
        blobUrl = await loadFromApi();
        if (!cancelled) setSrc(blobUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [tenantId, sessionId, mediaId, mediaUrl, tryDirectUrl, loadFromApi]);

  const handleImgError = () => {
    if (mediaUrl && !forceApi) {
      setForceApi(true);
      setSrc(null);
      return;
    }
    setFailed(true);
  };

  if (failed || !src) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleImgError}
    />
  );
}
