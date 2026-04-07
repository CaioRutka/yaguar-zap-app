export type WaConnectionStatus = 'connecting' | 'open' | 'close';

export type WaSessionPublicState = {
  tenantId: string;
  sessionId: string;
  connection: WaConnectionStatus;
  qr: string | null;
  loggedInUser: { id: string; name?: string } | null;
  lastDisconnectReason?: number;
  lastErrorMessage?: string;
};

export type WaMessageListItem = {
  waMessageId: string;
  remoteJid: string;
  remoteJidAlt?: string;
  fromMe: boolean;
  pushName?: string;
  waTimestamp: string;
  contentType?: string;
  text?: string;
  storedAt: string;
  hasMedia?: boolean;
  mediaMimetype?: string;
  mediaSize?: number;
  documentFileName?: string;
};

export type WaChatListItem = {
  remoteJid: string;
  /** Telefone/JID PN para exibição quando `remoteJid` é @lid */
  displayRemoteJid: string;
  lastMessageText?: string;
  lastMessageAt: string;
  lastFromMe: boolean;
  /** Nome do perfil WhatsApp do contato (só mensagens recebidas); não muda quando você envia. */
  lastPushName?: string;
  totalMessages: number;
  unreadCount: number;
  lead?: {
    name?: string;
    funnelStage?: string;
    temperature?: string;
    category?: string;
    tags?: string[];
    blocked?: boolean;
  };
};

export type WaScheduledMessageDto = {
  _id: string;
  sessionId: string;
  remoteJid: string;
  text: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  cancelConditions: string[];
  failReason?: string;
  sentAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaItemDto = {
  _id: string;
  sessionId: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document';
  mimetype: string;
  size: number;
  mediaUrl?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type BroadcastStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export type BroadcastDeliveryChannel = 'baileys_web' | 'cloud_api';

export type BroadcastDto = {
  _id: string;
  sessionId: string;
  name: string;
  baseMessage: string;
  variableMessage?: string;
  useAiVariation: boolean;
  deliveryChannel: BroadcastDeliveryChannel;
  status: BroadcastStatus;
  filters: {
    funnelStage?: string;
    temperature?: string;
    category?: string;
    tags?: string[];
    onlyWithLead?: boolean;
    search?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    facebookCampaign?: string;
    valueMin?: number;
    valueMax?: number;
    ccl?: string;
  };
  cadence: {
    minDelayMs: number;
    maxDelayMs: number;
    batchSize: number;
    pauseBetweenBatchesMs: number;
    delayPatternMs?: number[];
  };
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
};

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export type MeetingDto = {
  _id: string;
  sessionId: string;
  remoteJid: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  leadName?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaleDto = {
  _id: string;
  sessionId: string;
  remoteJid: string;
  leadName?: string;
  value: number;
  product: string;
  notes?: string;
  soldBy?: string;
  createdAt: string;
};

export type UserRole = 'agent' | 'manager' | 'admin';

export type UserDto = {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  assignedSessions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatReadStatus = 'unread' | 'read' | 'all';

export type ChatFilters = {
  search?: string;
  readStatus?: ChatReadStatus;
  funnelStage?: LeadFunnelStage;
  temperature?: LeadTemperature;
  category?: LeadCategory;
  /** Lead deve conter todas as tags (AND). */
  tags?: string[];
};

export type LeadFunnelStage =
  | 'novo'
  | 'qualificado'
  | 'negociacao'
  | 'proposta'
  | 'ganho'
  | 'perdido';

export type LeadCategory = 'imovel' | 'veiculo' | 'outro';

export type LeadTemperature = 'frio' | 'morno' | 'quente';

export type WaLeadDto = {
  _id: string;
  sessionId: string;
  remoteJid: string;
  name?: string;
  phone?: string;
  value?: number;
  ccl?: string;
  category: LeadCategory;
  funnelStage: LeadFunnelStage;
  tags: string[];
  temperature?: LeadTemperature;
  observation?: string;
  facebookCampaign?: string;
  blocked: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Payload JSON para integrar histórico ao card do pipeline / CRM (Épico B4). */
export type ConversationExportDto = {
  format: 'yaguar_whatsapp_conversation_v1';
  sessionId: string;
  remoteJid: string;
  exportedAt: string;
  messageCount: number;
  messages: WaMessageListItem[];
  lead: WaLeadDto | null;
};

export const FUNNEL_STAGES: { value: LeadFunnelStage; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'ganho', label: 'Ganho' },
  { value: 'perdido', label: 'Perdido' },
];

export const LEAD_CATEGORIES: { value: LeadCategory; label: string }[] = [
  { value: 'imovel', label: 'Imóvel' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'outro', label: 'Outro' },
];

export const LEAD_TEMPERATURES: { value: LeadTemperature; label: string }[] = [
  { value: 'frio', label: 'Frio' },
  { value: 'morno', label: 'Morno' },
  { value: 'quente', label: 'Quente' },
];

export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

export type HealthResponse = {
  ok: boolean;
  service: string;
  env: string;
};

export type MongoPingResponse = {
  ok: boolean;
  ping?: unknown;
  error?: string;
};
