import type { IncomingMessage, ServerResponse } from 'http';
import { buildLegislativeBootstrap, type LegislativeBootstrap } from './_lib/legislativeBootstrap';
import { readServerCache, writeServerCache } from './_lib/serverCache';

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  method?: string;
  url?: string;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

const CACHE_KEY = 'legislative-bootstrap-v1';
const CACHE_TTL_MS = 1000 * 60 * 15;

const jsonResponse = (res: VercelResponse, status: number, data: unknown) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=300, stale-while-revalidate=900' : 'no-store');
  res.end(JSON.stringify(data));
};

const getRefreshFlag = (req: VercelRequest) => {
  const fromQuery = Array.isArray(req.query?.refresh) ? req.query?.refresh[0] : req.query?.refresh;
  if (fromQuery) return fromQuery === '1' || fromQuery === 'true';
  const requestUrl = new URL(req.url || '', 'http://localhost');
  return requestUrl.searchParams.get('refresh') === '1';
};

export const refreshLegislativeBootstrap = async () => {
  const data = await buildLegislativeBootstrap();
  const cache = await writeServerCache<LegislativeBootstrap>(CACHE_KEY, data);
  return { data, cache };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const shouldRefresh = getRefreshFlag(req);
    const cached = shouldRefresh ? null : await readServerCache<LegislativeBootstrap>(CACHE_KEY, CACHE_TTL_MS);
    if (cached) {
      return jsonResponse(res, 200, { ok: true, source: 'cache', data: cached });
    }

    const { data, cache } = await refreshLegislativeBootstrap();
    return jsonResponse(res, 200, { ok: true, source: cache.persisted ? 'refresh:blob' : 'refresh:memory', data });
  } catch (error: any) {
    return jsonResponse(res, 502, { ok: false, error: error?.message || 'Bootstrap refresh failed.' });
  }
}
