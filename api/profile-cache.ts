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

const isTrustedBrowserOrigin = (req: VercelRequest) => {
  const host = String(req.headers?.host || '');
  if (!host) return false;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const matches = (value: string) => {
    try {
      const url = new URL(value);
      return url.host === host || allowedOrigins.includes(url.origin);
    } catch {
      return false;
    }
  };

  const origin = String(req.headers?.origin || '');
  if (origin) return matches(origin);
  const referer = String(req.headers?.referer || '');
  if (referer) return matches(referer);
  return false;
};

const isRateLimited = (bucket: string, method: string) => {
  const key = `${bucket}:${method}`;
  const now = Date.now();

  if (rateLimitStore.size > 1000) {
    for (const [storeKey, entry] of rateLimitStore) {
      if (entry.resetAt <= now) rateLimitStore.delete(storeKey);
    }
  }

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

const fetchOfficialJson = async (url: string, timeoutMs = 10_000): Promise<any | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Enriquecimento detalhado feito no servidor: é o que torna o cache compartilhado
// útil de fato — sem ele, cada visitante refaz as chamadas pesadas no navegador.
async function buildDetailedPoliticianData(id: string) {
  const today = new Date().toISOString().split('T')[0];
  const [expensesData, frentesData, ocupacoesData, discursosData, agendaData] = await Promise.all([
    fetchOfficialJson(`${BASE_URL_CAMARA}/deputados/${id}/despesas?ordem=DESC&ordenarPor=mes&itens=100`),
    fetchOfficialJson(`${BASE_URL_CAMARA}/deputados/${id}/frentes`),
    fetchOfficialJson(`${BASE_URL_CAMARA}/deputados/${id}/ocupacoes`),
    fetchOfficialJson(`${BASE_URL_CAMARA}/deputados/${id}/discursos?ordem=DESC&ordenarPor=dataHoraInicio&itens=20`),
    fetchOfficialJson(`${BASE_URL_CAMARA}/eventos?ordem=ASC&ordenarPor=dataHoraInicio&dataInicio=${today}&deputadoId=${id}&itens=5`),
  ]);

  const typeMap: Record<string, number> = {};
  let totalSpending = 0;
  const detailedExpenses = (expensesData?.dados || []).map((e: any, idx: number) => {
    const value = Number(e.valorLiquido ?? e.valorDocumento ?? 0);
    if (Number.isFinite(value)) {
      totalSpending += value;
      const type = e.tipoDespesa || 'Outros';
      typeMap[type] = (typeMap[type] || 0) + value;
    }
    const month = e.mes ? String(e.mes).padStart(2, '0') : '';
    const year = e.ano ? String(e.ano) : '';
    return {
      id: idx,
      date: e.dataDocumento || (month && year ? `${month}/${year}` : undefined),
      provider: e.nomeFornecedor,
      cnpjCpf: e.cnpjCpfFornecedor,
      value,
      documentValue: Number(e.valorDocumento ?? 0),
      disallowedValue: Number(e.valorGlosa ?? 0),
      type: e.tipoDespesa,
      documentType: e.tipoDocumento,
      documentNumber: e.numDocumento,
      urlDocumento: e.urlDocumento,
    };
  }).filter((item: any) => Number.isFinite(item.value));

  const expensesBreakdown = Object.entries(typeMap)
    .map(([type, value]) => ({ type, value, percent: totalSpending > 0 ? (value / totalSpending) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const fronts = (frentesData?.dados || []).map((f: any) => ({
    id: f.id,
    title: f.titulo,
    externalLink: f.uri,
  })).slice(0, 50);

  const occupations = (ocupacoesData?.dados || []).map((o: any) => ({
    title: o.titulo,
    entity: o.entidade,
    state: o.entidadeUF,
    country: o.entidadePais,
    startYear: o.anoInicio,
    endYear: o.anoFim,
  })).filter((o: any) => o.title || o.entity).slice(0, 50);

  const speeches = (discursosData?.dados || []).map((s: any) => ({
    date: s.dataHoraInicio,
    summary: s.sumario || (s.transcricao ? `${String(s.transcricao).substring(0, 150)}...` : 'Discurso em Plenário'),
    type: s.tipoDiscurso,
    phase: s.faseEvento ? s.faseEvento.descricao : 'Plenário',
    keywords: s.keywords ? String(s.keywords).split(',').map((k: string) => k.trim()) : [],
    urlAudio: s.urlAudio,
    urlVideo: s.urlVideo,
    externalLink: s.urlTexto,
  })).slice(0, 25);

  const agenda = (agendaData?.dados || []).map((e: any) => ({
    id: e.id,
    startTime: e.dataHoraInicio,
    endTime: e.dataHoraFim,
    title: e.descricaoTipo,
    description: e.descricao || e.situacao,
    location: e.localCamara?.nome || 'Câmara dos Deputados',
    status: e.situacao,
    type: e.descricaoTipo || 'Sessão',
    sourceUrl: e.urlRegistro,
    agendaDocumentUrl: e.urlDocumentoPauta,
  })).slice(0, 10);

  const hasDetails = detailedExpenses.length > 0 || fronts.length > 0 || occupations.length > 0
    || speeches.length > 0 || agenda.length > 0;

  return {
    hasDetails,
    detailedExpenses: detailedExpenses.slice(0, 200),
    expensesBreakdown,
    fronts,
    occupations,
    speeches,
    agenda,
    // Shape completo: o cliente substitui o objeto stats inteiro no merge.
    stats: {
      attendancePct: 0,
      totalSessions: 0,
      presentSessions: 0,
      absentSessions: 0,
      plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
      commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
      projects: 0,
      spending: totalSpending,
    },
  };
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

  const details = await buildDetailedPoliticianData(id).catch(() => null);

  const sex = normalizeSex(data.sexo);
  return normalizePayload({
    ...(details?.hasDetails ? {
      detailedExpenses: details.detailedExpenses,
      expensesBreakdown: details.expensesBreakdown,
      fronts: details.fronts,
      occupations: details.occupations,
      speeches: details.speeches,
      agenda: details.agenda,
      stats: details.stats,
    } : {}),
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
    if (isProductionRuntime() && !isTrustedBrowserOrigin(req)) {
      return jsonResponse(res, 403, { error: 'Forbidden.' });
    }

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
