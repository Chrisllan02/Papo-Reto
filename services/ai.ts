
import { NewsArticle } from '../types';
import { getConfiguredApiOrigin, getLegislativeApiUrl } from '../utils/legislativeApiProxy';
import { timeoutSignal } from '../utils/timeoutSignal';
import { compileTerms, normalizeForMatch } from '../domain/legislative/classification';
import { BASE_URL_CAMARA, formatBrazilianDate, getBrazilDateString } from './camaraApi';
import { safeGetItem, safeRemoveItem, safeSetItem, purgeStaleKeys } from './storage';

// Cache Utils
const NEWS_CACHE_KEY = 'paporeto_news_v24_compact_agenda_cards'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v5_ids'; 
const NEWS_CACHE_TTL = 1000 * 60 * 5; // 5 Minutos
const AI_REQUEST_TIMEOUT_MS = 60000;
const NEWS_FETCH_TIMEOUT_MS = 10000;
const EDUCATION_CACHE_KEY = 'paporeto_education_articles_v1';
const EDUCATION_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 horas
let educationalContentInFlight: Promise<EducationalContentResult> | null = null;
const generatedNewsImages = new Map<string, string>();
const newsImagesInFlight = new Set<string>();

purgeStaleKeys(/^paporeto_news_v\d+_/, key => key === NEWS_CACHE_KEY);
purgeStaleKeys(/^paporeto_news_history_v\d+_/, key => key === NEWS_HISTORY_KEY);
purgeStaleKeys(/^paporeto_education_articles_v\d+$/, key => key === EDUCATION_CACHE_KEY);
purgeStaleKeys(/^paporeto_img_cache_v\d+$/, () => false);

const getCache = (key: string, ttl: number) => {
    try {
        const item = safeGetItem(key);
        if (!item) return null;
        const { data, timestamp } = JSON.parse(item);
        if (ttl > 0 && Date.now() - timestamp > ttl) return null;
        return data;
    } catch (e) {
        return null;
    }
};

const setCache = (key: string, data: any) => {
    if (!safeSetItem(key, JSON.stringify({ data, timestamp: Date.now() }))) {
        console.warn('Cache cheio ou indisponível:', key);
    }
};

const isValidArticle = (item: any): item is GeneratedArticle =>
    Boolean(item) && typeof item.title === 'string' && item.title.trim() !== '' && typeof item.text === 'string' && item.text.trim() !== '';

const getCachedEducationalContent = (): GeneratedArticle[] | null => {
    const data = getCache(EDUCATION_CACHE_KEY, EDUCATION_CACHE_TTL);
    return Array.isArray(data) ? data.filter(isValidArticle) : null;
};

const setCachedEducationalContent = (data: GeneratedArticle[]) => {
    setCache(EDUCATION_CACHE_KEY, data);
};

const callAiApi = async <T>(action: string, payload: Record<string, any> = {}): Promise<T | null> => {
    try {
        const apiOrigin = getConfiguredApiOrigin();
        const response = await fetch(`${apiOrigin}/api/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload }),
            signal: timeoutSignal(AI_REQUEST_TIMEOUT_MS)
        });
        if (!response.ok) return null;
        const json = await response.json();
        return (json?.data ?? null) as T | null;
    } catch {
        return null;
    }
};

const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- ENGINE DE IMAGENS SEMÂNTICA ---
const SEMANTIC_IMAGES_MAP: Record<string, string> = {
    congress: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=800&auto=format&fit=crop",
    justice: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop",
    economy: "https://images.unsplash.com/photo-1611974765270-ca12586343bb?q=80&w=800&auto=format&fit=crop",
    health: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop",
    education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop",
    tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
    security: "https://images.unsplash.com/photo-1555963966-b7ae5404b6ed?q=80&w=800&auto=format&fit=crop",
    environment: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
    brazil: "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?q=80&w=800&auto=format&fit=crop"
};

const SMART_IMAGE_RULES: Array<{ pattern: RegExp, image: string }> = [
    { pattern: compileTerms(['economia', 'orcamento*', 'gasto*', 'dinheiro', 'tribut*', 'imposto*', 'financ*', 'dolar', 'bolsa']), image: SEMANTIC_IMAGES_MAP.economy },
    { pattern: compileTerms(['saude', 'medic*', 'hospital*', 'doenca*', 'vacina*', 'sus', 'pandemia']), image: SEMANTIC_IMAGES_MAP.health },
    { pattern: compileTerms(['educacao*', 'escola*', 'ensino', 'aluno*', 'universidade*', 'professor*']), image: SEMANTIC_IMAGES_MAP.education },
    { pattern: compileTerms(['seguranca', 'policia*', 'crime*', 'arma', 'armas', 'violencia', 'prisao']), image: SEMANTIC_IMAGES_MAP.security },
    { pattern: compileTerms(['ambiente', 'floresta*', 'clima*', 'agua', 'aguas', 'natureza', 'sustent*', 'amazonia']), image: SEMANTIC_IMAGES_MAP.environment },
    { pattern: compileTerms(['tecnologia*', 'internet', 'digital', 'inovacao', 'rede social', 'redes sociais', 'ia', 'cyber*']), image: SEMANTIC_IMAGES_MAP.tech },
    { pattern: compileTerms(['justica', 'lei', 'leis', 'stf', 'julgamento', 'direito*', 'tribunal', 'juridic*']), image: SEMANTIC_IMAGES_MAP.justice },
    { pattern: compileTerms(['congresso', 'camara', 'senado', 'plenario', 'parlamentar*', 'deputad*', 'politica*']), image: SEMANTIC_IMAGES_MAP.congress },
];

const getSmartImage = (text: string): string => {
    const t = normalizeForMatch(text);
    return SMART_IMAGE_RULES.find(rule => rule.pattern.test(t))?.image ?? SEMANTIC_IMAGES_MAP.brazil;
};

export interface AIResponse {
    text: string;
    sources: { web?: { uri: string; title: string }; maps?: { uri: string; title: string; source: string } }[];
}

export interface GeneratedArticle {
    title: string; text: string; topic: string; legislation?: string; impact?: string;
}

export interface EducationalContentResult {
    articles: GeneratedArticle[];
    isFallback: boolean;
}

export class AiUnavailableError extends Error {
    constructor() {
        super('Assistente indisponível');
        this.name = 'AiUnavailableError';
    }
}

// --- MOTOR DE TRADUÇÃO JORNALÍSTICA (REGEX) ---
const TITLE_RULES: Array<{ regex: RegExp, template: string }> = [
    { regex: /oitivas? de testemunhas?/i, template: "Oitiva de Testemunhas" },
    { regex: /e votação de propostas/i, template: "Votação de Propostas" },
    { regex: /audiência pública/i, template: "Audiência Pública" },
    { regex: /reunião deliberativa/i, template: "Reunião Deliberativa" },
    { regex: /sessão deliberativa/i, template: "Sessão Deliberativa" },
    { regex: /seminário/i, template: "Seminário Legislativo" },
    { regex: /aprovado o requerimento de urgência/i, template: "Urgência Aprovada" },
    { regex: /mantido o texto/i, template: "Texto Mantido" },
    { regex: /rejeitado o texto/i, template: "Texto Rejeitado" },
    { regex: /encaminhada à publicação/i, template: "Encaminhada à Publicação" },
    { regex: /aprovada a redação final/i, template: "Redação Final Aprovada" },
    { regex: /designado relator/i, template: "Relator Designado" },
    { regex: /novo despacho/i, template: "Novo Despacho" },
    { regex: /retirado de pauta/i, template: "Retirado de Pauta" },
    { regex: /rejeitado o requerimento/i, template: "Requerimento Rejeitado" },
    { regex: /aprovado o projeto/i, template: "Projeto Aprovado" },
    { regex: /transformado na lei/i, template: "Transformado em Lei" }
];

const cleanLegislativeText = (rawText: string) => rawText
    .replace(/PAUTA SUJEITA A ALTERAÇÕES.*/i, '')
    .replace(/A - Deliberação.*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();

const extractAgendaSubject = (rawText: string) => {
    const cleaned = cleanLegislativeText(rawText)
        .replace(/^Na pauta:\s*/i, '')
        .replace(/^Pauta:\s*/i, '')
        .replace(/\(Requerimento[^)]*\)/gi, '')
        .replace(/Requerimento\s*n[ºo.]?\s*[\w/.-]+/gi, '')
        .replace(/CONVIDADOS?.*/i, '')
        .trim();

    const beforeGuests = cleaned.split(/\s+\d+\)\s+/)[0]?.trim() || cleaned;
    const debateSubject = beforeGuests.match(/(?:tratam|trata|debater|debate|discutir|discussão)\s+sobre\s+(.*?)(?:,|;|\.|\(|$)/i)?.[1]
        || beforeGuests.match(/sobre\s+(.*?)(?:,|;|\.|\(|$)/i)?.[1];

    const subject = (debateSubject || beforeGuests)
        .split(/;|\.\s/)[0]
        .replace(/^debate\s+sobre\s+/i, '')
        .replace(/^projetos?\s+que\s+tratam\s+sobre\s+/i, '')
        .replace(/^a\s+/i, '')
        .replace(/^o\s+/i, '')
        .replace(/\s+-\s+$/g, '')
        .trim();

    return subject || 'pauta legislativa';
};

const sentenceCase = (text: string) => {
    const clean = text.trim();
    if (!clean) return clean;
    return clean.charAt(0).toUpperCase() + clean.slice(1);
};

function generateJournalisticTitle(rawText: string, type: 'voto' | 'evento' | 'proposicao' = 'voto'): string {
    if (!rawText) return "Movimentação no Congresso";
    const text = rawText.trim();

    if (type === 'evento') {
        const agendaSubject = extractAgendaSubject(text);
        if (/educação domiciliar/i.test(agendaSubject)) return 'Debate sobre educação domiciliar';
        if (agendaSubject.length > 8 && !/^audiência pública$/i.test(agendaSubject)) {
            const title = sentenceCase(agendaSubject.split(',')[0]);
            return title.length > 58 ? `${title.slice(0, 55)}...` : title;
        }
    }

    // 1. Regras Diretas (Substituição Completa)
    for (const rule of TITLE_RULES) {
        if (rule.regex.test(text)) return rule.template;
    }

    let cleaned = text;

    // 2. Limpeza de "Lixo Burocrático"
    cleaned = cleaned.replace(/PAUTA SUJEITA A ALTERAÇÕES.*/i, "");
    cleaned = cleaned.replace(/A - Deliberação.*/i, "");
    cleaned = cleaned.replace(/E votação.*/i, ""); 
    cleaned = cleaned.replace(/ - \d{2}\/\d{2}\/\d{4}.*$/, "");
    cleaned = cleaned.replace(/n\.? ?\d+(\/\d+)?/gi, ""); 

    // 3. Prefixos Inteligentes
    if (type === 'proposicao') {
        cleaned = cleaned.replace(/^Altera a Lei.*para/i, "Nova Proposta: ");
        cleaned = cleaned.replace(/^Institui o/i, "Criação: ");
        cleaned = cleaned.replace(/^Dispõe sobre/i, "Debate: ");
        cleaned = cleaned.replace(/^Requer a realização de/i, "Pedido: ");
        cleaned = cleaned.replace(/^Requer a/i, "Pedido: ");
        cleaned = cleaned.replace(/^Requer/i, "Requerimento: ");
    }

    // 4. Limpeza Geral
    cleaned = cleaned
        .replace(/^(Votação|Discussão|Apreciação) (única )?(em \w+ turno )?(d[oa]s? )?/i, "")
        .replace(/^Aprovação d[oa] /i, "")
        .replace(/Projeto de Lei/i, "PL")
        .replace(/Proposta de Emenda à Constituição/i, "PEC")
        .replace(/Medida Provisória/i, "MP")
        .trim();

    // 5. Extração de Assunto
    const matchInstitui = cleaned.match(/(?:que|visando|para) (institui|cria|autoriza|obriga|concede|reconhece|altera|dispõe|regulamenta) (.*?)(?:;|\.|$)/i);
    if (matchInstitui) {
        const action = matchInstitui[1];
        const subject = matchInstitui[2];
        cleaned = `${action.charAt(0).toUpperCase() + action.slice(1)} ${subject}`;
    } else {
        cleaned = cleaned.split(/,|;/)[0]; 
    }

    // 6. Formatação Final
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    if (cleaned.endsWith('.') || cleaned.endsWith(':') || cleaned.endsWith('-')) cleaned = cleaned.slice(0, -1).trim();
    if (cleaned.length > 60) cleaned = cleaned.substring(0, 57) + "...";

    return cleaned || "Nova Proposta Legislativa";
}

function generateStructuredSummary(rawText: string, type: 'voto' | 'evento' | 'proposicao' = 'voto'): { context: string, main: string } {
    const defaultResponse = {
        context: type === 'evento' ? "Agenda Oficial" : type === 'proposicao' ? "Novo Projeto" : "Tramitação",
        main: rawText || "Detalhes não disponíveis no momento."
    };

    if (!rawText) return defaultResponse;
    const lowerText = rawText.toLowerCase();
    
    // Limpeza pesada para o resumo
    let subject = rawText.replace(/PAUTA SUJEITA A ALTERAÇÕES.*/i, "").trim();
    
    const matchSubject = rawText.match(/(?:institui|cria|sobre|acerca d[eo]|referente [aà])\s+(.*?)(?:;|\.|,|$)/i);
    if (matchSubject && matchSubject[1]) subject = matchSubject[1].trim();
    subject = subject.replace(/n\.º? ?\d+(\/\d+)?/g, "").replace(/Dispõe sobre/i, "trata de");

    if (type === 'evento') {
        let context = "Atividade Legislativa";
        if (lowerText.includes('sessão deliberativa')) context = "Sessão no Plenário";
        else if (lowerText.includes('comissão')) context = "Debate em Comissão";
        else if (lowerText.includes('audiência')) context = "Audiência Pública";
        else if (lowerText.includes('solene')) context = "Sessão Solene";
        else if (lowerText.includes('oitiva')) context = "Oitiva";

        let explanation = rawText;
        if (lowerText.includes('oitiva')) explanation = "Reunião para ouvir depoentes (oitiva).";
        else if (lowerText.includes('cancelada')) explanation = "Esta sessão ou reunião foi cancelada da pauta do dia.";
        else if (lowerText.includes('convocada')) explanation = `Reunião convocada. Pauta: ${extractAgendaSubject(rawText)}.`;
        else {
            const agendaSubject = extractAgendaSubject(rawText);
            explanation = `Discussão pública sobre ${agendaSubject}. Acompanhe os impactos e próximos encaminhamentos.`;
        }

        if (explanation.length > 170) explanation = `${explanation.substring(0, 167).trim()}...`;
        
        return { context, main: explanation };
    }

    if (type === 'proposicao') {
        let context = "Projeto de Lei";
        if (/\bpec\b/.test(lowerText)) context = "Proposta Constitucional";
        else if (lowerText.includes('requerimento')) context = "Requerimento";
        else if (lowerText.includes('medida provisória')) context = "Medida Provisória";

        let explanation = `Nova proposta: ${subject}.`;
        if (subject.length > 150) explanation = subject.substring(0, 147) + "...";
        return { context, main: explanation };
    }

    let context = "Em Análise";
    let explanation = `O texto trata de: ${subject}.`;

    if (lowerText.includes('urgência')) {
        context = "Regime de Urgência";
        if (/\baprovad[oa]\b/.test(lowerText)) {
            explanation = `Aprovação para acelerar o projeto, pulando etapas de comissões.`;
        }
    } else if (lowerText.includes('medida provisória')) {
        context = "Medida Provisória";
        explanation = `Análise de norma presidencial com força de lei imediata.`;
    } else if (/\bpec\b/.test(lowerText)) {
        context = "Proposta de Emenda à Constituição";
        explanation = `PEC: exige 3/5 dos votos em dois turnos em cada Casa.`;
    } else if (/\baprovad[oa]\b/.test(lowerText)) {
        context = "Aprovado";
    }

    if (explanation.length > 200) explanation = explanation.substring(0, 197) + "...";

    return { context, main: explanation };
}

// --- GESTÃO DE HISTÓRICO ---
const withoutInlineImage = (article: NewsArticle): NewsArticle => {
    if (!article.imageUrl?.startsWith('data:')) return article;
    return { ...article, imageUrl: getSmartImage(`${article.title} ${article.summary?.main || ''}`) };
};

const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getNewsHistory();
        let allArticles = [...newArticles, ...currentHistory].map(withoutInlineImage);

        const seenSignatures = new Set<string>();
        allArticles = allArticles.filter(item => {
            if (!item.title || !item.timestamp) return false;
            const sig = item.id ? `id:${item.id}` : `sig:${item.title.trim()}|${(item.time || '').trim()}`;
            if (seenSignatures.has(sig)) return false;
            seenSignatures.add(sig);
            return true;
        });

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        allArticles = allArticles.filter(item => (now - (item.timestamp as number)) < THIRTY_DAYS_MS);

        allArticles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setCache(NEWS_HISTORY_KEY, allArticles.slice(0, 300));
    } catch (e) { console.error("Erro crítico ao salvar histórico", e); }
};

export const getNewsHistory = (): NewsArticle[] => {
    const raw = getCache(NEWS_HISTORY_KEY, 0); 
    if (!Array.isArray(raw)) return [];
    return raw.filter(item => item && typeof item.title === 'string');
};

export const getBestAvailableNews = (): NewsArticle[] | null => getCache(NEWS_CACHE_KEY, 0);

// Sem notícia verificável não exibimos nada: a UI trata a lista vazia.
export function getEmergencyNews(): NewsArticle[] {
    return [];
}

// --- GERAÇÃO DE IMAGEM DE NOTÍCIA (GOOGLE GEMINI) ---
export const generateNewsImage = async (headline: string): Promise<string | null> => {
    try {
        const data = await callAiApi<{ imageDataUrl: string | null }>('generateNewsImage', { headline });
        return data?.imageDataUrl || null;
    } catch (e) {
        return null;
    }
};

// --- FETCH REAL API DATA ---
// A imagem gerada (base64) fica só em memória, por id da notícia: não bloqueia a lista nem é regerada a cada atualização.
const withGeneratedImage = (news: NewsArticle[]): NewsArticle[] => {
    const lead = news[0];
    if (!lead?.id) return news;
    const image = generatedNewsImages.get(lead.id);
    if (image) return [{ ...lead, imageUrl: image }, ...news.slice(1)];
    if (!newsImagesInFlight.has(lead.id)) {
        const leadId = lead.id;
        newsImagesInFlight.add(leadId);
        void generateNewsImage(lead.title)
            .then(generated => { if (generated) generatedNewsImages.set(leadId, generated); })
            .finally(() => newsImagesInFlight.delete(leadId));
    }
    return news;
};

const readDados = async (result: PromiseSettledResult<Response>): Promise<any[]> => {
    if (result.status !== 'fulfilled' || !result.value.ok) return [];
    try {
        const json = await result.value.json();
        return Array.isArray(json?.dados) ? json.dados : [];
    } catch {
        return [];
    }
};

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return withGeneratedImage(cachedNews);

    try {
        const buildFetchConfig = () => ({
            headers: { 'Accept': 'application/json' },
            cache: 'no-store' as RequestCache,
            signal: timeoutSignal(NEWS_FETCH_TIMEOUT_MS)
        });

        const dateStr = getBrazilDateString(30);

        const [votacoesRes, eventosRes, proposicoesRes] = await Promise.allSettled([
            fetch(getLegislativeApiUrl(`${BASE_URL_CAMARA}/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStr}&itens=5`), buildFetchConfig()),
            fetch(getLegislativeApiUrl(`${BASE_URL_CAMARA}/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=5`), buildFetchConfig()),
            fetch(getLegislativeApiUrl(`${BASE_URL_CAMARA}/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=10`), buildFetchConfig())
        ]);

        const combinedData: Array<{ key: string; article: NewsArticle }> = [];

        const createNewsObject = (item: any, type: 'voto' | 'evento' | 'proposicao', rawDateStr?: string): NewsArticle => {
            const parsedTime = rawDateStr ? new Date(rawDateStr).getTime() : NaN;
            const timestamp = Number.isNaN(parsedTime) ? undefined : parsedTime;
            // USA O NOVO GERADOR DE TÍTULOS JORNALÍSTICOS AQUI
            const title = generateJournalisticTitle(item.descricao || item.ementa || item.descricaoTipo, type);
            const smartImage = getSmartImage(title + " " + (item.descricao || ""));

            const voteProposition = type === 'voto' ? item.uriProposicaoObjeto?.split('/').pop() : undefined;
            const voteEvent = type === 'voto' ? item.uriEvento?.split('/').pop() : undefined;
            const url = type === 'evento'
                ? (item.id ? `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${item.id}` : 'https://www.camara.leg.br/eventos-sessoes-e-reunioes')
                : type === 'proposicao'
                    ? `https://www.camara.leg.br/propostas-legislativas/${item.id}`
                    : voteProposition
                        ? `https://www.camara.leg.br/propostas-legislativas/${voteProposition}`
                        : voteEvent
                            ? `https://www.camara.leg.br/eventos-sessoes-e-reunioes/evento/${voteEvent}`
                            : `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(item.descricao || '')}`;

            return {
                id: item.id ? item.id.toString() : generateId(),
                title: title,
                source: type === 'voto' ? (item.siglaOrgao || "Câmara dos Deputados") : type === 'evento' ? "Agenda" : "Protocolo",
                url,
                time: formatBrazilianDate(rawDateStr, { withYear: false }) || '',
                timestamp,
                summary: generateStructuredSummary(item.descricao || item.ementa || item.descricaoTipo, type),
                imageUrl: smartImage
            };
        };

        const sources: Array<[PromiseSettledResult<Response>, 'voto' | 'proposicao' | 'evento', string]> = [
            [votacoesRes, 'voto', 'dataHoraRegistro'],
            [proposicoesRes, 'proposicao', 'dataApresentacao'],
            [eventosRes, 'evento', 'dataHoraInicio']
        ];
        for (const [result, type, dateField] of sources) {
            const rows = await readDados(result);
            rows.forEach((d: any) => {
                const article = createNewsObject(d, type, d[dateField]);
                combinedData.push({ key: `${type}:${article.id}`, article });
            });
        }

        if (combinedData.length === 0) return getEmergencyNews();

        const uniqueMap = new Map<string, NewsArticle>();
        combinedData.forEach(({ key, article }) => uniqueMap.set(key, article));
        
        const sortedNews = Array.from(uniqueMap.values())
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 8);

        if (sortedNews.length === 0) return sortedNews;

        // Cache e histórico guardam só as imagens semânticas (URLs).
        setCache(NEWS_CACHE_KEY, sortedNews);
        saveToHistory(sortedNews);

        return withGeneratedImage(sortedNews);

    } catch (error: any) {
        console.warn("News Fetch Error:", error);
        return getEmergencyNews();
    }
};

export const speakContent = async (text: string): Promise<Uint8Array | null> => {
    try {
        const data = await callAiApi<{ audioBase64: string | null }>('speakContent', { text });
        const base64Audio = data?.audioBase64;
        if (base64Audio) {
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }
        return null;
    } catch (e) {
        return null;
    }
};

// ... Resto das funções auxiliares (getSearchContext, chatWithGemini, etc.) mantidas intactas ...
export const getSearchContext = async (query: string): Promise<AIResponse | null> => {
    try {
        const data = await callAiApi<AIResponse>('getSearchContext', { query });
        return data || null;
    } catch (error) { return null; }
};

export const chatWithGemini = async (message: string, mode: 'fast' | 'standard' | 'search' | 'location' | 'thinking', history: { role: string; parts: { text: string }[] }[] = []): Promise<{ text: string; searchSources?: any[]; mapSources?: any[] }> => {
    const data = await callAiApi<{ text: string; searchSources?: any[]; mapSources?: any[] }>('chatWithGemini', { message, mode, history });
    if (!data || typeof data.text !== 'string') throw new AiUnavailableError();
    return data;
};

export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const data = await callAiApi<{ imageDataUrl: string | null }>('generateCampaignImage', { prompt, aspectRatio });
        return data?.imageDataUrl || null;
    } catch (error) { return null; }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/webm'): Promise<string> => {
    try {
        const data = await callAiApi<{ text: string }>('transcribeAudio', { base64Audio, mimeType });
        return data?.text || "";
    } catch (error) { return ""; }
};

export const generateEducationalContent = async (): Promise<EducationalContentResult> => {
    const cached = getCachedEducationalContent();
    if (cached && cached.length > 0) return { articles: cached, isFallback: false };

    if (educationalContentInFlight) return educationalContentInFlight;

    const staticContent: GeneratedArticle[] = [
        {
            title: "O Orçamento Público",
            text: "O Orçamento Público estima as receitas e fixa as despesas do governo para um ano. É a lei que define onde seu dinheiro será gasto: saúde, educação, segurança.",
            topic: "Orçamento",
            legislation: "Art. 165 da Constituição Federal",
            impact: "Define a qualidade dos serviços públicos que você usa."
        },
        {
            title: "PEC vs Projeto de Lei",
            text: "PEC altera a Constituição e exige 3/5 dos votos. PL cria leis comuns e exige maioria simples. PECs mudam as regras do jogo; PLs jogam o jogo.",
            topic: "Legislação",
            legislation: "Art. 59 a 69 da CF/88",
            impact: "PECs geralmente trazem mudanças profundas e duradouras."
        },
        {
            title: "O Papel do STF",
            text: "O STF é o guardião da Constituição. Ele não cria leis, mas julga se as leis criadas pelo Congresso e atos do Presidente respeitam a Constituição.",
            topic: "Poder Judiciário",
            legislation: "Art. 101 da CF/88",
            impact: "Garante que seus direitos fundamentais não sejam violados."
        }
    ];

    educationalContentInFlight = (async () => {
        try {
            const data = await callAiApi<unknown[]>('generateEducationalContent');
            const articles = Array.isArray(data) ? data.filter(isValidArticle) : [];
            if (articles.length > 0) {
                setCachedEducationalContent(articles);
                return { articles, isFallback: false };
            }
        } catch {
            // IA indisponível: cai no conteúdo estático, que não é cacheado.
        }
        return { articles: staticContent, isFallback: true };
    })();

    try {
        return await educationalContentInFlight;
    } finally {
        educationalContentInFlight = null;
    }
};
