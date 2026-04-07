'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30_000,
  });
}

export function useMongoPing() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['mongo-ping', tenantId],
    queryFn: () => api.getMongoPing(tenantId),
    refetchInterval: 30_000,
  });
}

export function useWhatsappRisk() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['whatsapp-risk', tenantId],
    queryFn: () => api.getWhatsappRisk(tenantId),
    enabled: !!tenantId,
    refetchInterval: 60_000,
  });
}
