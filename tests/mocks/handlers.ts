import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3001';

export const handlers = [
  http.get(`${BASE}/health`, () =>
    HttpResponse.json({ ok: true, service: 'yaguarzap-back', env: 'test' }),
  ),

  http.get(`${BASE}/api/v1/diagnostics/mongo-ping`, ({ request }) => {
    const tenant = request.headers.get('X-Tenant-Id');
    if (!tenant) {
      return HttpResponse.json(
        { error: 'Cabeçalho X-Tenant-Id é obrigatório', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ ok: true, ping: { ok: 1 } });
  }),

  http.get(`${BASE}/api/v1/whatsapp/sessions`, ({ request }) => {
    const tenant = request.headers.get('X-Tenant-Id');
    if (!tenant) {
      return HttpResponse.json(
        { error: 'Cabeçalho X-Tenant-Id é obrigatório', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      sessions: [
        {
          tenantId: tenant,
          sessionId: 'default',
          connection: 'open',
          qr: null,
          loggedInUser: { id: '5511999999999@s.whatsapp.net', name: 'Test' },
        },
      ],
    });
  }),

  http.get(`${BASE}/api/v1/whatsapp/sessions/:sessionId`, ({ request, params }) => {
    const tenant = request.headers.get('X-Tenant-Id');
    if (!tenant) {
      return HttpResponse.json(
        { error: 'Cabeçalho X-Tenant-Id é obrigatório', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      tenantId: tenant,
      sessionId: params.sessionId,
      connection: 'open',
      qr: null,
      loggedInUser: { id: '5511999999999@s.whatsapp.net', name: 'Test' },
    });
  }),

  http.get(`${BASE}/api/v1/whatsapp/sessions/:sessionId/messages`, ({ request }) => {
    const tenant = request.headers.get('X-Tenant-Id');
    if (!tenant) {
      return HttpResponse.json(
        { error: 'Cabeçalho X-Tenant-Id é obrigatório', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }
    return HttpResponse.json({
      messages: [
        {
          waMessageId: 'm1',
          remoteJid: '5511888888888@s.whatsapp.net',
          fromMe: false,
          pushName: 'Alice',
          waTimestamp: '2026-04-01T10:00:00.000Z',
          contentType: 'conversation',
          text: 'Olá!',
          storedAt: '2026-04-01T10:00:01.000Z',
        },
      ],
    });
  }),

  http.post(`${BASE}/api/v1/whatsapp/sessions/:sessionId/messages`, ({ request }) => {
    const tenant = request.headers.get('X-Tenant-Id');
    if (!tenant) {
      return HttpResponse.json(
        { error: 'Cabeçalho X-Tenant-Id é obrigatório', code: 'MISSING_TENANT_ID' },
        { status: 400 },
      );
    }
    return HttpResponse.json({ waMessageId: 'stub-id' }, { status: 201 });
  }),
];
