import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/cron/refresh-legislative-data';
import { createJsonResponse } from './testUtils';

describe('/api/cron/refresh-legislative-data', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
  });

  it('rejects production cron calls when CRON_SECRET is missing', async () => {
    process.env.VERCEL = '1';
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('requires the bearer token when CRON_SECRET is configured', async () => {
    process.env.CRON_SECRET = 'secret-123';
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: { authorization: 'Bearer wrong' } } as any, response.res as any);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('refreshes bootstrap when the bearer token matches', async () => {
    process.env.CRON_SECRET = 'secret-123';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true,
      source: 'refresh:memory',
      partial: false,
      warnings: [],
      data: {
        politicians: [{ id: 1 }],
        feedItems: [{ id: 2 }],
        parties: [{ id: 3 }],
        generatedAt: '2026-06-03T00:00:00.000Z',
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } })));
    const response = createJsonResponse();

    await handler({
      method: 'GET',
      headers: {
        authorization: 'Bearer secret-123',
        host: 'papo-reto-beige.vercel.app',
        'x-forwarded-proto': 'https',
      },
    } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      source: 'refresh:memory',
      counts: { politicians: 1, feedItems: 1, parties: 1 },
    });
  });
});
