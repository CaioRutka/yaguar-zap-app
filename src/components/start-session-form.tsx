'use client';

import { useState } from 'react';
import { useStartSession } from '@/hooks/use-sessions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/lib/api/errors';

const SESSION_ID_REGEX = /^[a-zA-Z0-9._-]+$/;

export function StartSessionForm() {
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState('');
  const start = useStartSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = sessionId.trim();

    if (!id) {
      setError('ID da sessão é obrigatório');
      return;
    }
    if (!SESSION_ID_REGEX.test(id)) {
      setError('Apenas letras, números, ponto, _ e -');
      return;
    }

    setError('');
    start.mutate(id, {
      onError: (err) => {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Falha ao iniciar sessão');
        }
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="app-glass-panel flex w-full flex-col gap-3 p-4 sm:w-auto sm:flex-row sm:items-end"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[200px]">
        <label htmlFor="new-session" className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Nova sessão
        </label>
        <Input
          id="new-session"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="ex: minha-sessao"
          className="h-10 font-mono text-sm"
          disabled={start.isPending}
          autoComplete="off"
        />
        {error && (
          <p className="text-xs text-destructive animate-slide-up">{error}</p>
        )}
      </div>
      <Button type="submit" disabled={start.isPending} size="md" className="h-10 shrink-0 gap-2">
        {start.isPending ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Iniciar
          </>
        )}
      </Button>
    </form>
  );
}
