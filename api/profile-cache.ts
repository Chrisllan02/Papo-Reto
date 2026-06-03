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
const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const READ_LIMIT = 60;
const WRITE_LIMIT = 12;
const MAX_BODY_BYTES = 300_000;
const MEMORY_CACHE = new Map<string, string>();

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getClientBucket = (req: VercelRequest) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || req.headers?.['x-real-ip'] || 'unknown';
  return String(ip).split(',')[0].trim() || 'unknown';
};

const isRateLimited = (bucket: string, method: string) => {
  const key = `${bucket}:${method}`;
  const now = Date.now();
  const limit = method === 'PUT' || method === 'POST' ? WRITE_LIMIT : READ_LIMIT;
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

const isProductionRuntime = () => process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const getWriteSecret = () => process.env.PROFILE_CACHE_WRITE_SECRET || process.env.CRON_SECRET || '';

const authorizeWrite = (req: VercelRequest) => {
  const secret = getWriteSecret();
  if (!secret) {
    return isProductionRuntime()
      ? { ok: false, status: 503, error: 'Profile cache writes are not configured.' }
      : { ok: true };
  }

  return req.headers.authorization === `Bearer ${secret}`
    ? { ok: true }
    : { ok: false, status: 401, error: 'Unauthorized.' };
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

  const contentLength = Number(req.headers?.['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Payload too large.');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new RequestError(413, 'Payload too large.');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new RequestError(400, 'Invalid JSON body.');
  }
};

const pathForId = (id: string) => `politicians/${id}.json`;

const formatText = (text?: string | null) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const normalizeSex = (value?: string | null): 'F' | 'M' | undefined => {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  if (cleaned.startsWith('F')) return 'F';
  if (cleaned.startsWith('M')) return 'M';
  return undefined;
};

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

async function buildOfficialPoliticianCache(id: string) {
  const response = await fetch(`${BASE_URL_CAMARA}/deputados/${id}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
    },
  });

  if (response.status === 404) {
    throw new RequestError(404, 'Politician not found.');
  }
  if (!response.ok) {
    throw new RequestError(502, 'Official profile request failed.');
  }

  const payload = await response.json();
  const data = payload?.dados;
  if (!data || typeof data !== 'object') {
    throw new RequestError(502, 'Invalid official profile response.');
  }

  const sex = normalizeSex(data.sexo);
  return normalizePayload({
    id: Number(id),
    name: formatText(data.ultimoStatus?.nomeEleitoral || data.nomeCivil),
    party: data.ultimoStatus?.siglaPartido,
    state: data.ultimoStatus?.siglaUf,
    photo: data.ultimoStatus?.urlFoto,
    role: sex === 'F' ? 'Deputada Federal' : 'Deputado Federal',
    sex,
    civilName: formatText(data.nomeCivil),
    birthDate: data.dataNascimento,
    birthCity: data.municipioNascimento,
    birthState: data.ufNascimento,
    email: data.ultimoStatus?.gabinete?.email,
    cabinet: {
      room: data.ultimoStatus?.gabinete?.sala,
      floor: data.ultimoStatus?.gabinete?.andar,
      building: data.ultimoStatus?.gabinete?.predio,
      phone: data.ultimoStatus?.gabinete?.telefone,
      email: data.ultimoStatus?.gabinete?.email,
    },
    socials: data.redeSocial || [],
    situation: data.ultimoStatus?.situacao,
    condition: data.ultimoStatus?.condicaoEleitoral,
    statusDescription: data.ultimoStatus?.descricaoStatus,
  });
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
    const authorization = authorizeWrite(req);
    if (!authorization.ok) {
      return jsonResponse(res, authorization.status || 401, { error: authorization.error || 'Unauthorized.' });
    }

    let body: any;
    try {
      body = await readBody(req);
    } catch (error: any) {
      return jsonResponse(res, error?.statusCode || 400, { error: error?.message || 'Invalid request.' });
    }
    const payload = normalizePayload(body);
    if (!payload) {
      return jsonResponse(res, 400, { error: 'Invalid payload.' });
    }

    if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_BODY_BYTES) {
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

  if (method === 'POST') {
    let payload: any;
    try {
      payload = await buildOfficialPoliticianCache(id as string);
    } catch (error: any) {
      return jsonResponse(res, error?.statusCode || 502, { error: error?.message || 'Profile refresh failed.' });
    }

    try {
      await writeToBlob(pathname, payload);
      MEMORY_CACHE.set(pathname, JSON.stringify(payload));
      return jsonResponse(res, 200, { ok: true, refreshed: true });
    } catch {
      MEMORY_CACHE.set(pathname, JSON.stringify(payload));
      return jsonResponse(res, 200, { ok: true, refreshed: true, fallback: 'memory' });
    }
  }

  return jsonResponse(res, 405, { error: 'Method not allowed.' });
}
