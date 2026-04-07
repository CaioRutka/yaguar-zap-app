'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useSessions() {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['sessions', tenantId],
    queryFn: () => api.listSessions(tenantId),
    select: (d) => d.sessions,
    refetchInterval: 5_000,
  });
}

export function useSession(sessionId: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['session', tenantId, sessionId],
    queryFn: () => api.getSession(tenantId, sessionId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5_000;
      return data.connection === 'open' ? 30_000 : 10_000;
    },
    refetchIntervalInBackground: false,
  });
}

export function useStartSession() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => api.startSession(tenantId, sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', tenantId] });
    },
  });
}

export function useDeleteSession() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (opts: {
      sessionId: string;
      logout?: boolean;
      clearAuth?: boolean;
    }) => api.deleteSession(tenantId, opts.sessionId, opts),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions', tenantId] });
    },
  });
}
