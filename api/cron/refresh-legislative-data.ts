import type { IncomingMessage, ServerResponse } from 'http';

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
  if (!secret) {
    return process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1';
  }
  return req.headers.authorization === `Bearer ${secret}`;
};

const getBaseUrl = (req: VercelRequest) => {
  const host = req.headers.host || 'papo-reto-beige.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${Array.isArray(proto) ? proto[0] : proto}://${host}`;
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
    const response = await fetch(`${getBaseUrl(req)}/api/bootstrap?refresh=1`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      return jsonResponse(res, 502, { ok: false, error: payload?.error || 'Refresh failed.' });
    }

    return jsonResponse(res, 200, {
      ok: true,
      durationMs: Date.now() - startedAt,
      source: payload.source,
      counts: {
        politicians: payload.data?.politicians?.length || 0,
        feedItems: payload.data?.feedItems?.length || 0,
        parties: payload.data?.parties?.length || 0,
      },
      generatedAt: payload.data?.generatedAt,
    });
  } catch (error: any) {
    return jsonResponse(res, 502, { ok: false, error: error?.message || 'Refresh failed.' });
  }
}
