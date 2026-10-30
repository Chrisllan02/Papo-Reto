import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/cron/refresh-legislative-data';
import { createJsonResponse } from './testUtils';

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock('../api/bootstrap', () => ({
  refreshLegislativeBootstrap: refreshMock,
}));

const refreshed = {
  data: {
    politicians: [{ id: 1 }, { id: 2 }],
    feedItems: [{ id: 2 }],
    parties: [{ id: 3 }],
    generatedAt: '2026-06-03T00:00:00.000Z',
    partial: false,
    warnings: [],
  },
  cache: { persisted: true },
};

describe('/api/cron/refresh-legislative-data', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refreshMock.mockReset();
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects production cron calls when CRON_SECRET is missing', async () => {
    process.env.VERCEL = '1';
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: {} } as any, response.res as any);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Unauthorized.' });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('rejects wrong bearer tokens, including ones with a different length', async () => {
    process.env.CRON_SECRET = 'secret-123';

    for (const authorization of ['Bearer wrong', 'Bearer secret-123-extra', 'secret-123', undefined]) {
      const response = createJsonResponse();
      await handler({ method: 'GET', headers: { authorization } } as any, response.res as any);
      expect(response.statusCode).toBe(401);
    }
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('rebuilds the bootstrap in-process instead of fetching its own public URL', async () => {
    process.env.CRON_SECRET = 'secret-123';
    refreshMock.mockResolvedValue(refreshed);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret-123', host: 'evil.example' } } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      source: 'refresh:blob',
      counts: { politicians: 2, feedItems: 1, parties: 1 },
      generatedAt: '2026-06-03T00:00:00.000Z',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a generic error without leaking the failure reason', async () => {
    process.env.CRON_SECRET = 'secret-123';
    refreshMock.mockRejectedValue(new Error('token=abc123 leaked'));
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret-123' } } as any, response.res as any);

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('abc123');
  });

  it('reports failure when the rebuild had no deputies and was not persisted', async () => {
    process.env.CRON_SECRET = 'secret-123';
    refreshMock.mockResolvedValue({ ...refreshed, cache: { persisted: false, skipped: true } });
    const response = createJsonResponse();

    await handler({ method: 'GET', headers: { authorization: 'Bearer secret-123' } } as any, response.res as any);

    expect(response.statusCode).toBe(502);
  });
});
