'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/lib/api/client';
import { useTenant } from '@/lib/tenant-context';

export function useMeetings(sessionId: string, remoteJid?: string) {
  const { tenantId } = useTenant();
  return useQuery({
    queryKey: ['meetings', tenantId, sessionId, remoteJid],
    queryFn: () => api.listMeetings(tenantId, sessionId, { remoteJid }),
    select: (d) => d.meetings,
    enabled: !!sessionId,
    refetchInterval: 30_000,
  });
}

export function useCreateMeeting(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: {
      remoteJid: string;
      title: string;
      description?: string;
      scheduledAt: string;
      durationMinutes?: number;
      leadName?: string;
    }) => api.createMeeting(tenantId, sessionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', tenantId, sessionId] });
    },
  });
}

export function useUpdateMeetingStatus(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ meetingId, status }: { meetingId: string; status: string }) =>
      api.updateMeetingStatus(tenantId, sessionId, meetingId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings', tenantId, sessionId] });
    },
  });
}
