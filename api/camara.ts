import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  method?: string;
  url?: string;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

const ALLOWED_HOSTS = new Set([
  'dadosabertos.camara.leg.br',
  'legis.senado.leg.br',
]);

const getQueryValue = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const jsonResponse = (res: VercelResponse, status: number, data: unknown) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const getRequestedUrl = (req: VercelRequest) => {
  const fromQuery = getQueryValue(req.query?.url);
  if (fromQuery) return fromQuery;

  const requestUrl = new URL(req.url || '', 'http://localhost');
  return requestUrl.searchParams.get('url') || '';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  const rawUrl = getRequestedUrl(req);
  if (!rawUrl || rawUrl.length > 2_000) {
    return jsonResponse(res, 400, { error: 'Invalid URL.' });
  }

  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    return jsonResponse(res, 400, { error: 'Invalid URL.' });
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return jsonResponse(res, 400, { error: 'Unsupported host.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: req.headers.accept || 'application/json, text/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: controller.signal,
    });

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const body = await upstream.arrayBuffer();

    res.status?.(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store');
    res.end(Buffer.from(body));
  } catch (error: any) {
    const aborted = error?.name === 'AbortError';
    return jsonResponse(res, aborted ? 504 : 502, { error: aborted ? 'Upstream timeout.' : 'Upstream request failed.' });
  } finally {
    clearTimeout(timeoutId);
  }
}
