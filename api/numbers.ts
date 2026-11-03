import type { IncomingMessage, ServerResponse } from 'http';
import { createRateLimiter, getClientBucket } from './lib/rateLimit.js';
import { readCongressNumbersCache } from './lib/congressNumbers.js';

type VercelRequest = IncomingMessage & { method?: string };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

const WINDOW_MS = 5 * 60 * 1000;
const READ_LIMIT = 60;
const READ_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const isOverLimit = createRateLimiter(WINDOW_MS);

const jsonResponse = (res: VercelResponse, status: number, data: unknown, cacheControl = 'no-store') => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl);
  res.end(JSON.stringify(data));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  if (isOverLimit(`${getClientBucket(req)}:numbers`, READ_LIMIT)) {
    res.setHeader('Retry-After', String(WINDOW_MS / 1000));
    return jsonResponse(res, 429, { error: 'Too many requests.' });
  }

  try {
    const numbers = await readCongressNumbersCache();
    if (!numbers) return jsonResponse(res, 503, { error: 'Dados ainda não disponíveis.' });
    return jsonResponse(res, 200, numbers, READ_CACHE_CONTROL);
  } catch {
    return jsonResponse(res, 503, { error: 'Dados ainda não disponíveis.' });
  }
}
