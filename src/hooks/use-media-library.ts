'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useMediaLibrary(sessionId: string, type?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['media-library', tenantId, sessionId, type],
    queryFn: () => api.listMediaItems(tenantId, sessionId, { type }),
    select: (d) => d.mediaItems,
    enabled: !!sessionId,
  });
}

export function useUploadMediaItem(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { file: File; name?: string; tags?: string[] }) =>
      api.uploadMediaItem(tenantId, sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library', tenantId, sessionId] });
    },
  });
}

export function useDeleteMediaItem(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (mediaId: string) => api.deleteMediaItem(tenantId, sessionId, mediaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['media-library', tenantId, sessionId] });
    },
  });
}
