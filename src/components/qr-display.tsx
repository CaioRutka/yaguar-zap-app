'use client';

import { useEffect, useRef } from 'react';

type Props = {
  qr: string | null;
  /** Larger canvas and chrome for the session pairing view */
  featured?: boolean;
};

export function QrDisplay({ qr, featured }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = featured ? 280 : 240;
  const boxClass = featured ? 'h-[min(18rem,72vw)] w-[min(18rem,72vw)]' : 'h-60 w-60';

  useEffect(() => {
    if (!qr || !canvasRef.current) return;

    let cancelled = false;

    import('qrcode').then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, qr, {
        width: size,
        margin: featured ? 2 : 2,
        color: { dark: '#0a0f1a', light: '#ffffff' },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [qr, size, featured]);

  if (!qr) {
    return (
      <div
        className={`flex ${boxClass} items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-muted/30 dark:bg-muted/20`}
      >
        <div className="space-y-3 text-center px-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary animate-pulse">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Gerando QR code…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`qr-display-frame inline-block rounded-2xl bg-white p-3 shadow-lg ${featured ? 'ring-2 ring-primary/20 shadow-primary/5' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="block max-h-full max-w-full rounded-lg"
        aria-label="QR Code para pareamento do WhatsApp"
      />
    </div>
  );
}
