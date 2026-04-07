'use client';

import { QrDisplay } from '@/components/qr-display';
import { cn } from '@/lib/utils';

type Props = {
  sessionId: string;
  qr: string | null;
  className?: string;
};

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function IconDevices({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function IconScan({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

const steps = [
  {
    title: 'Abra o WhatsApp',
    description: 'No celular, inicie o aplicativo oficial.',
    Icon: IconPhone,
  },
  {
    title: 'Aparelhos conectados',
    description: 'Menu (⋮) ou Ajustes → Aparelhos conectados → Conectar um aparelho.',
    Icon: IconDevices,
  },
  {
    title: 'Escaneie o código',
    description: 'Aponte a câmera para o QR ao lado. A sessão será vinculada automaticamente.',
    Icon: IconScan,
  },
];

export function SessionPairingStage({ sessionId, qr, className }: Props) {
  return (
    <section
      className={cn(
        'session-pairing-stage relative flex flex-1 flex-col min-h-0 overflow-hidden',
        className,
      )}
      aria-labelledby="pairing-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-100"
        aria-hidden
      >
        <div className="session-pairing-mesh absolute inset-0" />
        <div className="session-pairing-glow absolute -top-32 left-1/2 h-[420px] w-[min(100%,720px)] -translate-x-1/2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-center lg:gap-14 lg:px-8">
        <div className="flex max-w-xl flex-1 flex-col gap-6 lg:gap-8">
          <header className="space-y-2 animate-fade-in">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Pareamento
            </p>
            <h2
              id="pairing-heading"
              className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl session-pairing-title-glow"
            >
              Conectar{' '}
              <span className="text-primary">{sessionId}</span>
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Siga os passos no telefone. O código atualiza sozinho se expirar — mantenha esta página aberta.
            </p>
          </header>

          <ol className="space-y-3" aria-label="Passos para parear o WhatsApp">
            {steps.map((step, i) => {
              const Icon = step.Icon;
              return (
                <li
                  key={step.title}
                  className={cn(
                    'animate-slide-up rounded-2xl border border-border/70 bg-card/50 p-4 shadow-sm backdrop-blur-md transition-all duration-200',
                    'hover:border-primary/25 hover:bg-card/70 hover:shadow-md',
                  )}
                  style={{ animationDelay: `${80 + i * 70}ms` }}
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
                      <Icon className="h-[22px] w-[22px]" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground pl-7">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-5 lg:max-w-md">
          <div
            className={cn(
              'animate-fade-in flex flex-col items-center gap-4 rounded-3xl border border-border/80 bg-card/60 px-6 py-8 shadow-xl backdrop-blur-xl',
              'ring-1 ring-white/5 dark:ring-white/10',
            )}
            style={{ animationDelay: '120ms' }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse-dot" aria-hidden />
              Aguardando pareamento
            </div>
            <QrDisplay qr={qr} featured />
            <p className="max-w-[280px] text-center text-xs leading-relaxed text-muted-foreground">
              Abra o WhatsApp no celular, vá em <strong className="font-medium text-foreground">Aparelhos conectados</strong> e escaneie o QR code.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
