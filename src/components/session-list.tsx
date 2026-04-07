'use client';

import Link from 'next/link';
import { useSessions } from '@/hooks/use-sessions';
import { SessionStatusBadge } from './session-status-badge';
import { Spinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';

export function SessionList() {
  const { data: sessions, isLoading, isError } = useSessions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/30 py-24 backdrop-blur-sm">
        <Spinner className="h-7 w-7 text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        }
        title="Falha ao carregar sessões"
        description="Verifique se a API está online e o Tenant ID correto."
      />
    );
  }

  if (!sessions?.length) {
    return (
      <EmptyState
        icon={
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        }
        title="Nenhuma sessão ativa"
        description="Crie uma nova sessão para começar a gerenciar suas conversas."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s, i) => (
        <Link key={`${s.tenantId}::${s.sessionId}`} href={`/sessions/${s.sessionId}`} className="block">
          <div
            className="app-session-card group flex cursor-pointer items-center justify-between gap-3 p-5 animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 ring-1 ring-primary/15 transition-colors duration-200 group-hover:bg-primary/18">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-tight">{s.sessionId}</p>
                  {s.loggedInUser && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {s.loggedInUser.name ?? s.loggedInUser.id}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <SessionStatusBadge status={s.connection} />
          </div>
        </Link>
      ))}
    </div>
  );
}
