import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/profile-cache';
import { createJsonResponse } from './testUtils';
import { head, put } from '@vercel/blob';

vi.mock('@vercel/blob', () => ({
  head: vi.fn(),
  put: vi.fn(async () => ({ url: 'https://blob.example/politicians/1.json' })),
}));

const officialProfile = () => new Response(JSON.stringify({
  dados: {
    nomeCivil: 'MARIA TESTE',
    sexo: 'F',
    dataNascimento: '1980-01-01',
    municipioNascimento: 'São Paulo',
    ufNascimento: 'SP',
    redeSocial: ['https://example.com'],
    ultimoStatus: {
      nomeEleitoral: 'MARIA TESTE',
      siglaPartido: 'PT',
      siglaUf: 'SP',
      urlFoto: 'https://example.com/maria.jpg',
      situacao: 'Exercício',
      condicaoEleitoral: 'Titular',
      descricaoStatus: '',
      gabinete: { sala: '101', andar: '1', predio: 'Anexo', telefone: '1234', email: 'maria@example.com' },
    },
  },
}), { status: 200, headers: { 'content-type': 'application/json' } });

const blobJson = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } });

let ipCounter = 0;
const request = (method: string, id: string, extra: { headers?: Record<string, string>; body?: unknown } = {}) => {
  ipCounter += 1;
  return {
    method,
    query: { type: 'politician', id },
    body: extra.body,
    headers: { 'x-forwarded-for': `10.1.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`, ...extra.headers },
  } as any;
};

describe('/api/profile-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(head).mockRejectedValue(new Error('not found'));
    delete process.env.PROFILE_CACHE_WRITE_SECRET;
    delete process.env.CRON_SECRET;
    delete process.env.VERCEL;
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects production writes when no write secret is configured', async () => {
    process.env.VERCEL = '1';
    const response = createJsonResponse();

    await handler(request('PUT', '1', { body: { name: 'Maria' } }), response.res as any);

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'Profile cache writes are not configured.' });
  });

  it('rejects writes with a wrong bearer token of any length', async () => {
    process.env.PROFILE_CACHE_WRITE_SECRET = 'write-secret';

    for (const authorization of ['Bearer wrong', 'Bearer write-secret-longer', 'write-secret']) {
      const response = createJsonResponse();
      await handler(request('PUT', '1', { headers: { authorization }, body: { name: 'Maria' } }), response.res as any);
      expect(response.statusCode).toBe(401);
    }
    expect(put).not.toHaveBeenCalled();
  });

  it('allows writes with the configured bearer token', async () => {
    process.env.PROFILE_CACHE_WRITE_SECRET = 'write-secret';
    const response = createJsonResponse();

    await handler(request('PUT', '1', { headers: { authorization: 'Bearer write-secret' }, body: { name: 'Maria' } }), response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(put).toHaveBeenCalledWith(
      'politicians/1.json',
      expect.stringContaining('"name": "Maria"'),
      expect.objectContaining({ access: 'public', addRandomSuffix: false })
    );
  });

  it.each(['0', '01', '007', '123456789', '1e3', '-1', '1.5', ' 1', ''])('rejects invalid id %j', async (id) => {
    const response = createJsonResponse();

    await handler(request('GET', id), response.res as any);

    expect(response.statusCode).toBe(400);
    expect(head).not.toHaveBeenCalled();
  });

  it('serves a cached profile with CDN cache headers using head() instead of list()', async () => {
    vi.mocked(head).mockResolvedValue({ url: 'https://blob.example/politicians/20.json' } as any);
    vi.stubGlobal('fetch', vi.fn(async () => blobJson({ id: 20, name: 'Ana' })));
    const response = createJsonResponse();

    await handler(request('GET', '20'), response.res as any);

    expect(head).toHaveBeenCalledWith('politicians/20.json');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: 20, name: 'Ana' });
    expect(response.headers.get('cache-control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
  });

  it('returns an uncacheable 404 when nothing is cached', async () => {
    const response = createJsonResponse();

    await handler(request('GET', '21'), response.res as any);

    expect(response.statusCode).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('refreshes from official data when no cached profile exists', async () => {
    const fetchMock = vi.fn(async () => officialProfile());
    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await handler(request('POST', '30', { body: { ignored: true } }), response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, refreshed: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://dadosabertos.camara.leg.br/api/v2/deputados/30',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(put).toHaveBeenCalledWith(
      'politicians/30.json',
      expect.stringContaining('"civilName": "Maria teste"'),
      expect.objectContaining({ access: 'public', addRandomSuffix: false })
    );
    expect(put).toHaveBeenCalledWith('politicians/30.json', expect.not.stringContaining('ignored'), expect.anything());
  });

  it('does not rebuild or write when the cached profile is under 24h old', async () => {
    const existing = { id: 31, name: 'Fresh', updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() };
    vi.mocked(head).mockResolvedValue({ url: 'https://blob.example/politicians/31.json' } as any);
    const fetchMock = vi.fn(async () => blobJson(existing));
    vi.stubGlobal('fetch', fetchMock);
    const response = createJsonResponse();

    await handler(request('POST', '31'), response.res as any);

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(existing);
    expect(put).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('dadosabertos'), expect.anything());
  });

  it('rebuilds when the cached profile is older than 24h', async () => {
    const stale = { id: 32, name: 'Old', updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() };
    vi.mocked(head).mockResolvedValue({ url: 'https://blob.example/politicians/32.json' } as any);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('dadosabertos') ? officialProfile() : blobJson(stale))));
    const response = createJsonResponse();

    await handler(request('POST', '32'), response.res as any);

    expect(response.json()).toEqual({ ok: true, refreshed: true });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('does not leak upstream failure details on refresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED 10.9.9.9'); }));
    const response = createJsonResponse();

    await handler(request('POST', '33'), response.res as any);

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('10.9.9.9');
  });
});
