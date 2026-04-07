'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useBroadcasts(sessionId: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['broadcasts', tenantId, sessionId],
    queryFn: () => api.listBroadcasts(tenantId, sessionId),
    select: (d) => d.broadcasts,
    enabled: !!sessionId,
    refetchInterval: 10_000,
  });
}

export function useCreateBroadcast(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      name: string;
      baseMessage: string;
      variableMessage?: string;
      useAiVariation?: boolean;
      deliveryChannel?: 'baileys_web' | 'cloud_api';
      recipientLimit?: number;
      filters?: Record<string, unknown>;
      cadence?: Record<string, unknown>;
    }) => api.createBroadcast(tenantId, sessionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts', tenantId, sessionId] });
    },
  });
}

export function useStartBroadcast(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) => api.startBroadcast(tenantId, sessionId, broadcastId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts', tenantId, sessionId] });
    },
  });
}

export function useCancelBroadcast(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (broadcastId: string) => api.cancelBroadcast(tenantId, sessionId, broadcastId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['broadcasts', tenantId, sessionId] });
    },
  });
}
