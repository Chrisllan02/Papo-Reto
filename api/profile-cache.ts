import type { IncomingMessage, ServerResponse } from 'http';
import { head, put } from '@vercel/blob';
import { hasBearerToken } from './lib/auth.js';
import { createRateLimiter, getClientBucket } from './lib/rateLimit.js';
import { BOOTSTRAP_CACHE_KEY, readServerCache } from './lib/serverCache.js';
import type { LegislativeBootstrap } from './lib/legislativeBootstrap.js';
import { formatPersonName } from '../domain/legislative/text.js';

type VercelRequest = IncomingMessage & { query?: Record<string, string | string[]>; body?: any; method?: string; };

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  json?: (data: any) => void;
  setHeader: (name: string, value: string) => void;
};

const getQueryValue = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
const isSafeNumericId = (value?: string | null) => Boolean(value && /^[1-9]\d{0,7}$/.test(value));
const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';

const WINDOW_MS = 5 * 60 * 1000;
const READ_LIMIT = 60;
const WRITE_LIMIT = 12;
const MAX_BODY_BYTES = 300_000;
const REFRESH_MIN_AGE_MS = 24 * 60 * 60 * 1000;
const READ_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';
const NOT_FOUND_TTL_MS = 60 * 60 * 1000;
const MEMORY_CACHE = new Map<string, string>();
const NOT_FOUND_UNTIL = new Map<string, number>();
const isOverLimit = createRateLimiter(WINDOW_MS);

class RequestError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const isRateLimited = (bucket: string, method: string) =>
  isOverLimit(`${bucket}:${method}`, method === 'PUT' || method === 'POST' ? WRITE_LIMIT : READ_LIMIT);

const jsonResponse = (res: VercelResponse, status: number, data: any, cacheControl = 'no-store') => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', cacheControl);
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

  return hasBearerToken(req.headers.authorization, secret)
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

const normalizeSex = (value?: string | null): 'F' | 'M' | undefined => {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  if (cleaned.startsWith('F')) return 'F';
  if (cleaned.startsWith('M')) return 'M';
  return undefined;
};

async function readFromBlob(pathname: string) {
  try {
    const blob = await head(pathname);
    const response = await fetch(blob.url, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function readExisting(pathname: string) {
  const blobData = await readFromBlob(pathname);
  if (blobData) return blobData;
  const memory = MEMORY_CACHE.get(pathname);
  if (!memory) return null;
  try {
    return JSON.parse(memory);
  } catch {
    return null;
  }
}

const isFresh = (data: any) => {
  const updatedAt = Date.parse(data?.updatedAt);
  return Number.isFinite(updatedAt) && Date.now() - updatedAt < REFRESH_MIN_AGE_MS;
};

async function writeToBlob(pathname: string, payload: any) {
  const blob = await put(pathname, JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return blob;
}

const isKnownDeputy = async (id: string) => {
  const bootstrap = await readServerCache<LegislativeBootstrap>(BOOTSTRAP_CACHE_KEY, 0);
  if (!bootstrap?.politicians?.length) return null;
  return bootstrap.politicians.some((politician) => String(politician.id) === id && !/^senador/i.test(politician.role || ''));
};

async function buildOfficialPoliticianCache(id: string) {
  const response = await fetch(`${BASE_URL_CAMARA}/deputados/${id}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
    },
    signal: AbortSignal.timeout(10_000),
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
    name: formatPersonName(data.ultimoStatus?.nomeEleitoral || data.nomeCivil),
    party: data.ultimoStatus?.siglaPartido,
    state: data.ultimoStatus?.siglaUf,
    photo: data.ultimoStatus?.urlFoto,
    role: sex === 'F' ? 'Deputada Federal' : sex === 'M' ? 'Deputado Federal' : 'Deputado(a) Federal',
    sex,
    civilName: formatPersonName(data.nomeCivil),
    birthDate: data.dataNascimento,
    birthCity: data.municipioNascimento,
    birthState: data.ufNascimento,
    education: data.escolaridade,
    email: data.ultimoStatus?.gabinete?.email,
    website: data.urlWebsite,
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
    const existing = await readExisting(pathname);
    if (existing) {
      return jsonResponse(res, 200, existing, READ_CACHE_CONTROL);
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
      return jsonResponse(res, error instanceof RequestError ? error.statusCode : 400, { error: error instanceof RequestError ? error.message : 'Invalid request.' });
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
    const existing = await readExisting(pathname);
    if (existing && isFresh(existing)) {
      return jsonResponse(res, 200, existing);
    }

    const known = await isKnownDeputy(id as string);
    if (known === null) {
      return jsonResponse(res, 503, { error: 'Profile refresh unavailable.' });
    }
    if (!known || (NOT_FOUND_UNTIL.get(pathname) || 0) > Date.now()) {
      return jsonResponse(res, 404, { error: 'Politician not found.' });
    }

    let payload: any;
    try {
      payload = await buildOfficialPoliticianCache(id as string);
    } catch (error: any) {
      if (error instanceof RequestError) {
        if (error.statusCode === 404) NOT_FOUND_UNTIL.set(pathname, Date.now() + NOT_FOUND_TTL_MS);
        return jsonResponse(res, error.statusCode, { error: error.message });
      }
      return jsonResponse(res, 502, { error: 'Profile refresh failed.' });
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
