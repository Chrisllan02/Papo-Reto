import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../api/camara';
import { createJsonResponse } from './testUtils';

describe('/api/camara', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const proxy = async (url: string, headers: Record<string, string> = {}) => {
    const response = createJsonResponse();
    await handler({ method: 'GET', headers, query: { url } } as any, response.res as any);
    return response;
  };

  const jsonUpstream = (init: ResponseInit = {}, body = '{"dados":[]}') =>
    new Response(body, { status: 200, headers: { 'content-type': 'application/json' }, ...init });

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

  it('rejects upstream responses that are too large', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('too large', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-length': '2000001',
        },
      })
    ));

    const response = createJsonResponse();
    await handler({
      method: 'GET',
      headers: { accept: 'application/json' },
      query: { url: 'https://dadosabertos.camara.leg.br/api/v2/deputados?itens=1000' },
    } as any, response.res as any);

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: 'Upstream response too large.' });
  });

  it.each([
    ['look-alike host', 'https://dadosabertos.camara.leg.br.evil.com/api/v2/deputados'],
    ['userinfo trick', 'https://dadosabertos.camara.leg.br@evil.com/api/v2/deputados'],
    ['plain http', 'http://dadosabertos.camara.leg.br/api/v2/deputados'],
    ['explicit port', 'https://dadosabertos.camara.leg.br:8443/api/v2/deputados'],
    ['credentials', 'https://user:pass@dadosabertos.camara.leg.br/api/v2/deputados'],
  ])('rejects %s before any upstream request', async (_label, url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxy(url);

    expect(response.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    'https://dadosabertos.camara.leg.br/admin',
    'https://dadosabertos.camara.leg.br/api/v1/deputados',
    'https://dadosabertos.camara.leg.br/api/v2/..%2f..%2fsecret',
    'https://dadosabertos.camara.leg.br/api/v2/a%5Cb',
    'https://legis.senado.leg.br/api/v2/deputados',
    'https://legis.senado.leg.br/dadosabertos/../secret',
  ])('rejects path outside the allowed prefix: %s', async (url) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxy(url);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Unsupported path.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not follow upstream redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://evil.example/' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxy('https://dadosabertos.camara.leg.br/api/v2/deputados');

    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: 'manual' }));
    expect(response.statusCode).toBe(502);
    expect(response.headers.get('location')).toBeUndefined();
  });

  it('rejects upstream content types other than json and xml', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<script>alert(1)</script>', { status: 200, headers: { 'content-type': 'text/html' } })
    ));

    const response = await proxy('https://dadosabertos.camara.leg.br/api/v2/deputados');

    expect(response.statusCode).toBe(502);
    expect(response.body).not.toContain('script');
  });

  it('ignores the client Accept header and hardens the response headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonUpstream());
    vi.stubGlobal('fetch', fetchMock);

    const response = await proxy('https://dadosabertos.camara.leg.br/api/v2/deputados', { accept: 'text/html' });

    expect(fetchMock.mock.calls[0][1].headers.Accept).toBe('application/json');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'; sandbox");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('normalizes senate XML responses to application/xml', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('<Lista/>', { status: 200, headers: { 'content-type': 'text/xml;charset=UTF-8' } })
    ));

    const response = await proxy('https://legis.senado.leg.br/dadosabertos/senador/lista/atual');

    expect(response.statusCode).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=UTF-8');
  });

  it('maps upstream timeouts to 504 without leaking details', async () => {
    const timeout = new Error('connect ETIMEDOUT 10.0.0.1');
    timeout.name = 'TimeoutError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout));

    const response = await proxy('https://dadosabertos.camara.leg.br/api/v2/deputados');

    expect(response.statusCode).toBe(504);
    expect(response.body).not.toContain('10.0.0.1');
  });

  it('rate limits clients per IP', async () => {
    let last = createJsonResponse();
    for (let index = 0; index < 121; index += 1) {
      last = createJsonResponse();
      await handler({ method: 'GET', headers: { 'x-forwarded-for': '198.51.100.7' }, query: {} } as any, last.res as any);
    }

    expect(last.statusCode).toBe(429);

    const other = createJsonResponse();
    await handler({ method: 'GET', headers: { 'x-forwarded-for': '198.51.100.8' }, query: {} } as any, other.res as any);
    expect(other.statusCode).toBe(400);
  });
});
