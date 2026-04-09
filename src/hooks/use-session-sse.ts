'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useTenant } from '@/lib/tenant-context';
import type { WaSessionPublicState } from '@/lib/types/whatsapp';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3002';

export function useSessionSSE(sessionId: string) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sessionId || !tenantId) return;

    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    const url = `${BASE_URL}/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/events`;

    fetchEventSource(url, {
      headers: { 'X-Tenant-Id': tenantId },
      signal: ctrl.signal,
      openWhenHidden: true,

      onmessage(ev) {
        if (!ev.data) return;

        try {
          const payload = JSON.parse(ev.data);

          switch (ev.event) {
            case 'qr':
              qc.setQueryData<WaSessionPublicState>(
                ['session', tenantId, sessionId],
                (old) => old ? { ...old, qr: payload.qr, connection: 'connecting' } : old,
              );
              break;

            case 'connection':
              qc.setQueryData<WaSessionPublicState>(
                ['session', tenantId, sessionId],
                (old) => {
                  if (!old) return old;
                  return {
                    ...old,
                    connection: payload.status,
                    qr: payload.status === 'open' ? null : old.qr,
                    loggedInUser: payload.user ?? old.loggedInUser,
                  };
                },
              );
              qc.invalidateQueries({ queryKey: ['sessions', tenantId] });
              break;

            case 'message':
              qc.invalidateQueries({ queryKey: ['messages', tenantId, sessionId] });
              qc.invalidateQueries({ queryKey: ['chats', tenantId, sessionId] });
              break;

            case 'chat.update':
              qc.invalidateQueries({ queryKey: ['chats', tenantId, sessionId] });
              break;
          }
        } catch {
          // malformed JSON — ignore
        }
      },

      onerror() {
        // fetchEventSource retries automatically; no-op to avoid throwing
      },
    });

    return () => {
      ctrl.abort();
      ctrlRef.current = null;
    };
  }, [sessionId, tenantId, qc]);
}
