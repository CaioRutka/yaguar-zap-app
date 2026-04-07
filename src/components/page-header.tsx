import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  kicker,
  title,
  description,
  backHref,
  actions,
  className,
}: Props) {
  return (
    <header
      className={cn(
        'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6',
        className,
      )}
    >
      <div className="flex min-w-0 gap-4">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground backdrop-blur-sm transition-all duration-200 hover:border-primary/25 hover:text-foreground cursor-pointer"
            aria-label="Voltar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        )}
        <div className="min-w-0">
          {kicker && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {kicker}
            </p>
          )}
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
