import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/camara';
import { createJsonResponse } from './testUtils';

describe('/api/camara', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects non-GET requests', async () => {
    const response = createJsonResponse();

    await handler({ method: 'POST', headers: {}, query: {} } as any, response.res as any);

    expect(response.statusCode).toBe(405);
    expect(response.json()).toEqual({ error: 'Method not allowed.' });
  });

  it('rejects unsupported hosts', async () => {
    const response = createJsonResponse();

    await handler({
      method: 'GET',
      headers: {},
      query: { url: 'https://example.com/data.json' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Unsupported host.' });
  });

  it('proxies allowed legislative hosts', async () => {
    const upstreamPayload = JSON.stringify({ dados: [{ id: 1 }] });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(upstreamPayload, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = createJsonResponse();
    await handler({
      method: 'GET',
      headers: { accept: 'application/json' },
      query: { url: 'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.json()).toEqual({ dados: [{ id: 1 }] });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1',
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });
});
