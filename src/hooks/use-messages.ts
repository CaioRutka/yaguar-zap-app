'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useMessages(
  sessionId: string,
  remoteJid?: string,
  opts?: { before?: string; limit?: number },
) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['messages', tenantId, sessionId, remoteJid, opts?.before],
    queryFn: () =>
      api.listMessages(tenantId, sessionId, {
        remoteJid,
        limit: opts?.limit,
        before: opts?.before,
      }),
    select: (d) => d.messages,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: !!sessionId,
  });
}

export function useSendMessage(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { remoteJid: string; text: string }) =>
      api.sendMessage(tenantId, sessionId, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['messages', tenantId, sessionId],
      });
    },
  });
}

export function useSendMedia(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      remoteJid: string;
      file: File;
      caption?: string;
      mediaType?: string;
      ptt?: boolean;
    }) => api.sendMedia(tenantId, sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['messages', tenantId, sessionId],
      });
    },
  });
}
