import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  children: ReactNode;
  className?: string;
  /** Narrower max-width for forms / diagnostics */
  size?: 'wide' | 'medium' | 'content';
  /** Override max-width of inner container (e.g. max-w-4xl) */
  innerClassName?: string;
};

export function AppPageShell({ children, className, size = 'wide', innerClassName }: Props) {
  const max =
    size === 'medium'
      ? 'max-w-2xl'
      : size === 'content'
        ? 'max-w-4xl'
        : 'max-w-6xl';

  return (
    <div className={cn('app-page-bg flex min-h-0 flex-1 flex-col', className)}>
      <div
        className={cn(
          'relative z-10 mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8',
          max,
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
