import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** JID legível: remove sufixos comuns; para @lid mantém o id interno (não é o telefone). */
export function formatJid(jid: string): string {
  return jid
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/@lid$/i, '')
    .replace(/@g\.us$/i, ' (grupo)');
}

/**
 * Número/contato para UI: quando o chat é @lid, usa `displayRemoteJid` (@s.whatsapp.net) vindo da API.
 */
export function formatContactAddress(remoteJid: string, displayRemoteJid?: string | null): string {
  const j = displayRemoteJid?.trim() || remoteJid;
  return formatJid(j);
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Valor para `<input type="datetime-local" />` a partir de ISO 8601. */
export function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
