import type { IncomingMessage, ServerResponse } from 'http';
import { list, put } from '@vercel/blob';

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
const MEMORY_CACHE = new Map<string, string>();

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

const normalizePayload = (body: any) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  return {
    ...body,
    updatedAt: new Date().toISOString()
  };
};

const readBody = async (req: VercelRequest) => {
  if (req.body) return req.body;
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const pathForId = (id: string) => `politicians/${id}.json`;

async function readFromBlob(pathname: string) {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 10 });
    const blob = blobs.find(item => item.pathname === pathname);
    if (!blob) return null;
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function writeToBlob(pathname: string, payload: any) {
  const blob = await put(pathname, JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false
  });
  return blob;
}

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

  const pathname = pathForId(id as string);

  if (method === 'GET') {
    const blobData = await readFromBlob(pathname);
    if (blobData) {
      return jsonResponse(res, 200, blobData);
    }

    const memory = MEMORY_CACHE.get(pathname);
    if (memory) {
      try {
        return jsonResponse(res, 200, JSON.parse(memory));
      } catch {
        // fall through
      }
    }

    return jsonResponse(res, 404, { ok: false, found: false });
  }

  if (method === 'PUT') {
    let body = await readBody(req);
    const payload = normalizePayload(body);
    if (!payload) {
      return jsonResponse(res, 400, { error: 'Invalid payload.' });
    }

    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > 250_000) {
      return jsonResponse(res, 413, { error: 'Payload too large.' });
    }

    try {
      await writeToBlob(pathname, payload);
      MEMORY_CACHE.set(pathname, JSON.stringify(payload));
      return jsonResponse(res, 200, { ok: true });
    } catch {
      MEMORY_CACHE.set(pathname, JSON.stringify(payload));
      return jsonResponse(res, 200, { ok: true, fallback: 'memory' });
    }
  }

  return jsonResponse(res, 405, { error: 'Method not allowed.' });
}
