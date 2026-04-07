'use client';

import { useEffect, useState } from 'react';
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
 * Renders an image thumbnail for gallery items.
 * Uses `mediaUrl` (R2 public URL) when available, otherwise
 * fetches from the authenticated download endpoint and creates a blob URL.
 */
export function MediaThumbnail({ sessionId, mediaId, mediaUrl, alt = '', className = '' }: MediaThumbnailProps) {
  const { tenantId } = useTenant();
  const [src, setSrc] = useState<string | null>(mediaUrl ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // If we already have a direct R2 URL, just use it
    if (mediaUrl) {
      setSrc(mediaUrl);
      return;
    }

    // Otherwise fetch via the authenticated download endpoint
    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      try {
        const url = getMediaDownloadUrl(sessionId, mediaId);
        const res = await fetch(url, {
          headers: { 'X-Tenant-Id': tenantId },
        });
        if (!res.ok) throw new Error('download failed');
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(blobUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [tenantId, sessionId, mediaId, mediaUrl]);

  if (failed || !src) {
    return null; // Caller shows fallback icon
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
