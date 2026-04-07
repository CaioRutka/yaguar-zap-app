'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession, useStartSession } from '@/hooks/use-sessions';
import { useSessionSSE } from '@/hooks/use-session-sse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { SessionStatusBadge } from '@/components/session-status-badge';
import { DeleteSessionDialog } from '@/components/delete-session-dialog';
import { ChatSidebar } from '@/components/chat-sidebar';
import { MessageThread } from '@/components/message-thread';
import { LeadPanel } from '@/components/lead-panel';
import { EmptyState } from '@/components/ui/empty-state';
import { SessionPairingStage } from '@/components/session-pairing-stage';

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session, isLoading, isError } = useSession(sessionId);
  useSessionSSE(sessionId);
  const startSession = useStartSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [activeJid, setActiveJid] = useState('');
  const [newJid, setNewJid] = useState('');
  const [showLead, setShowLead] = useState(true);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="flex min-h-[50vh] flex-1 items-center justify-center">
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          }
          title={`Sessão "${sessionId}" não encontrada`}
          description="A sessão ainda não foi iniciada ou não existe."
          action={
            <div className="flex items-center gap-2">
              <Button
                onClick={() => startSession.mutate(sessionId)}
                disabled={startSession.isPending}
              >
                {startSession.isPending ? <Spinner className="h-4 w-4" /> : 'Iniciar sessão'}
              </Button>
              <Link href="/">
                <Button variant="outline">Voltar</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const isOpen = session.connection === 'open';
  const isConnecting = session.connection === 'connecting';

  const openNewChat = () => {
    const jid = newJid.trim();
    if (jid) {
      setActiveJid(jid.includes('@') ? jid : `${jid.replace(/\D/g, '')}@s.whatsapp.net`);
      setNewJid('');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Top bar */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-4 py-3 backdrop-blur-md sm:px-6 ${
          isConnecting || (session.qr && !isOpen)
            ? 'border-border/60 bg-card/70'
            : isOpen
              ? 'border-border/60 bg-card/90'
              : 'bg-card/80'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm shrink-0 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">Sessões</span>
          </Link>
          <div className="h-5 w-px bg-border shrink-0" />
          <h1 className="text-sm font-bold truncate">{sessionId}</h1>
          <SessionStatusBadge status={session.connection} />
          {session.loggedInUser && (
            <span className="text-xs text-muted-foreground hidden md:inline truncate">
              {session.loggedInUser.name ?? session.loggedInUser.id}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {session.lastErrorMessage && (
            <span className="text-xs text-destructive hidden lg:inline max-w-[240px] truncate">
              {session.lastErrorMessage}
            </span>
          )}
          {isOpen && (
            <>
              <Link href={`/sessions/${sessionId}/media-library`}>
                <Button size="sm" variant="ghost" className="gap-1.5 hidden sm:flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Galeria
                </Button>
              </Link>
              <Link href={`/sessions/${sessionId}/broadcast`}>
                <Button size="sm" variant="ghost" className="gap-1.5 hidden sm:flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Massa
                </Button>
              </Link>
              <Button
                size="sm"
                variant={showLead ? 'soft' : 'ghost'}
                onClick={() => setShowLead((v) => !v)}
                className="gap-1.5 hidden lg:flex"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Lead
              </Button>
            </>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Encerrar
          </Button>
        </div>
      </div>

      {/* Pairing stage when connecting */}
      {(isConnecting || session.qr) && !isOpen && (
        <SessionPairingStage sessionId={sessionId} qr={session.qr} className="min-h-[min(640px,calc(100vh-8rem))]" />
      )}

      {/* Main chat area */}
      {isOpen && (
        <div className="flex min-h-0 flex-1 bg-muted/15">
          {/* Sidebar */}
          <div className="hidden w-72 shrink-0 border-r border-border/60 bg-card/90 backdrop-blur-md sm:flex sm:flex-col">
            <ChatSidebar
              sessionId={sessionId}
              activeJid={activeJid}
              onSelectJid={setActiveJid}
            />
            <div className="border-t border-border/60 bg-card/95 p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newJid}
                  onChange={(e) => setNewJid(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && openNewChat()}
                  placeholder="Novo chat (nº)"
                  className="h-9 flex-1 text-xs"
                />
                <Button size="xs" variant="soft" onClick={openNewChat} className="h-9 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>

          {/* Thread */}
          <div className="flex min-w-0 flex-1 flex-col bg-background/40">
            <MessageThread sessionId={sessionId} activeJid={activeJid} disabled={!isOpen} />
          </div>

          {/* Lead panel */}
          {showLead && activeJid && (
            <div className="hidden w-80 shrink-0 overflow-y-auto border-l border-border/60 bg-card/90 backdrop-blur-md lg:block animate-fade-in">
              <LeadPanel sessionId={sessionId} remoteJid={activeJid} />
            </div>
          )}
        </div>
      )}

      <DeleteSessionDialog
        sessionId={sessionId}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  );
}
