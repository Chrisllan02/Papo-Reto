import type { EducationalArticle, FeedCategory, FeedItem, Party, Politician } from '../../types';

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const SENADO_URL = 'https://legis.senado.leg.br/dadosabertos/senador/lista/atual';

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

const fetchJson = async <T>(url: string): Promise<T | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
};

const fetchText = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/xml, application/xml;q=0.9, */*;q=0.8',
        'User-Agent': 'PapoReto/1.0 (+https://papo-reto-beige.vercel.app)',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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

const fetchDeputados = async (): Promise<Politician[]> => {
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
};

const fetchSenadores = async (): Promise<Politician[]> => {
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

const fetchParties = async (): Promise<Party[]> => {
  const data = await fetchJson<{ dados?: any[] }>(`${BASE_URL_CAMARA}/partidos?ordem=ASC&ordenarPor=sigla&itens=100`);
  const parties = (data?.dados || []).map((p) => ({
    id: p.id,
    sigla: p.sigla,
    nome: p.nome,
    uri: p.uri,
    ideology: PARTY_FALLBACK[p.sigla]?.ideology || 'Centro',
  } as Party));

  if (parties.length > 0) return parties;
  return Object.entries(PARTY_FALLBACK).map(([sigla, data], index) => ({
    id: index + 1000,
    sigla,
    nome: data.nome,
    uri: '',
    ideology: data.ideology,
  }));
};

const fetchFeed = async (): Promise<FeedItem[]> => {
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
    } as FeedItem;
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
  } as FeedItem));

  const events = (eventsData?.dados || []).map((event) => ({
    id: event.id,
    type: 'evento',
    title: event.descricaoTipo || 'Evento Legislativo',
    date: new Date(event.dataHoraInicio).toLocaleDateString('pt-BR'),
    description: formatText(event.descricao || event.localCamara?.nome || 'Audiência Pública'),
    status: 'Tramitação',
    sourceUrl: `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${event.id}`,
    category: detectCategory(event.descricao || ''),
  } as FeedItem));

  return [...votes, ...propositions, ...events]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
      return dateB - dateA || (b.id - a.id);
    })
    .slice(0, 30);
};

export const buildLegislativeBootstrap = async (): Promise<LegislativeBootstrap> => {
  const [deputados, senadores, feedItems, parties] = await Promise.all([
    fetchDeputados(),
    fetchSenadores(),
    fetchFeed(),
    fetchParties(),
  ]);

  return {
    politicians: [...deputados, ...senadores],
    feedItems,
    parties,
    articles: [],
    generatedAt: new Date().toISOString(),
  };
};
