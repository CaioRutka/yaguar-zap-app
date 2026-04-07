import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-primary/10 text-primary',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  error:
    'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  muted: 'bg-muted text-muted-foreground',
  info:
    'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
} as const;

type Props = HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof variants;
};

export function Badge({ className, variant = 'default', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/10',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
