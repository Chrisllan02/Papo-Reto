import type { IncomingMessage, ServerResponse } from 'http';

type VercelRequest = IncomingMessage & { query?: Record<string, string | string[]>; body?: any; method?: string; };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: any) => void;
  setHeader: (name: string, value: string) => void;
};

const getQueryValue = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;

const isSafeNumericId = (value?: string | null) => Boolean(value && /^\d+$/.test(value));

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const READ_LIMIT = 60;
const WRITE_LIMIT = 12;

const getClientBucket = (req: VercelRequest) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers?.['x-real-ip'] || 'unknown';
  return String(ip).split(',')[0].trim() || 'unknown';
};

const isRateLimited = (bucket: string, method: string) => {
  const key = `${bucket}:${method}`;
  const now = Date.now();
  const limit = method === 'PUT' ? WRITE_LIMIT : READ_LIMIT;
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (current.count >= limit) {
    return true;
  }

  current.count += 1;
  return false;
};

const jsonResponse = (res: VercelResponse, status: number, data: any) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  const type = getQueryValue(req.query?.type);
  const id = getQueryValue(req.query?.id);
  const bucket = getClientBucket(req);

  if (isRateLimited(bucket, method)) {
    return jsonResponse(res, 429, { error: 'Too many requests.' });
  }

  if (type !== 'politician' || !isSafeNumericId(id)) {
    return jsonResponse(res, 400, { error: 'Invalid parameters.' });
  }

  const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'Chrisllan02';
  const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || 'Papo-Reto';
  const token = process.env.GITHUB_TOKEN;

  const path = `data/politicians/${id}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (method === 'GET') {
    try {
      const response = await fetch(apiUrl, { headers });
      if (response.status === 404) {
        return jsonResponse(res, 404, { ok: false, found: false });
      }
      if (!response.ok) {
        return jsonResponse(res, response.status, { error: 'GitHub read error.' });
      }

      const payload = await response.json();
      const content = payload?.content ? Buffer.from(payload.content, 'base64').toString('utf8') : '{}';
      const data = JSON.parse(content || '{}');

      return jsonResponse(res, 200, data);
    } catch (error) {
      return jsonResponse(res, 500, { error: 'Unexpected server error.' });
    }
  }

  if (method === 'PUT') {
    if (!token) {
      return jsonResponse(res, 500, { error: 'Missing GitHub token.' });
    }

    let body = req.body;
    if (!body) {
      try {
        const chunks: Uint8Array[] = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(res, 400, { error: 'Invalid payload.' });
    }

    if (Buffer.byteLength(JSON.stringify(body), 'utf8') > 250_000) {
      return jsonResponse(res, 413, { error: 'Payload too large.' });
    }

    const payload = {
      ...body,
      updatedAt: new Date().toISOString()
    };

    try {
      let sha: string | undefined;
      const existing = await fetch(apiUrl, { headers });
      if (existing.ok) {
        const existingJson = await existing.json();
        sha = existingJson?.sha;
      }

      const content = Buffer.from(JSON.stringify(payload, null, 2), 'utf8').toString('base64');
      const updateRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `cache: update politician ${id}`,
          content,
          sha
        })
      });

      if (!updateRes.ok) {
        return jsonResponse(res, updateRes.status, { error: 'GitHub write error.' });
      }

      return jsonResponse(res, 200, { ok: true });
    } catch (error) {
      return jsonResponse(res, 500, { error: 'Unexpected server error.' });
    }
  }

  return jsonResponse(res, 405, { error: 'Method not allowed.' });
}
