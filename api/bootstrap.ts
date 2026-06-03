import type { IncomingMessage, ServerResponse } from 'http';
import { buildLegislativeBootstrap, type LegislativeBootstrap } from './lib/legislativeBootstrap.js';
import { readServerCache, writeServerCache } from './lib/serverCache.js';

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

const jsonResponse = (res: VercelResponse, status: number, data: unknown, cacheControl?: string) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl || (status === 200 ? 'public, s-maxage=300, stale-while-revalidate=900' : 'no-store'));
  res.end(JSON.stringify(data));
};

const getRefreshFlag = (req: VercelRequest) => {
  const fromQuery = Array.isArray(req.query?.refresh) ? req.query?.refresh[0] : req.query?.refresh;
  if (fromQuery) return fromQuery === '1' || fromQuery === 'true';
  const requestUrl = new URL(req.url || '', 'http://localhost');
  return requestUrl.searchParams.get('refresh') === '1';
};

const createBootstrapResponse = (
  source: string,
  data: LegislativeBootstrap,
) => ({
  ok: true,
  source,
  partial: Boolean(data.partial),
  warnings: data.warnings || [],
  sources: data.sources || {},
  data,
});

const hasDeputies = (data?: LegislativeBootstrap | null) =>
  Boolean(data?.sources?.camaraDeputados?.ok && data.politicians.some((politician) => politician.hasApiIntegration !== false));

export const refreshLegislativeBootstrap = async () => {
  const data = await buildLegislativeBootstrap();
  if (!hasDeputies(data)) {
    return { data, cache: { persisted: false, skipped: true } };
  }
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
    if (cached && hasDeputies(cached)) {
      return jsonResponse(res, 200, createBootstrapResponse('cache', cached));
    }

    const { data, cache } = await refreshLegislativeBootstrap();
    if (!hasDeputies(data)) {
      const stale = await readServerCache<LegislativeBootstrap>(CACHE_KEY, 0);
      if (stale && hasDeputies(stale)) {
        return jsonResponse(res, 200, createBootstrapResponse('stale-cache', stale), 'no-store');
      }
      return jsonResponse(res, 503, {
        ok: false,
        error: 'Bootstrap did not return deputies.',
        partial: true,
        warnings: data.warnings,
        sources: data.sources,
      });
    }

    return jsonResponse(
      res,
      200,
      createBootstrapResponse(cache.persisted ? 'refresh:blob' : 'refresh:memory', data),
      shouldRefresh ? 'no-store' : undefined
    );
  } catch (error: any) {
    return jsonResponse(res, 502, { ok: false, error: error?.message || 'Bootstrap refresh failed.' });
  }
}
