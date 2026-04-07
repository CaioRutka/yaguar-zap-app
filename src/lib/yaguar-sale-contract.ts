import type { SaleDto } from '@/lib/types/whatsapp';

/** Contrato estável (v1) para o shell Yaguar / integrações reagirem a uma venda registrada no painel WA. */
export type YaguarSaleRegisteredPayloadV1 = {
  version: 1;
  tenantId: string;
  sessionId: string;
  remoteJid: string;
  sale: SaleDto;
};

declare global {
  interface Window {
    /** Opcional: atribuído pelo host (ex.: iframe pai) para receber vendas sem alterar este repositório. */
    __YAGUAR_ON_SALE_REGISTERED__?: (payload: YaguarSaleRegisteredPayloadV1) => void;
  }
}

export function notifyYaguarSaleRegistered(payload: YaguarSaleRegisteredPayloadV1): void {
  if (typeof window === 'undefined') return;
  try {
    window.__YAGUAR_ON_SALE_REGISTERED__?.(payload);
  } catch {
    /* integrador não deve quebrar o fluxo */
  }
  const url = process.env.NEXT_PUBLIC_YAGUAR_SALE_WEBHOOK_URL;
  if (url?.trim()) {
    void fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }
}
