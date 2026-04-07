'use client';

import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
  size?: 'sm' | 'md';
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'sm',
}: Props<T>) {
  const text = size === 'sm' ? 'text-[11px] py-1.5' : 'text-xs py-2';
  return (
    <div
      className={cn(
        'app-segmented flex gap-0.5 rounded-xl p-0.5',
        className,
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-lg font-medium transition-all duration-200 cursor-pointer',
              text,
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
