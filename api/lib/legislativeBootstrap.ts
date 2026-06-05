import type { EducationalArticle, FeedCategory, FeedItem, Party, Politician } from '../../types';
import { readServerCache, writeServerCache } from './serverCache.js';

const BASE_URL_CAMARA = 'https://dadosabertos.camara.leg.br/api/v2';
const CAMARA_PROXY_BASE_URL = 'https://papo-reto-beige.vercel.app/api/camara';
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

const ARTICLE_STYLES = [
  { colorFrom: 'from-picture', colorTo: 'to-midnight', icon: 'Lightbulb' },
  { colorFrom: 'from-nuit', colorTo: 'to-blue-900', icon: 'ScrollText' },
  { colorFrom: 'from-green-700', colorTo: 'to-emerald-950', icon: 'Banknote' },
  { colorFrom: 'from-amber-700', colorTo: 'to-orange-900', icon: 'ScrollText' },
  { colorFrom: 'from-sky-700', colorTo: 'to-blue-950', icon: 'Lightbulb' },
  { colorFrom: 'from-lime-700', colorTo: 'to-green-900', icon: 'Banknote' },
];

const CATEGORY_TOPIC: Record<FeedCategory, { topic: string; legislation: string; impact: string; icon?: string }> = {
  education: {
    topic: 'Educação',
    legislation: 'CF/88, art. 205 a 214; LDB e Plano Nacional de Educação.',
    impact: 'Pode afetar escolas, famílias, orçamento educacional e regras de ensino.',
  },
  health: {
    topic: 'Saúde',
    legislation: 'CF/88, art. 196 a 200; leis orgânicas do SUS.',
    impact: 'Pode afetar atendimento, hospitais, prevenção, orçamento do SUS e acesso a tratamentos.',
  },
  economy: {
    topic: 'Economia',
    legislation: 'CF/88, art. 145 a 169; regras tributárias, fiscais e orçamentárias.',
    impact: 'Pode afetar impostos, gastos públicos, empresas, empregos e preços na vida cotidiana.',
    icon: 'Banknote',
  },
  security: {
    topic: 'Segurança',
    legislation: 'CF/88, art. 5º e art. 144; legislação penal e de segurança pública.',
    impact: 'Pode afetar policiamento, prevenção, direitos individuais e combate ao crime.',
  },
  work: {
    topic: 'Trabalho',
    legislation: 'CF/88, art. 6º e art. 7º; CLT e legislação previdenciária.',
    impact: 'Pode afetar salário, contratos, proteção trabalhista, fiscalização e direitos sociais.',
  },
  environment: {
    topic: 'Meio Ambiente',
    legislation: 'CF/88, art. 225; Código Florestal e normas ambientais.',
    impact: 'Pode afetar fiscalização ambiental, uso do solo, água, clima e atividades econômicas.',
  },
  justice: {
    topic: 'Legislação',
    legislation: 'CF/88, art. 59 a 69; processo legislativo e controle constitucional.',
    impact: 'Ajuda a entender como uma proposta pode virar regra obrigatória para todos.',
    icon: 'ScrollText',
  },
  activity: {
    topic: 'Congresso',
    legislation: 'CF/88, art. 44 a 69; Regimento Interno da Câmara e do Senado.',
    impact: 'Mostra onde a agenda política está se movendo e quais temas merecem acompanhamento.',
  },
};

const articleTitleForItem = (item: FeedItem) => {
  if (item.type === 'evento') return `Entenda a pauta: ${item.title}`;
  if (/^PL|^PEC|^PLP|^MPV|^PDL/i.test(item.title)) return `Como acompanhar ${item.title}`;
  return `O que está em jogo: ${item.title}`;
};

const buildArticleText = (item: FeedItem, topic: string) => {
  const subject = item.summary || item.description || item.title;
  const why = item.whyItMatters || 'O tema pode influenciar decisões públicas, prioridades de governo e serviços usados pela população.';
  const next = item.nextStep || 'Acompanhe a tramitação, os pareceres e as próximas votações na fonte oficial.';
  const organ = item.organ ? ` A discussão aparece vinculada a ${item.organ}.` : '';

  return [
    `**O que aconteceu:** ${subject}${organ}`,
    `**Por que isso importa:** ${why}`,
    `**Como acompanhar:** ${next} Use a fonte oficial para verificar documentos, autores, convidados e mudanças na tramitação.`,
    `**Tema central:** ${topic}. Entender esse assunto ajuda a separar notícia, opinião e decisão formal do Congresso.`
  ].join('\n\n');
};

const buildStaticEducationArticles = (generatedAt: string): EducationalArticle[] => [
  {
    id: 9001,
    title: 'Como um projeto vira lei',
    text: '**Entrada:** uma proposta pode nascer na Câmara, Senado, Executivo ou iniciativa popular.\n\n**Análise:** passa por comissões, recebe relator e pode ser alterada por emendas.\n\n**Decisão:** se aprovada nas Casas, segue para sanção ou veto presidencial. O ponto importante é acompanhar parecer, votação e texto final, não só o título da proposta.',
    topic: 'Legislação',
    legislation: 'CF/88, art. 59 a 69.',
    impact: 'Ajuda a entender em que etapa uma promessa política realmente pode virar obrigação legal.',
    colorFrom: 'from-nuit',
    colorTo: 'to-blue-900',
    icon: 'ScrollText',
    generatedAt,
  },
  {
    id: 9002,
    title: 'O que olhar em uma audiência pública',
    text: '**Função:** audiência pública serve para ouvir especialistas, governo, entidades e cidadãos sobre uma pauta.\n\n**Limite:** ela não aprova lei sozinha, mas pode influenciar relatório, emendas e pressão política.\n\n**Sinal útil:** veja quem foi convidado, qual comissão chamou a reunião e se depois surgiram requerimentos ou pareceres.',
    topic: 'Congresso',
    legislation: 'Regimento Interno da Câmara; participação social no processo legislativo.',
    impact: 'Mostra quais grupos estão tentando influenciar uma decisão antes da votação.',
    colorFrom: 'from-picture',
    colorTo: 'to-midnight',
    icon: 'Lightbulb',
    generatedAt,
  },
  {
    id: 9003,
    title: 'Orçamento público sem mistério',
    text: '**Ideia central:** orçamento é a autorização política para arrecadar e gastar dinheiro público.\n\n**Na prática:** saúde, educação, segurança, obras e emendas dependem dessa disputa.\n\n**Como fiscalizar:** procure programa, valor, autor da emenda, órgão executor e entrega real. O número grande só importa quando vira serviço público acompanhado.',
    topic: 'Orçamento',
    legislation: 'CF/88, art. 165 a 169.',
    impact: 'Ajuda a fiscalizar se dinheiro público está virando entrega ou só promessa.',
    colorFrom: 'from-green-700',
    colorTo: 'to-emerald-950',
    icon: 'Banknote',
    generatedAt,
  },
];

const buildEducationalArticles = (feedItems: FeedItem[], generatedAt: string): EducationalArticle[] => {
  const byTopic = new Map<string, FeedItem>();

  feedItems
    .filter(item => item.sourceUrl && (item.summary || item.whyItMatters || item.description))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .forEach((item) => {
      const meta = CATEGORY_TOPIC[item.category || 'activity'];
      if (!byTopic.has(meta.topic)) byTopic.set(meta.topic, item);
    });

  const dynamicArticles = Array.from(byTopic.entries()).slice(0, 9).map(([topic, item], index) => {
    const categoryMeta = CATEGORY_TOPIC[item.category || 'activity'];
    const style = ARTICLE_STYLES[index % ARTICLE_STYLES.length];

    return {
      id: 1000 + index,
      title: articleTitleForItem(item),
      text: buildArticleText(item, topic),
      topic,
      legislation: categoryMeta.legislation,
      impact: categoryMeta.impact,
      colorFrom: style.colorFrom,
      colorTo: style.colorTo,
      icon: categoryMeta.icon || style.icon,
      sourceUrl: item.sourceUrl,
      sourceTitle: item.title,
      generatedAt,
    } as EducationalArticle;
  });

  const fallback = buildStaticEducationArticles(generatedAt);
  const seenTitles = new Set(dynamicArticles.map(article => normalize(article.title)));
  const merged = [
    ...dynamicArticles,
    ...fallback.filter(article => !seenTitles.has(normalize(article.title))),
  ];

  return merged.slice(0, 12);
};

export const withGeneratedEducationalArticles = (data: LegislativeBootstrap): LegislativeBootstrap => {
  const generatedAt = data.generatedAt || new Date().toISOString();
  const existingUsefulArticles = (data.articles || []).filter(article => article.generatedAt || article.sourceUrl);
  const articles = existingUsefulArticles.length > 0
    ? data.articles
    : buildEducationalArticles(data.feedItems || [], generatedAt);

  return {
    ...data,
    articles,
    sources: {
      ...(data.sources || {}),
      educationArticles: { ok: articles.length > 0, count: articles.length },
    },
    warnings: [
      ...(data.warnings || []).filter(warning => warning !== 'education_articles_unavailable'),
      ...(articles.length === 0 ? ['education_articles_unavailable'] : []),
    ],
  };
};

const getCamaraProxyUrl = (url: string) => {
  try {
    const target = new URL(url);
    if (target.hostname !== 'dadosabertos.camara.leg.br') return null;
    return `${CAMARA_PROXY_BASE_URL}?url=${encodeURIComponent(target.toString())}`;
  } catch {
    return null;
  }
};

const fetchJson = async <T>(url: string, timeoutMs = UPSTREAM_TIMEOUT_MS, retries = 1, allowProxyFallback = true): Promise<T | null> => {
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
        return fetchJson<T>(url, timeoutMs, retries - 1, allowProxyFallback);
      }
      const proxyUrl = allowProxyFallback ? getCamaraProxyUrl(url) : null;
      if (proxyUrl) return fetchJson<T>(proxyUrl, timeoutMs, 0, false);
      return null;
    }
    return await res.json() as T;
  } catch {
    if (retries > 0) {
      return fetchJson<T>(url, timeoutMs, retries - 1, allowProxyFallback);
    }
    const proxyUrl = allowProxyFallback ? getCamaraProxyUrl(url) : null;
    if (proxyUrl) return fetchJson<T>(proxyUrl, timeoutMs, 0, false);
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
  const generatedAt = new Date().toISOString();
  const articles = buildEducationalArticles(feedItems, generatedAt);
  const warnings = [
    deputados.length === 0 ? 'camara_deputados_unavailable' : '',
    senadores.length === 0 ? 'senado_senadores_unavailable' : '',
    feedItems.length === 0 ? 'camara_feed_unavailable' : '',
    articles.length === 0 ? 'education_articles_unavailable' : '',
    partiesFallback ? 'camara_parties_using_fallback' : '',
  ].filter(Boolean);

  return {
    politicians: [...deputados, ...senadores],
    feedItems,
    parties,
    articles,
    generatedAt,
    partial: warnings.length > 0,
    warnings,
    sources: {
      camaraDeputados: { ok: deputados.length > 0, count: deputados.length },
      senadoSenadores: { ok: senadores.length > 0, count: senadores.length },
      camaraFeed: { ok: feedItems.length > 0, count: feedItems.length },
      educationArticles: { ok: articles.length > 0, count: articles.length },
      camaraParties: { ok: !partiesFallback, count: parties.length, fallback: partiesFallback },
    },
  };
};
