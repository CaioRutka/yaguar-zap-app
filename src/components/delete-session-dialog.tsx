'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeleteSession } from '@/hooks/use-sessions';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export function DeleteSessionDialog({ sessionId, open, onClose }: Props) {
  const [logout, setLogout] = useState(false);
  const [clearAuth, setClearAuth] = useState(false);
  const del = useDeleteSession();
  const router = useRouter();

  const handleDelete = () => {
    del.mutate(
      { sessionId, logout, clearAuth },
      {
        onSuccess: () => {
          onClose();
          router.push('/');
        },
      },
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold">Encerrar sessão</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sessão: <strong className="font-mono">{sessionId}</strong>
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <label className="flex items-center gap-3 text-sm cursor-pointer group rounded-lg p-2.5 -mx-2.5 hover:bg-muted/60 transition-colors">
          <input
            type="checkbox"
            checked={logout}
            onChange={(e) => setLogout(e.target.checked)}
            className="rounded border-border accent-primary h-4 w-4"
          />
          <div>
            <p className="font-medium text-sm">Logout remoto</p>
            <p className="text-xs text-muted-foreground">Desconectar o WhatsApp Web</p>
          </div>
        </label>
        <label className="flex items-center gap-3 text-sm cursor-pointer group rounded-lg p-2.5 -mx-2.5 hover:bg-muted/60 transition-colors">
          <input
            type="checkbox"
            checked={clearAuth}
            onChange={(e) => setClearAuth(e.target.checked)}
            className="rounded border-border accent-primary h-4 w-4"
          />
          <div>
            <p className="font-medium text-sm">Limpar credenciais</p>
            <p className="text-xs text-muted-foreground">Exigirá novo QR code no próximo acesso</p>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={del.isPending}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
          {del.isPending ? <Spinner className="h-4 w-4" /> : 'Encerrar'}
        </Button>
      </div>
    </Dialog>
  );
}
