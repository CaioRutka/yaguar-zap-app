'use client';

import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import data from '@emoji-mart/data';

const MartPicker = dynamic(() => import('@emoji-mart/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[22rem] w-[min(352px,calc(100vw-2rem))] items-center justify-center text-xs text-muted-foreground">
      Carregando emojis…
    </div>
  ),
});

type Props = {
  onSelect: (emoji: string) => void;
  className?: string;
};

/**
 * Biblioteca completa (emoji-mart + @emoji-mart/data). Em dispositivos Apple, o sistema usa a coloração Apple nativa.
 */
export function EmojiPicker({ onSelect, className }: Props) {
  return (
    <div
      className={cn(
        'emoji-mart-scope w-[min(352px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl animate-slide-up',
        className,
      )}
    >
      <MartPicker
        data={data}
        onEmojiSelect={(e: { native: string }) => onSelect(e.native)}
        theme="dark"
        locale="pt"
        previewPosition="none"
        skinTonePosition="search"
        navPosition="top"
        searchPosition="top"
        maxFrequentRows={1}
      />
    </div>
  );
}
