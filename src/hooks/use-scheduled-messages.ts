'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useScheduledMessages(sessionId: string, remoteJid?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['scheduled-messages', tenantId, sessionId, remoteJid],
    queryFn: () => api.listScheduledMessages(tenantId, sessionId, { remoteJid }),
    select: (d) => d.scheduledMessages,
    enabled: !!sessionId,
    refetchInterval: 30_000,
  });
}

export function useCreateScheduledMessage(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      remoteJid: string;
      text: string;
      scheduledAt: string;
      cancelConditions?: string[];
    }) => api.createScheduledMessage(tenantId, sessionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-messages', tenantId, sessionId] });
    },
  });
}

export function useCancelScheduledMessage(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (scheduledId: string) => api.cancelScheduledMessage(tenantId, sessionId, scheduledId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-messages', tenantId, sessionId] });
    },
  });
}

export function useUpdateScheduledMessage(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      scheduledId,
      body,
    }: {
      scheduledId: string;
      body: { text?: string; scheduledAt?: string };
    }) => api.updateScheduledMessage(tenantId, sessionId, scheduledId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-messages', tenantId, sessionId] });
    },
  });
}
