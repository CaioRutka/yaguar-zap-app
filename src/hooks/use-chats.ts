'use client';

import { useQuery } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';
import type { ChatFilters } from '@/lib/types/whatsapp';

export function useChats(sessionId: string, filters: ChatFilters = {}) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['chats', tenantId, sessionId, filters],
    queryFn: () => api.listChats(tenantId, sessionId, filters),
    select: (d) => d.chats,
    enabled: !!sessionId,
    refetchInterval: 30_000,
  });
}
