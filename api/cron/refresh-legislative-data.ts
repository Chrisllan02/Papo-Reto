import type { IncomingMessage, ServerResponse } from 'http';
import { isCronAuthorized } from '../lib/auth.js';
import { refreshLegislativeBootstrap } from '../bootstrap.js';

type VercelRequest = IncomingMessage & { method?: string; headers: IncomingMessage['headers'] };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

const jsonResponse = (res: VercelResponse, status: number, data: unknown) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  if (!isCronAuthorized(req.headers.authorization)) {
    return jsonResponse(res, 401, { error: 'Unauthorized.' });
  }

  try {
    const startedAt = Date.now();
    const { data, cache } = await refreshLegislativeBootstrap();
    if (cache.skipped) {
      return jsonResponse(res, 502, { ok: false, error: 'Refresh failed.' });
    }

    return jsonResponse(res, 200, {
      ok: true,
      durationMs: Date.now() - startedAt,
      source: cache.persisted ? 'refresh:blob' : 'refresh:memory',
      partial: data.partial,
      warnings: data.warnings,
      counts: {
        politicians: data.politicians.length,
        feedItems: data.feedItems.length,
        parties: data.parties.length,
      },
      generatedAt: data.generatedAt,
    });
  } catch {
    return jsonResponse(res, 502, { ok: false, error: 'Refresh failed.' });
  }
}
