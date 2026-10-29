import type { IncomingMessage, ServerResponse } from 'http';
import { waitUntil } from '@vercel/functions';
import { buildLegislativeBootstrap, withGeneratedEducationalArticles, type LegislativeBootstrap } from './lib/legislativeBootstrap.js';
import { isCronAuthorized } from './lib/auth.js';
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

const CACHE_KEY = 'legislative-bootstrap-v2';
const LEGACY_CACHE_KEYS = ['legislative-bootstrap-v1'];
const CACHE_TTL_MS = 1000 * 60 * 15;
const BACKGROUND_REFRESH_COOLDOWN_MS = 1000 * 60;

type RefreshResult = { data: LegislativeBootstrap; cache: { persisted: boolean; skipped?: boolean } };

let inflightRefresh: Promise<RefreshResult> | null = null;
let lastBackgroundRefreshAt = 0;

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

const isSenator = (politician: { role?: string }) => /^senador/i.test(politician.role || '');

export const mergeWithPreviousBootstrap = (next: LegislativeBootstrap, previous: LegislativeBootstrap): LegislativeBootstrap => {
  const keepSenate = !next.sources?.senadoSenadores?.ok && Boolean(previous.sources?.senadoSenadores?.ok);
  const keepFeed = !next.sources?.camaraFeed?.ok && Boolean(previous.sources?.camaraFeed?.ok);
  const keepParties = Boolean(next.sources?.camaraParties?.fallback) && Boolean(previous.sources?.camaraParties?.ok);
  if (!keepSenate && !keepFeed && !keepParties) return next;

  const merged: LegislativeBootstrap = { ...next, sources: { ...next.sources } };
  let warnings = [...(next.warnings || [])];

  if (keepSenate) {
    merged.politicians = [
      ...next.politicians.filter((politician) => !isSenator(politician)),
      ...previous.politicians.filter(isSenator),
    ];
    merged.sources.senadoSenadores = previous.sources.senadoSenadores;
    warnings = [...warnings.filter((warning) => warning !== 'senado_senadores_unavailable'), 'senado_from_previous_cache'];
  }

  if (keepFeed) {
    merged.feedItems = previous.feedItems;
    merged.articles = previous.articles;
    merged.sources.camaraFeed = previous.sources.camaraFeed;
    if (previous.sources.educationArticles) merged.sources.educationArticles = previous.sources.educationArticles;
    warnings = [...warnings.filter((warning) => warning !== 'camara_feed_unavailable' && warning !== 'education_articles_unavailable'), 'feed_from_previous_cache'];
  }

  if (keepParties) {
    merged.parties = previous.parties;
    merged.sources.camaraParties = previous.sources.camaraParties;
    warnings = [...warnings.filter((warning) => warning !== 'camara_parties_using_fallback'), 'parties_from_previous_cache'];
  }

  merged.warnings = warnings;
  merged.partial = warnings.some((warning) => !warning.endsWith('_from_previous_cache'));
  return merged;
};

const runRefresh = async (): Promise<RefreshResult> => {
  const built = withGeneratedEducationalArticles(await buildLegislativeBootstrap());
  if (!hasDeputies(built)) {
    return { data: built, cache: { persisted: false, skipped: true } };
  }
  const previous = await readServerCache<LegislativeBootstrap>(CACHE_KEY, 0);
  const data = previous && hasDeputies(previous) ? mergeWithPreviousBootstrap(built, previous) : built;
  const cache = await writeServerCache<LegislativeBootstrap>(CACHE_KEY, data);
  return { data, cache };
};

export const refreshLegislativeBootstrap = (): Promise<RefreshResult> => {
  if (!inflightRefresh) {
    inflightRefresh = runRefresh().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
};

const refreshInBackground = () => {
  const now = Date.now();
  if (inflightRefresh || now - lastBackgroundRefreshAt < BACKGROUND_REFRESH_COOLDOWN_MS) return;
  lastBackgroundRefreshAt = now;
  waitUntil(refreshLegislativeBootstrap().catch(() => undefined));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const shouldRefresh = getRefreshFlag(req) && isCronAuthorized(req.headers?.authorization);

    if (!shouldRefresh) {
      const fresh = await readServerCache<LegislativeBootstrap>(CACHE_KEY, CACHE_TTL_MS);
      if (fresh && hasDeputies(fresh)) {
        return jsonResponse(res, 200, createBootstrapResponse('cache', withGeneratedEducationalArticles(fresh)));
      }

      const expired = await readServerCache<LegislativeBootstrap>(CACHE_KEY, 0) || await readLegacyBootstrapCache();
      if (expired && hasDeputies(expired)) {
        refreshInBackground();
        return jsonResponse(
          res,
          200,
          createBootstrapResponse('stale-cache', withGeneratedEducationalArticles(expired)),
          'public, s-maxage=60, stale-while-revalidate=300'
        );
      }
    }

    const { data, cache } = await refreshLegislativeBootstrap();
    if (!hasDeputies(data)) {
      const stale = await readServerCache<LegislativeBootstrap>(CACHE_KEY, 0)
        || await readLegacyBootstrapCache();
      if (stale && hasDeputies(stale)) {
        return jsonResponse(res, 200, createBootstrapResponse('stale-cache', withGeneratedEducationalArticles(stale)), 'no-store');
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
    console.error('[api/bootstrap] request failed', { name: error?.name, message: String(error?.message || '').slice(0, 200) });
    return jsonResponse(res, 502, { ok: false, error: 'Bootstrap refresh failed.' });
  }
}

const readLegacyBootstrapCache = async () => {
  for (const key of LEGACY_CACHE_KEYS) {
    const cached = await readServerCache<LegislativeBootstrap>(key, 0);
    if (cached && hasDeputies(cached)) return cached;
  }
  return null;
};
