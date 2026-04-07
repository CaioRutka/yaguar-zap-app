import type {
  BroadcastDto,
  HealthResponse,
  MediaItemDto,
  MeetingDto,
  MongoPingResponse,
  SaleDto,
  WaChatListItem,
  WaLeadDto,
  WaMessageListItem,
  WaScheduledMessageDto,
  WaSessionPublicState,
  ConversationExportDto,
} from '@/lib/types/whatsapp';
import { ApiError } from './errors';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) throw await ApiError.fromResponse(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function withTenant(tenantId: string, headers?: HeadersInit): HeadersInit {
  return { ...headers, 'X-Tenant-Id': tenantId };
}

// ── Health / Diagnostics ────────────────────────────────────────────

export function getHealth() {
  return request<HealthResponse>('/health');
}

export function getMongoPing(tenantId: string) {
  return request<MongoPingResponse>('/api/v1/diagnostics/mongo-ping', {
    headers: withTenant(tenantId),
  });
}

export type WhatsappRiskDiagnostics = {
  ok: boolean;
  tenantId: string;
  windowHours: number;
  broadcastSends24h: number;
  thresholds: {
    alertOverBroadcastSends24h: number;
    broadcastMaxRecipients: number;
  };
  alerts: string[];
};

export function getWhatsappRisk(tenantId: string) {
  return request<WhatsappRiskDiagnostics>('/api/v1/diagnostics/whatsapp-risk', {
    headers: withTenant(tenantId),
  });
}

// ── Sessions ────────────────────────────────────────────────────────

export function listSessions(tenantId: string) {
  return request<{ sessions: WaSessionPublicState[] }>(
    '/api/v1/whatsapp/sessions',
    { headers: withTenant(tenantId) },
  );
}

export function getSession(tenantId: string, sessionId: string) {
  return request<WaSessionPublicState>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}`,
    { headers: withTenant(tenantId) },
  );
}

export function startSession(tenantId: string, sessionId: string) {
  return request<WaSessionPublicState>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/start`,
    { method: 'POST', headers: withTenant(tenantId) },
  );
}

export function deleteSession(
  tenantId: string,
  sessionId: string,
  opts: { logout?: boolean; clearAuth?: boolean } = {},
) {
  const params = new URLSearchParams();
  if (opts.logout) params.set('logout', '1');
  if (opts.clearAuth) params.set('clearAuth', '1');
  const qs = params.toString();

  return request<void>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}${qs ? `?${qs}` : ''}`,
    { method: 'DELETE', headers: withTenant(tenantId) },
  );
}

// ── Messages ────────────────────────────────────────────────────────

export function exportConversationForCrm(
  tenantId: string,
  sessionId: string,
  remoteJid: string,
  opts: { limit?: number } = {},
): Promise<ConversationExportDto> {
  const params = new URLSearchParams({ remoteJid });
  if (opts.limit != null) params.set('limit', String(opts.limit));
  return request<ConversationExportDto>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/conversation-export?${params.toString()}`,
    { headers: withTenant(tenantId) },
  );
}

export function listMessages(
  tenantId: string,
  sessionId: string,
  opts: { remoteJid?: string; limit?: number; before?: string } = {},
) {
  const params = new URLSearchParams();
  if (opts.remoteJid) params.set('remoteJid', opts.remoteJid);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  const qs = params.toString();

  return request<{ messages: WaMessageListItem[] }>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/messages${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

/** URL absoluta para fetch com header X-Tenant-Id (não usar em <img src> direto). */
export function getMessageMediaRequestUrl(
  sessionId: string,
  waMessageId: string,
  remoteJid: string,
): string {
  const qs = new URLSearchParams({ remoteJid });
  return `${BASE_URL}/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(waMessageId)}/media?${qs.toString()}`;
}

export function sendMessage(
  tenantId: string,
  sessionId: string,
  body: { remoteJid: string; text: string },
) {
  return request<{ waMessageId: string }>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: 'POST',
      headers: withTenant(tenantId),
      body: JSON.stringify(body),
    },
  );
}

// ── Chats ──────────────────────────────────────────────────────────

export function listChats(
  tenantId: string,
  sessionId: string,
  opts: {
    search?: string;
    limit?: number;
    readStatus?: string;
    funnelStage?: string;
    temperature?: string;
    category?: string;
    tags?: string[];
  } = {},
) {
  const params = new URLSearchParams();
  if (opts.search) params.set('search', opts.search);
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.readStatus && opts.readStatus !== 'all') params.set('readStatus', opts.readStatus);
  if (opts.funnelStage) params.set('funnelStage', opts.funnelStage);
  if (opts.temperature) params.set('temperature', opts.temperature);
  if (opts.category) params.set('category', opts.category);
  if (opts.tags && opts.tags.length > 0) {
    for (const t of opts.tags) {
      params.append('tags', t);
    }
  }
  const qs = params.toString();

  return request<{ chats: WaChatListItem[] }>(
    `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/chats${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

// ── Leads ──────────────────────────────────────────────────────────

function sessionLeadsPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/leads`;
}

function leadPath(sessionId: string, remoteJid: string) {
  return `${sessionLeadsPath(sessionId)}/${encodeURIComponent(remoteJid)}`;
}

export function createLead(
  tenantId: string,
  sessionId: string,
  body: {
    remoteJid: string;
    name?: string;
    phone?: string;
    value?: number;
    ccl?: string;
    category?: string;
    funnelStage?: string;
    tags?: string[];
    temperature?: string;
    observation?: string;
    facebookCampaign?: string;
  },
) {
  return request<WaLeadDto>(sessionLeadsPath(sessionId), {
    method: 'POST',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function listLeads(
  tenantId: string,
  sessionId: string,
  opts: {
    funnelStage?: string;
    tag?: string;
    temperature?: string;
    category?: string;
    search?: string;
    limit?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (opts.funnelStage) params.set('funnelStage', opts.funnelStage);
  if (opts.tag) params.set('tag', opts.tag);
  if (opts.temperature) params.set('temperature', opts.temperature);
  if (opts.category) params.set('category', opts.category);
  if (opts.search) params.set('search', opts.search);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();

  return request<{ leads: WaLeadDto[] }>(
    `${sessionLeadsPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

export function getLead(tenantId: string, sessionId: string, remoteJid: string) {
  return request<WaLeadDto>(leadPath(sessionId, remoteJid), {
    headers: withTenant(tenantId),
  });
}

export function updateLead(
  tenantId: string,
  sessionId: string,
  remoteJid: string,
  body: Record<string, unknown>,
) {
  return request<WaLeadDto>(leadPath(sessionId, remoteJid), {
    method: 'PATCH',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function updateLeadFunnel(
  tenantId: string,
  sessionId: string,
  remoteJid: string,
  funnelStage: string,
) {
  return request<WaLeadDto>(`${leadPath(sessionId, remoteJid)}/funnel`, {
    method: 'PATCH',
    headers: withTenant(tenantId),
    body: JSON.stringify({ funnelStage }),
  });
}

export function addLeadObservation(
  tenantId: string,
  sessionId: string,
  remoteJid: string,
  observation: string,
) {
  return request<WaLeadDto>(`${leadPath(sessionId, remoteJid)}/observation`, {
    method: 'PATCH',
    headers: withTenant(tenantId),
    body: JSON.stringify({ observation }),
  });
}

export function setLeadBlocked(
  tenantId: string,
  sessionId: string,
  remoteJid: string,
  blocked: boolean,
) {
  return request<WaLeadDto>(`${leadPath(sessionId, remoteJid)}/block`, {
    method: 'PATCH',
    headers: withTenant(tenantId),
    body: JSON.stringify({ blocked }),
  });
}

// ── Media ────────────────────────────────────────────────────────────

export function sendMedia(
  tenantId: string,
  sessionId: string,
  data: {
    remoteJid: string;
    file: File;
    caption?: string;
    mediaType?: string;
    ptt?: boolean;
  },
) {
  const formData = new FormData();
  formData.append('remoteJid', data.remoteJid);
  formData.append('file', data.file);
  if (data.caption) formData.append('caption', data.caption);
  if (data.mediaType) formData.append('mediaType', data.mediaType);
  if (data.ptt) formData.append('ptt', 'true');

  return fetch(`${BASE_URL}/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/media`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': tenantId },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw await ApiError.fromResponse(res);
    return res.json() as Promise<{ waMessageId: string; mediaType: string }>;
  });
}

// ── Media Library ────────────────────────────────────────────────────

function mediaLibraryPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/media-library`;
}

export function uploadMediaItem(
  tenantId: string,
  sessionId: string,
  data: { file: File; name?: string; tags?: string[] },
) {
  const formData = new FormData();
  formData.append('file', data.file);
  if (data.name) formData.append('name', data.name);
  if (data.tags?.length) formData.append('tags', JSON.stringify(data.tags));

  return fetch(`${BASE_URL}${mediaLibraryPath(sessionId)}`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': tenantId },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) throw await ApiError.fromResponse(res);
    return res.json() as Promise<{ mediaItem: MediaItemDto }>;
  });
}

export function listMediaItems(
  tenantId: string,
  sessionId: string,
  opts: { type?: string } = {},
) {
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  const qs = params.toString();
  return request<{ mediaItems: MediaItemDto[] }>(
    `${mediaLibraryPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

export function deleteMediaItem(tenantId: string, sessionId: string, mediaId: string) {
  return request<{ deleted: boolean }>(
    `${mediaLibraryPath(sessionId)}/${encodeURIComponent(mediaId)}`,
    { method: 'DELETE', headers: withTenant(tenantId) },
  );
}

export function getMediaDownloadUrl(sessionId: string, mediaId: string) {
  return `${BASE_URL}${mediaLibraryPath(sessionId)}/${encodeURIComponent(mediaId)}/download`;
}

/** Download a gallery item as a File for sending via WhatsApp (multipart). */
export async function downloadMediaItemAsFile(
  tenantId: string,
  sessionId: string,
  item: MediaItemDto,
): Promise<File> {
  const url = `${BASE_URL}${mediaLibraryPath(sessionId)}/${encodeURIComponent(item._id)}/download`;
  const res = await fetch(url, {
    headers: { 'X-Tenant-Id': tenantId },
  });
  if (!res.ok) throw await ApiError.fromResponse(res);
  const blob = await res.blob();
  const mime = item.mimetype?.trim() || blob.type || 'application/octet-stream';
  return new File([blob], item.name, { type: mime });
}

// ── Scheduled Messages ───────────────────────────────────────────────

function scheduledPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/scheduled-messages`;
}

export function createScheduledMessage(
  tenantId: string,
  sessionId: string,
  body: {
    remoteJid: string;
    text: string;
    scheduledAt: string;
    cancelConditions?: string[];
  },
) {
  return request<{ scheduledMessage: WaScheduledMessageDto }>(scheduledPath(sessionId), {
    method: 'POST',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function listScheduledMessages(
  tenantId: string,
  sessionId: string,
  opts: { status?: string; remoteJid?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.remoteJid) params.set('remoteJid', opts.remoteJid);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();

  return request<{ scheduledMessages: WaScheduledMessageDto[] }>(
    `${scheduledPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

export function cancelScheduledMessage(tenantId: string, sessionId: string, scheduledId: string) {
  return request<{ scheduledMessage: WaScheduledMessageDto }>(
    `${scheduledPath(sessionId)}/${encodeURIComponent(scheduledId)}`,
    { method: 'DELETE', headers: withTenant(tenantId) },
  );
}

export function updateScheduledMessage(
  tenantId: string,
  sessionId: string,
  scheduledId: string,
  body: { text?: string; scheduledAt?: string },
) {
  return request<{ scheduledMessage: WaScheduledMessageDto }>(
    `${scheduledPath(sessionId)}/${encodeURIComponent(scheduledId)}`,
    {
      method: 'PATCH',
      headers: withTenant(tenantId),
      body: JSON.stringify(body),
    },
  );
}

// ── Broadcasts ───────────────────────────────────────────────────────

function broadcastPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/broadcasts`;
}

export function createBroadcast(
  tenantId: string,
  sessionId: string,
  body: {
    name: string;
    baseMessage: string;
    variableMessage?: string;
    useAiVariation?: boolean;
    deliveryChannel?: 'baileys_web' | 'cloud_api';
    recipientLimit?: number;
    filters?: Record<string, unknown>;
    cadence?: Record<string, unknown>;
  },
) {
  return request<{ broadcast: BroadcastDto }>(broadcastPath(sessionId), {
    method: 'POST',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function listBroadcasts(
  tenantId: string,
  sessionId: string,
  opts: { status?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return request<{ broadcasts: BroadcastDto[] }>(
    `${broadcastPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

export function startBroadcast(tenantId: string, sessionId: string, broadcastId: string) {
  return request<{ message: string }>(
    `${broadcastPath(sessionId)}/${encodeURIComponent(broadcastId)}/start`,
    { method: 'POST', headers: withTenant(tenantId) },
  );
}

export function cancelBroadcast(tenantId: string, sessionId: string, broadcastId: string) {
  return request<{ message: string }>(
    `${broadcastPath(sessionId)}/${encodeURIComponent(broadcastId)}/cancel`,
    { method: 'POST', headers: withTenant(tenantId) },
  );
}

// ── Meetings ─────────────────────────────────────────────────────────

function meetingsPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/meetings`;
}

export function createMeeting(
  tenantId: string,
  sessionId: string,
  body: {
    remoteJid: string;
    title: string;
    description?: string;
    scheduledAt: string;
    durationMinutes?: number;
    leadName?: string;
  },
) {
  return request<{ meeting: MeetingDto }>(meetingsPath(sessionId), {
    method: 'POST',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function listMeetings(
  tenantId: string,
  sessionId: string,
  opts: { status?: string; remoteJid?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.remoteJid) params.set('remoteJid', opts.remoteJid);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return request<{ meetings: MeetingDto[] }>(
    `${meetingsPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}

export function updateMeetingStatus(
  tenantId: string,
  sessionId: string,
  meetingId: string,
  status: string,
) {
  return request<{ meeting: MeetingDto }>(
    `${meetingsPath(sessionId)}/${encodeURIComponent(meetingId)}`,
    {
      method: 'PATCH',
      headers: withTenant(tenantId),
      body: JSON.stringify({ status }),
    },
  );
}

// ── Sales ────────────────────────────────────────────────────────────

function salesPath(sessionId: string) {
  return `/api/v1/whatsapp/sessions/${encodeURIComponent(sessionId)}/sales`;
}

export function createSale(
  tenantId: string,
  sessionId: string,
  body: {
    remoteJid: string;
    leadName?: string;
    value: number;
    product: string;
    notes?: string;
    soldBy?: string;
  },
) {
  return request<{ sale: SaleDto }>(salesPath(sessionId), {
    method: 'POST',
    headers: withTenant(tenantId),
    body: JSON.stringify(body),
  });
}

export function listSales(
  tenantId: string,
  sessionId: string,
  opts: { remoteJid?: string; limit?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.remoteJid) params.set('remoteJid', opts.remoteJid);
  if (opts.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  return request<{ sales: SaleDto[] }>(
    `${salesPath(sessionId)}${qs ? `?${qs}` : ''}`,
    { headers: withTenant(tenantId) },
  );
}
