'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** When true, inner wrapper has no padding (full-bleed header/footer layouts) */
  flush?: boolean;
};

export function Dialog({ open, onClose, children, className, flush }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={ref}
      onCancel={handleCancel}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'backdrop:bg-black/60 backdrop:backdrop-blur-md',
        /* Centrado no viewport (preflight costuma zerar margin do dialog; slide-up quebraria translate) */
        'fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,90vh)] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
        'overflow-hidden rounded-2xl border border-border/60 bg-card/95 p-0 shadow-2xl ring-1 ring-white/5',
        'animate-fade-in',
        className,
      )}
    >
      <div className={cn(!flush && 'p-6')}>{children}</div>
    </dialog>
  );
}
