import type { IncomingMessage, ServerResponse } from 'http';
import { refreshLegislativeBootstrap } from '../bootstrap.ts';

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

const isAuthorized = (req: VercelRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.authorization === `Bearer ${secret}`;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  if (!isAuthorized(req)) {
    return jsonResponse(res, 401, { error: 'Unauthorized.' });
  }

  try {
    const startedAt = Date.now();
    const { data, cache } = await refreshLegislativeBootstrap();
    return jsonResponse(res, 200, {
      ok: true,
      persisted: cache.persisted,
      durationMs: Date.now() - startedAt,
      counts: {
        politicians: data.politicians.length,
        feedItems: data.feedItems.length,
        parties: data.parties.length,
      },
      generatedAt: data.generatedAt,
    });
  } catch (error: any) {
    return jsonResponse(res, 502, { ok: false, error: error?.message || 'Refresh failed.' });
  }
}
