import type { EducationalArticle, FeedCategory, FeedItem, Party, Politician } from '../../types';
import { readServerCache, writeServerCache } from './serverCache.js';

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';
const SENADO_PROXY_URL = `https://papo-reto-beige.vercel.app/api/camara?url=${encodeURIComponent(SENADO_URL)}`;
const UPSTREAM_TIMEOUT_MS = 15000;
const SENADO_TIMEOUT_MS = 12000;
const DEPUTY_DETAIL_TIMEOUT_MS = 2500;
const DEPUTY_SEX_ENRICHMENT_CONCURRENCY = 24;
const DEPUTY_SEX_ENRICHMENT_BUDGET_MS = 9000;
const DEPUTY_SEX_CACHE_KEY = 'deputy-sex-cache-v1';

const PARTY_FALLBACK: Record<string, { nome: string; ideology: 'Esquerda' | 'Centro' | 'Direita' }> = {
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

export type LegislativeBootstrap = {
  politicians: Politician[];
  feedItems: FeedItem[];
  parties: Party[];
  articles: EducationalArticle[];
  generatedAt: string;
  partial: boolean;
  warnings: string[];
  sources: Record<string, { ok: boolean; count: number; fallback?: boolean }>;
};

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const detectCategory = (text: string): FeedCategory => {
  const t = normalize(text);
  if (t.includes('educacao') || t.includes('escola') || t.includes('ensino') || t.includes('fundeb')) return 'education';
  if (t.includes('saude') || t.includes('sus') || t.includes('medico') || t.includes('hospital') || t.includes('vacina')) return 'health';
  if (t.includes('economia') || t.includes('tribut') || t.includes('imposto') || t.includes('dinheiro') || t.includes('orcamento') || t.includes('fiscal')) return 'economy';
  if (t.includes('seguranca') || t.includes('policia') || t.includes('crime') || t.includes('pena') || t.includes('armas')) return 'security';
  if (t.includes('trabalho') || t.includes('emprego') || t.includes('salario') || t.includes('clt')) return 'work';
  if (t.includes('ambiente') || t.includes('floresta') || t.includes('animais') || t.includes('clima') || t.includes('agua')) return 'environment';
  if (t.includes('justica') || t.includes('lei') || t.includes('direito') || t.includes('codigo') || t.includes('constituicao')) return 'justice';
  return 'activity';
};

const formatText = (text: string) => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

const sentenceCase = (text: string) => {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const cleanOfficialText = (text?: string | null) => {
  if (!text) return '';
  return text
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

const stripGuestList = (text: string) => {
  return cleanOfficialText(text)
    .replace(/\b(convidados?|participantes?|expositores?|mesa de convidados)\s*:?\s*[\s\S]*$/i, '')
    .replace(/\n\s*\d+\)\s+[\s\S]*$/i, '')
    .replace(/\(\s*req(?:uerimento)?[^)]*\)/gi, '')
    .replace(/\breq\.?\s*\d+\/\d{4}\s*[A-Z]*\b/gi, '')
    .trim();
};

const isGenericAgendaText = (text: string) => {
  const normalized = normalize(text);
  return /discussao e votacao de propostas legislativas/.test(normalized)
    || /reuniao deliberativa/.test(normalized)
    || /^audiencia publica$/.test(normalized);
};

const extractEventSubject = (description?: string | null) => {
  const withoutGuests = stripGuestList(description || '');
  const firstLine = withoutGuests
    .split('\n')
    .map(line => line.trim())
    .find(line => line.length > 0) || '';

  const subject = firstLine
    .replace(/^debater?\s+(sobre\s+)?/i, '')
    .replace(/^debate\s+(sobre\s+)?/i, '')
    .replace(/^tema:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return sentenceCase(subject);
};

const compactTitle = (text: string, fallback: string) => {
  const cleaned = sentenceCase(text);
  if (!cleaned || isGenericAgendaText(cleaned)) return fallback;
  if (cleaned.length <= 78) return cleaned;
  const beforeColon = cleaned.split(':')[0];
  if (beforeColon.length >= 24 && beforeColon.length <= 78) return beforeColon;
  return `${cleaned.slice(0, 75).trim()}...`;
};

const buildEventItem = (event: any): FeedItem | null => {
  const subject = extractEventSubject(event.descricao);
  const organ = event.orgaos?.[0]?.sigla || event.orgaos?.[0]?.nomeResumido || event.siglaOrgao;
  const fallbackTitle = organ ? `Pauta legislativa em ${organ}` : event.descricaoTipo || 'Atividade Legislativa';
  const title = compactTitle(subject, fallbackTitle);
  const originalDescription = cleanOfficialText(event.descricao || event.localCamara?.nome || event.descricaoTipo || '');
  const topic = isGenericAgendaText(subject) ? '' : subject;

  if (!topic && isGenericAgendaText(originalDescription)) return null;

  const typeLabel = event.descricaoTipo || 'Evento legislativo';
  const location = event.localCamara?.nome || event.localExterno || '';
  const summary = topic
    ? `${typeLabel} para discutir ${topic.charAt(0).toLowerCase()}${topic.slice(1)}.`
    : `${typeLabel} da Câmara com pauta registrada na fonte oficial.`;
  const whyItMatters = topic
    ? `Ajuda a antecipar quais temas podem virar pressão política, relatório ou votação nas próximas etapas.`
    : `Indica movimentação de comissão, mas a pauta oficial ainda tem pouco detalhe público.`;
  const nextStep = event.situacao === 'Convocada'
    ? 'Acompanhar a reunião e verificar se surgem requerimentos, relatórios ou votação.'
    : 'Consultar o registro oficial para ver encaminhamentos e documentos publicados.';
  const priority = (topic ? 30 : 5)
    + (event.descricaoTipo?.toLowerCase().includes('audiência') ? 12 : 0)
    + (event.situacao === 'Convocada' ? 8 : 0)
    + Math.min(20, Math.floor(originalDescription.length / 180));

  return {
    id: event.id,
    type: 'evento',
    title,
    date: new Date(event.dataHoraInicio).toLocaleDateString('pt-BR'),
    description: summary,
    originalDescription,
    summary,
    whyItMatters,
    nextStep,
    status: 'Tramitação',
    sourceUrl: `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${event.id}`,
    category: detectCategory(`${topic} ${originalDescription}`),
    organ,
    location,
    priority,
  } as FeedItem;
};

const buildLegislativeInsight = (kind: 'vote' | 'proposition', text?: string | null) => {
  const cleaned = sentenceCase(cleanOfficialText(text || ''));
  const category = detectCategory(cleaned);
  const base = cleaned || 'Movimentação legislativa registrada pela Câmara.';
  const summary = kind === 'proposition'
    ? `Nova proposta apresentada: ${base}`
    : `Movimentação de votação: ${base}`;
  const whyItMatters = kind === 'proposition'
    ? 'Pode alterar regras públicas se avançar nas comissões, no plenário e nas etapas seguintes.'
    : 'Mostra o andamento real da pauta e ajuda a identificar temas que estão ganhando prioridade política.';
  const nextStep = kind === 'proposition'
    ? 'Acompanhar distribuição, relatoria e parecer nas comissões.'
    : 'Verificar o resultado, os votos e se a matéria segue para nova etapa.';

  return {
    summary: summary.length > 180 ? `${summary.slice(0, 177).trim()}...` : summary,
    whyItMatters,
    nextStep,
    category,
  };
};

const fetchJson = async <T>(url: string, timeoutMs = UPSTREAM_TIMEOUT_MS, retries = 1): Promise<T | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      if (retries > 0 && (res.status >= 500 || res.status === 429)) {
        return fetchJson<T>(url, timeoutMs, retries - 1);
      }
      return null;
    }
    return await res.json() as T;
  } catch {
    if (retries > 0) {
      return fetchJson<T>(url, timeoutMs, retries - 1);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchText = async (url: string, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<string | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
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

const normalizeSex = (value?: string | null): 'F' | 'M' | undefined => {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  if (cleaned.startsWith('F')) return 'F';
  if (cleaned.startsWith('M')) return 'M';
  return undefined;
};

type SexCode = 'F' | 'M';
type DeputySexCache = Record<string, SexCode>;

const getXmlTag = (source: string, tag: string) => {
  const match = source.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
};

const fetchDeputySex = async (id: number): Promise<SexCode | undefined> => {
  const data = await fetchJson<{ dados?: { sexo?: string | null } }>(
    `${BASE_URL_CAMARA}/deputados/${id}`,
    DEPUTY_DETAIL_TIMEOUT_MS
  );
  return normalizeSex(data?.dados?.sexo);
};

const enrichDeputiesSexMetadata = async (deputies: Politician[]): Promise<Politician[]> => {
  const missingInitial = deputies.filter((deputy) => !normalizeSex(deputy.sex));
  if (missingInitial.length === 0) return deputies;

  const cachedSex = await readServerCache<DeputySexCache>(DEPUTY_SEX_CACHE_KEY, 0) || {};
  const withCachedSex = deputies.map((deputy) => {
    if (normalizeSex(deputy.sex)) return deputy;
    const sex = cachedSex[String(deputy.id)];
    if (sex !== 'F' && sex !== 'M') return deputy;
    return {
      ...deputy,
      sex,
      role: sex === 'F' ? 'Deputada Federal' : 'Deputado Federal',
    };
  });

  const missing = withCachedSex.filter((deputy) => !normalizeSex(deputy.sex));
  if (missing.length === 0) return withCachedSex;

  const updates = new Map<number, SexCode>();
  const startedAt = Date.now();
  let cursor = 0;

  const worker = async () => {
    while (cursor < missing.length && Date.now() - startedAt < DEPUTY_SEX_ENRICHMENT_BUDGET_MS) {
      const deputy = missing[cursor];
      cursor += 1;
      const sex = await fetchDeputySex(deputy.id);
      if (sex) updates.set(deputy.id, sex);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(DEPUTY_SEX_ENRICHMENT_CONCURRENCY, missing.length) },
      () => worker()
    )
  );

  if (updates.size === 0) return withCachedSex;

  const nextCache: DeputySexCache = { ...cachedSex };
  updates.forEach((sex, id) => {
    nextCache[String(id)] = sex;
  });
  await writeServerCache(DEPUTY_SEX_CACHE_KEY, nextCache);

  return withCachedSex.map((deputy) => {
    const sex = updates.get(deputy.id);
    if (!sex) return deputy;
    return {
      ...deputy,
      sex,
      role: sex === 'F' ? 'Deputada Federal' : 'Deputado Federal',
    };
  });
};

const fetchDeputados = async (): Promise<Politician[]> => {
  const data = await fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/deputados?ordem=ASC&ordenarPor=nome`);
  const deputies = (data?.dados || []).map((d) => {
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
      stats: {
        attendancePct: 0,
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
        commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
        projects: 0,
        spending: 0,
        partyFidelity: 0,
      },
      mandate: { start: '2023-02-01', end: '2027-01-31' },
      hasApiIntegration: true,
      votes: {},
    } as Politician;
  });

  return enrichDeputiesSexMetadata(deputies);
};

const fetchSenadores = async (): Promise<Politician[]> => {
  const xml = await fetchText(SENADO_PROXY_URL, SENADO_TIMEOUT_MS) || await fetchText(SENADO_URL, SENADO_TIMEOUT_MS);
  if (!xml) return [];

  const blocks = xml.match(/<Parlamentar>[\s\S]*?<\/Parlamentar>/g) || [];
  return blocks.map((block) => {
    const id = Number(getXmlTag(block, 'CodigoParlamentar') || getXmlTag(block, 'IdParlamentar')) || Math.floor(Math.random() * 1_000_000);
    const name = getXmlTag(block, 'NomeParlamentar') || getXmlTag(block, 'NomeCompletoParlamentar');
    const party = getXmlTag(block, 'SiglaPartidoParlamentar');
    const state = getXmlTag(block, 'SiglaUfParlamentar') || getXmlTag(block, 'UfParlamentar');
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
      stats: {
        attendancePct: 0,
        totalSessions: 0,
        presentSessions: 0,
        absentSessions: 0,
        plenary: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
        commissions: { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
        projects: 0,
        spending: 0,
        partyFidelity: 0,
      },
      mandate: { start: '2023-02-01', end: '2031-01-31' },
      hasApiIntegration: false,
      votes: {},
    } as Politician;
  }).filter((p) => p.name && p.party && p.state);
};

const fetchParties = async (): Promise<{ parties: Party[]; fallback: boolean }> => {
  const data = await fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`);
  const parties = (data?.dados || []).map((p) => ({
    id: p.id,
    sigla: p.sigla,
    nome: p.nome,
    uri: p.uri,
    ideology: PARTY_FALLBACK[p.sigla]?.ideology || 'Centro',
  } as Party));

  if (parties.length > 0) return { parties, fallback: false };
  return {
    parties: Object.entries(PARTY_FALLBACK).map(([sigla, data], index) => ({
      id: index + 1000,
      sigla,
      nome: data.nome,
      uri: '',
      ideology: data.ideology,
    })),
    fallback: true,
  };
};

const fetchFeed = async (): Promise<FeedItem[]> => {
  const dateVotes = new Date();
  dateVotes.setDate(dateVotes.getDate() - 30);
  const dateStrVotes = dateVotes.toISOString().split('T')[0];

  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - 7);
  const dateStr = dateLimit.toISOString().split('T')[0];

  const [votesData, propsData, eventsData] = await Promise.all([
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStrVotes}&itens=15`),
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=15`),
    fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=20`),
  ]);

  const votes = (votesData?.dados || []).map((v) => {
    const propId = v.uriProposicaoObjeto?.split('/').pop();
    const insight = buildLegislativeInsight('vote', v.descricao);
    return {
      id: parseInt(v.id, 10) || Math.floor(Date.now() + Math.random() * 1000),
      type: 'voto',
      title: `${v.siglaOrgao} ${v.uri ? v.uri.split('/').pop() : ''}`,
      date: new Date(v.dataHoraRegistro).toLocaleDateString('pt-BR'),
      description: formatText(v.descricao),
      originalDescription: cleanOfficialText(v.descricao),
      summary: insight.summary,
      whyItMatters: insight.whyItMatters,
      nextStep: insight.nextStep,
      status: 'Tramitação',
      sourceUrl: propId
        ? `https://www.camara.leg.br/propostas-legislativas/${propId}`
        : `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(v.descricao)}`,
      category: insight.category,
      candidateId: propId ? parseInt(propId, 10) : undefined,
      organ: v.siglaOrgao,
      priority: 40 + (propId ? 10 : 0),
    } as FeedItem;
  });

  const propositions = (propsData?.dados || []).map((p) => {
    const insight = buildLegislativeInsight('proposition', p.ementa);
    return {
      id: p.id,
      type: 'voto',
      title: `${p.siglaTipo} ${p.numero}/${p.ano}`,
      date: new Date(p.dataApresentacao || Date.now()).toLocaleDateString('pt-BR'),
      description: formatText(p.ementa),
      originalDescription: cleanOfficialText(p.ementa),
      summary: insight.summary,
      whyItMatters: insight.whyItMatters,
      nextStep: insight.nextStep,
      status: 'Tramitação',
      sourceUrl: `https://www.camara.leg.br/propostas-legislativas/${p.id}`,
      category: insight.category,
      fullTextUrl: p.urlInteiroTeor,
      priority: 35,
    } as FeedItem;
  });

  const events = (eventsData?.dados || [])
    .map(buildEventItem)
    .filter((item): item is FeedItem => Boolean(item));

  return [...votes, ...propositions, ...events]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
      return (b.priority || 0) - (a.priority || 0) || dateB - dateA || (b.id - a.id);
    })
    .slice(0, 30);
};

export const buildLegislativeBootstrap = async (): Promise<LegislativeBootstrap> => {
  const [deputados, senadores, feedItems, partiesResult] = await Promise.all([
    fetchDeputados(),
    fetchSenadores(),
    fetchFeed(),
    fetchParties(),
  ]);
  const parties = partiesResult.parties;
  const partiesFallback = partiesResult.fallback;
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
