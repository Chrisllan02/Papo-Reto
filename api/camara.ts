import type { IncomingMessage, ServerResponse } from 'http';

import { createRateLimiter, getClientBucket } from './lib/rateLimit.js';

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  method?: string;
  url?: string;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const ALLOWED_UPSTREAMS = new Map([
  ['dadosabertos.camara.leg.br', { pathPrefix: '/api/v2/' }],
  ['legis.senado.leg.br', { pathPrefix: '/dadosabertos/' }],
]);
const MAX_UPSTREAM_BYTES = 2_000_000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT = 600;
const DEFAULT_ACCEPT = 'application/json';
const ACCEPT_ITEM = /^(application\/json|application\/xml|text\/xml)(;\s*q=(0(\.\d{1,3})?|1(\.0{1,3})?))?$/i;
const isRateLimited = createRateLimiter(RATE_WINDOW_MS);

const resolveContentType = (upstreamContentType: string | null) => {
  const [mime, ...params] = (upstreamContentType || '').split(';');
  const charset = params.map((param) => param.trim()).find((param) => /^charset=[\w-]+$/i.test(param));
  const suffix = charset ? `; ${charset}` : '';
  const type = mime.trim().toLowerCase();
  if (type === 'application/json') return `application/json${suffix}`;
  if (type === 'application/xml' || type === 'text/xml') return `application/xml${suffix}`;
  return null;
};

const resolveAccept = (header?: string | string[]) => {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || value.length > 200) return DEFAULT_ACCEPT;
  const items = value.split(',').map((item) => item.trim());
  return items.every((item) => ACCEPT_ITEM.test(item)) ? items.join(', ') : DEFAULT_ACCEPT;
};

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

const readLimitedBody = async (response: Response) => {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_UPSTREAM_BYTES) {
    throw new RequestError(413, 'Upstream response too large.');
  }

  if (!response.body) {
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_UPSTREAM_BYTES) {
      throw new RequestError(413, 'Upstream response too large.');
    }
    return Buffer.from(body);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_UPSTREAM_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new RequestError(413, 'Upstream response too large.');
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  if (isRateLimited(getClientBucket(req), RATE_LIMIT)) {
    return jsonResponse(res, 429, { error: 'Too many requests.' });
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

  const upstreamRule = ALLOWED_UPSTREAMS.get(target.hostname);
  if (target.protocol !== 'https:' || !upstreamRule || target.port !== '' || target.username || target.password) {
    return jsonResponse(res, 400, { error: 'Unsupported host.' });
  }

  if (!target.pathname.startsWith(upstreamRule.pathPrefix) || /%(2f|5c)/i.test(target.pathname)) {
    return jsonResponse(res, 400, { error: 'Unsupported path.' });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        Accept: resolveAccept(req.headers?.accept),
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return jsonResponse(res, 502, { error: 'Unexpected upstream response.' });
    }

    const contentType = resolveContentType(upstream.headers.get('content-type'));
    if (!contentType) {
      return jsonResponse(res, 502, { error: 'Unexpected upstream response.' });
    }

    const body = await readLimitedBody(upstream);

    res.status?.(upstream.status);
    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', upstream.ok ? 'public, s-maxage=300, stale-while-revalidate=3600' : 'no-store');
    res.end(body);
  } catch (error: any) {
    if (error instanceof RequestError) {
      return jsonResponse(res, error.statusCode, { error: error.message });
    }
    const aborted = error?.name === 'AbortError' || error?.name === 'TimeoutError';
    return jsonResponse(res, aborted ? 504 : 502, { error: aborted ? 'Upstream timeout.' : 'Upstream request failed.' });
  }
}
