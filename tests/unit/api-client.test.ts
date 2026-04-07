import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server } from '../mocks/server';
import * as api from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API client', () => {
  it('getHealth returns ok', async () => {
    const data = await api.getHealth();
    expect(data.ok).toBe(true);
    expect(data.service).toBe('yaguarzap-back');
  });

  it('listSessions returns sessions array', async () => {
    const data = await api.listSessions('t1');
    expect(data.sessions).toHaveLength(1);
    expect(data.sessions[0].sessionId).toBe('default');
    expect(data.sessions[0].connection).toBe('open');
  });

  it('getSession returns session state', async () => {
    const data = await api.getSession('t1', 'default');
    expect(data.sessionId).toBe('default');
    expect(data.connection).toBe('open');
  });

  it('listMessages returns messages', async () => {
    const data = await api.listMessages('t1', 'default');
    expect(data.messages).toHaveLength(1);
    expect(data.messages[0].text).toBe('Olá!');
  });

  it('sendMessage returns waMessageId', async () => {
    const data = await api.sendMessage('t1', 'default', {
      remoteJid: '5511888888888',
      text: 'Hello',
    });
    expect(data.waMessageId).toBe('stub-id');
  });

  it('request without tenant throws ApiError with MISSING_TENANT_ID', async () => {
    try {
      await api.listSessions('');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe('MISSING_TENANT_ID');
    }
  });
});
