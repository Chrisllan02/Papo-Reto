import type { IncomingMessage, ServerResponse } from 'http';
import { list, put } from '@vercel/blob';

type VercelRequest = IncomingMessage & {
  query?: Record<string, string | string[]>;
  method?: string;
  url?: string;
};

type VercelResponse = ServerResponse & {
  status?: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
};

type FeedCategory = 'education' | 'health' | 'economy' | 'security' | 'work' | 'environment' | 'justice' | 'activity';
type Ideology = 'Esquerda' | 'Centro' | 'Direita';

type LegislativeBootstrap = {
  politicians: any[];
  feedItems: any[];
  parties: any[];
  articles: any[];
  generatedAt: string;
  partial: boolean;
  warnings: string[];
  sources: Record<string, { ok: boolean; count: number; fallback?: boolean }>;
};

type CacheEnvelope<T> = {
  data: T;
  timestamp: number;
};

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
const UPSTREAM_TIMEOUT_MS = 6000;
const CACHE_KEY = 'legislative-bootstrap-v1';
const CACHE_TTL_MS = 1000 * 60 * 15;
const memoryCache = new Map<string, string>();

const PARTY_FALLBACK: Record<string, { nome: string; ideology: Ideology }> = {
  PT: { nome: 'Partido dos Trabalhadores', ideology: 'Esquerda' },
  PL: { nome: 'Partido Liberal', ideology: 'Direita' },
  PP: { nome: 'Progressistas', ideology: 'Centro' },
  MDB: { nome: 'Movimento Democrático Brasileiro', ideology: 'Centro' },
  PSD: { nome: 'Partido Social Democrático', ideology: 'Centro' },
  REPUBLICANOS: { nome: 'Republicanos', ideology: 'Direita' },
  UNIÃO: { nome: 'União Brasil', ideology: 'Direita' },
  PSB: { nome: 'Partido Socialista Brasileiro', ideology: 'Esquerda' },
  PDT: { nome: 'Partido Democrático Trabalhista', ideology: 'Esquerda' },
  PSOL: { nome: 'Partido Socialismo e Liberdade', ideology: 'Esquerda' },
  NOVO: { nome: 'Partido Novo', ideology: 'Direita' },
  PSDB: { nome: 'Partido da Social Democracia Brasileira', ideology: 'Centro' },
};

const jsonResponse = (res: VercelResponse, status: number, data: unknown) => {
  res.status?.(status);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=300, stale-while-revalidate=900' : 'no-store');
  res.end(JSON.stringify(data));
};

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const detectCategory = (text: string): FeedCategory => {
  const t = normalize(text || '');
  if (t.includes('educacao') || t.includes('escola') || t.includes('ensino') || t.includes('fundeb')) return 'education';
  if (t.includes('saude') || t.includes('sus') || t.includes('medico') || t.includes('hospital') || t.includes('vacina')) return 'health';
  if (t.includes('economia') || t.includes('tribut') || t.includes('imposto') || t.includes('dinheiro') || t.includes('orcamento') || t.includes('fiscal')) return 'economy';
  if (t.includes('seguranca') || t.includes('policia') || t.includes('crime') || t.includes('pena') || t.includes('armas')) return 'security';
  if (t.includes('trabalho') || t.includes('emprego') || t.includes('salario') || t.includes('clt')) return 'work';
  if (t.includes('ambiente') || t.includes('floresta') || t.includes('clima') || t.includes('agua')) return 'environment';
  if (t.includes('justica') || t.includes('lei') || t.includes('direito') || t.includes('codigo') || t.includes('constituicao')) return 'justice';
  return 'activity';
};

const formatText = (text: string) => {
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

const getXmlTag = (source: string, tag: string) => {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchText = async (url: string): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/xml, application/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchDeputados = async () => {
  const data = await fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/deputados?ordem=ASC&ordenarPor=nome`);
  return (data?.dados || []).map((d) => {
    const sex = normalizeSex(d.sexo);
    return {
      id: d.id,
      name: formatText(d.nome),
      party: d.siglaPartido,
      state: d.siglaUf,
      photo: d.urlFoto,
      role: sex === 'F' ? 'Deputada Federal' : 'Deputado Federal',
      sex,
      email: d.email,
      stats: emptyStats(),
      mandate: { start: '2023-02-01', end: '2027-01-31' },
      hasApiIntegration: true,
      votes: {},
    };
  });
};

const fetchSenadores = async () => {
  const xml = await fetchText(SENADO_URL);
  if (!xml) return [];

  const blocks = xml.match(/<Parlamentar>[\s\S]*?<\/Parlamentar>/g) || [];
  return blocks.map((block) => {
    const id = Number(getXmlTag(block, 'CodigoParlamentar') || getXmlTag(block, 'IdParlamentar')) || Math.floor(Math.random() * 1_000_000);
    const name = getXmlTag(block, 'NomeParlamentar') || getXmlTag(block, 'NomeCompletoParlamentar');
    const party = getXmlTag(block, 'SiglaPartidoParlamentar');
    const state = getXmlTag(block, 'SiglaUfParlamentar');
    const sex = normalizeSex(getXmlTag(block, 'SexoParlamentar'));

    return {
      id,
      name: formatText(name),
      party,
      partyShort: party,
      state,
      photo: getXmlTag(block, 'UrlFotoParlamentar'),
      role: sex === 'F' ? 'Senadora' : 'Senador',
      sex,
      matchScore: 0,
      bio: '',
      stats: emptyStats(),
      mandate: { start: '2023-02-01', end: '2031-01-31' },
      hasApiIntegration: false,
      votes: {},
    };
  }).filter((p) => p.name && p.party && p.state);
};

const emptyStats = () => ({
  attendancePct: 0,
  totalSessions: 0,
  presentSessions: 0,
  absentSessions: 0,
  plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
  commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
  projects: 0,
  spending: 0,
  partyFidelity: 0,
});

const fetchParties = async () => {
  const data = await fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`);
  const parties = (data?.dados || []).map((p) => ({
    id: p.id,
    sigla: p.sigla,
    nome: p.nome,
    uri: p.uri,
    ideology: PARTY_FALLBACK[p.sigla]?.ideology || 'Centro',
  }));

  if (parties.length > 0) return parties;
  return Object.entries(PARTY_FALLBACK).map(([sigla, data], index) => ({
    id: index + 1000,
    sigla,
    nome: data.nome,
    uri: '',
    ideology: data.ideology,
  }));
};

const fetchFeed = async () => {
  const dateVotes = new Date();
  dateVotes.setDate(dateVotes.getDate() - 30);
  const dateStrVotes = dateVotes.toISOString().split('T')[0];

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 7);
  const dateStr = dateLimit.toISOString().split('T')[0];

  const [votesData, propsData, eventsData] = await Promise.all([
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStrVotes}&itens=10`),
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=10`),
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=10`),
  ]);

  const votes = (votesData?.dados || []).map((v) => {
    const propId = v.uriProposicaoObjeto?.split('/').pop();
    return {
      id: parseInt(v.id, 10) || Math.floor(Date.now() + Math.random() * 1000),
      type: 'voto',
      title: `${v.siglaOrgao} ${v.uri ? v.uri.split('/').pop() : ''}`,
      date: new Date(v.dataHoraRegistro).toLocaleDateString('pt-BR'),
      description: formatText(v.descricao),
      status: 'Tramitação',
      sourceUrl: propId
        ? `https://www.camara.leg.br/propostas-legislativas/${propId}`
        : `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(v.descricao)}`,
      category: detectCategory(`${v.descricao} ${v.siglaOrgao}`),
      candidateId: propId ? parseInt(propId, 10) : undefined,
    };
  });

  const propositions = (propsData?.dados || []).map((p) => ({
    id: p.id,
    type: 'voto',
    title: `${p.siglaTipo} ${p.numero}/${p.ano}`,
    date: new Date(p.dataApresentacao || Date.now()).toLocaleDateString('pt-BR'),
    description: formatText(p.ementa),
    status: 'Tramitação',
    sourceUrl: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
    category: detectCategory(p.ementa || ''),
    fullTextUrl: p.urlInteiroTeor,
  }));

  const events = (eventsData?.dados || []).map((event) => ({
    id: event.id,
    type: 'evento',
    title: event.descricaoTipo || 'Evento Legislativo',
    date: new Date(event.dataHoraInicio).toLocaleDateString('pt-BR'),
    description: formatText(event.descricao || event.localCamara?.nome || 'Audiência Pública'),
    status: 'Tramitação',
    sourceUrl: `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${event.id}`,
    category: detectCategory(event.descricao || ''),
  }));

  return [...votes, ...propositions, ...events]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
      return dateB - dateA || (b.id - a.id);
    })
    .slice(0, 30);
};

const buildLegislativeBootstrap = async (): Promise<LegislativeBootstrap> => {
  const [deputados, senadores, feedItems, parties] = await Promise.all([
    fetchDeputados(),
    fetchSenadores(),
    fetchFeed(),
    fetchParties(),
  ]);
  const partiesFallback = parties.length > 0 && parties.every((party) => Number(party.id) >= 1000);
  const warnings = [
    deputados.length === 0 ? 'camara_deputados_unavailable' : '',
    senadores.length === 0 ? 'senado_senadores_unavailable' : '',
    feedItems.length === 0 ? 'camara_feed_unavailable' : '',
    partiesFallback ? 'camara_parties_using_fallback' : '',
  ].filter(Boolean);

  return {
    politicians: [...deputados, ...senadores],
    feedItems,
    parties,
    articles: [],
    generatedAt: new Date().toISOString(),
    partial: warnings.length > 0,
    warnings,
    sources: {
      camaraDeputados: { ok: deputados.length > 0, count: deputados.length },
      senadoSenadores: { ok: senadores.length > 0, count: senadores.length },
      camaraFeed: { ok: feedItems.length > 0, count: feedItems.length },
      camaraParties: { ok: !partiesFallback, count: parties.length, fallback: partiesFallback },
    },
  };
};

const pathnameForKey = (key: string) => `server-cache/${key}.json`;

const readServerCache = async <T>(key: string, ttlMs: number): Promise<T | null> => {
  const pathname = pathnameForKey(key);
  const now = Date.now();

  const parse = (raw: string): T | null => {
    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (!parsed || typeof parsed.timestamp !== 'number') return null;
      if (ttlMs > 0 && now - parsed.timestamp > ttlMs) return null;
      return parsed.data;
    } catch {
      return null;
    }
  };

  const memory = memoryCache.get(pathname);
  if (memory) {
    const data = parse(memory);
    if (data) return data;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const blob = blobs.find((item) => item.pathname === pathname);
    if (!blob) return null;
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    const raw = await response.text();
    memoryCache.set(pathname, raw);
    return parse(raw);
  } catch {
    return null;
  }
};

const writeServerCache = async <T>(key: string, data: T) => {
  const pathname = pathnameForKey(key);
  const payload = JSON.stringify({ data, timestamp: Date.now() } satisfies CacheEnvelope<T>);
  memoryCache.set(pathname, payload);

  if (!process.env.BLOB_READ_WRITE_TOKEN) return { persisted: false };

  await put(pathname, payload, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  return { persisted: true };
};

const getRefreshFlag = (req: VercelRequest) => {
  const fromQuery = Array.isArray(req.query?.refresh) ? req.query?.refresh[0] : req.query?.refresh;
  if (fromQuery) return fromQuery === '1' || fromQuery === 'true';
  const requestUrl = new URL(req.url || '', 'http://localhost');
  return requestUrl.searchParams.get('refresh') === '1';
};

export const refreshLegislativeBootstrap = async () => {
  const data = await buildLegislativeBootstrap();
  const cache = await writeServerCache<LegislativeBootstrap>(CACHE_KEY, data);
  return { data, cache };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return jsonResponse(res, 405, { error: 'Method not allowed.' });
  }

  try {
    const shouldRefresh = getRefreshFlag(req);
    const cached = shouldRefresh ? null : await readServerCache<LegislativeBootstrap>(CACHE_KEY, CACHE_TTL_MS);
    if (cached) {
      return jsonResponse(res, 200, {
        ok: true,
        source: 'cache',
        partial: Boolean(cached.partial),
        warnings: cached.warnings || [],
        sources: cached.sources || {},
        data: cached,
      });
    }

    const { data, cache } = await refreshLegislativeBootstrap();
    return jsonResponse(res, 200, {
      ok: true,
      source: cache.persisted ? 'refresh:blob' : 'refresh:memory',
      partial: data.partial,
      warnings: data.warnings,
      sources: data.sources,
      data,
    });
  } catch (error: any) {
    return jsonResponse(res, 502, { ok: false, error: error?.message || 'Bootstrap refresh failed.' });
  }
}
