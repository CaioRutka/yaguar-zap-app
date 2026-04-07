'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useSales(sessionId: string, remoteJid?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['sales', tenantId, sessionId, remoteJid],
    queryFn: () => api.listSales(tenantId, sessionId, { remoteJid }),
    select: (d) => d.sales,
    enabled: !!sessionId,
  });
}

export function useCreateSale(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      remoteJid: string;
      leadName?: string;
      value: number;
      product: string;
      notes?: string;
      soldBy?: string;
    }) => api.createSale(tenantId, sessionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales', tenantId, sessionId] });
    },
  });
}
