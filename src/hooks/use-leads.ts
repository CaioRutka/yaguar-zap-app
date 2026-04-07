'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useLeads(
  sessionId: string,
  filters?: {
    funnelStage?: string;
    tag?: string;
    temperature?: string;
    category?: string;
    search?: string;
  },
) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['leads', tenantId, sessionId, filters],
    queryFn: () => api.listLeads(tenantId, sessionId, filters),
    select: (d) => d.leads,
    enabled: !!sessionId,
  });
}

export function useLead(sessionId: string, remoteJid: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['lead', tenantId, sessionId, remoteJid],
    queryFn: () => api.getLead(tenantId, sessionId, remoteJid),
    enabled: !!sessionId && !!remoteJid,
    retry: (count, error) => {
      if (error && 'status' in error && (error as { status: number }).status === 404) return false;
      return count < 2;
    },
  });
}

function useLeadInvalidation(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['leads', tenantId, sessionId] });
    qc.invalidateQueries({ queryKey: ['lead', tenantId, sessionId] });
  };
}

export function useCreateLead(sessionId: string) {
  const { tenantId } = useTenant();
  const invalidate = useLeadInvalidation(sessionId);

  return useMutation({
    mutationFn: (body: Parameters<typeof api.createLead>[2]) =>
      api.createLead(tenantId, sessionId, body),
    onSuccess: invalidate,
  });
}

export function useUpdateLead(sessionId: string) {
  const { tenantId } = useTenant();
  const invalidate = useLeadInvalidation(sessionId);

  return useMutation({
    mutationFn: ({ remoteJid, data }: { remoteJid: string; data: Record<string, unknown> }) =>
      api.updateLead(tenantId, sessionId, remoteJid, data),
    onSuccess: invalidate,
  });
}

export function useUpdateFunnel(sessionId: string) {
  const { tenantId } = useTenant();
  const invalidate = useLeadInvalidation(sessionId);

  return useMutation({
    mutationFn: ({ remoteJid, funnelStage }: { remoteJid: string; funnelStage: string }) =>
      api.updateLeadFunnel(tenantId, sessionId, remoteJid, funnelStage),
    onSuccess: invalidate,
  });
}

export function useAddObservation(sessionId: string) {
  const { tenantId } = useTenant();
  const invalidate = useLeadInvalidation(sessionId);

  return useMutation({
    mutationFn: ({ remoteJid, observation }: { remoteJid: string; observation: string }) =>
      api.addLeadObservation(tenantId, sessionId, remoteJid, observation),
    onSuccess: invalidate,
  });
}

export function useSetBlocked(sessionId: string) {
  const { tenantId } = useTenant();
  const invalidate = useLeadInvalidation(sessionId);

  return useMutation({
    mutationFn: ({ remoteJid, blocked }: { remoteJid: string; blocked: boolean }) =>
      api.setLeadBlocked(tenantId, sessionId, remoteJid, blocked),
    onSuccess: invalidate,
  });
}
