
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../types';

// --- CONFIGURAÇÃO SEGURA DO CLIENTE AI ---
let aiClient: GoogleGenAI | null = null;

const getAi = () => {
    if (aiClient) return aiClient;
    
    const key = process.env.API_KEY;
    if (!key || key.trim() === "") {
        console.warn("Aviso: API_KEY do Google Gemini não encontrada. Funcionalidades de IA usarão fallback.");
        return null;
    }
    
    try {
        aiClient = new GoogleGenAI({ apiKey: key });
        return aiClient;
    } catch (e) {
        console.error("Erro ao inicializar GoogleGenAI:", e);
        return null;
    }
};

// Cache Utils
const NEWS_CACHE_KEY = 'paporeto_news_v21_journalistic'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v5_ids'; 
const NEWS_CACHE_TTL = 1000 * 60 * 5; // 5 Minutos

const getCache = (key: string, ttl: number) => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const { data, timestamp } = JSON.parse(item);
        if (ttl > 0 && Date.now() - timestamp > ttl) return null;
        return data;
    } catch (e) {
        return null;
    }
};

const setCache = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Cache full, clearing old keys');
        try {
            localStorage.removeItem('paporeto_img_cache_v2'); 
            localStorage.removeItem('paporeto_news_v20_dynamic'); 
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(err) {
            console.error("Critical storage error", err);
        }
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

const getSmartImage = (text: string): string => {
    const t = text.toLowerCase();
    if (t.match(/economia|orçamento|gasto|dinheiro|tribut|imposto|finança|dólar|bolsa/)) return SEMANTIC_IMAGES_MAP.economy;
    if (t.match(/saúde|médico|hospital|doença|vacina|sus|pandemia/)) return SEMANTIC_IMAGES_MAP.health;
    if (t.match(/educação|escola|ensino|aluno|universidade|professor/)) return SEMANTIC_IMAGES_MAP.education;
    if (t.match(/segurança|polícia|crime|armas|violência|prisão/)) return SEMANTIC_IMAGES_MAP.security;
    if (t.match(/ambiente|floresta|clima|água|natureza|sustent|amazônia/)) return SEMANTIC_IMAGES_MAP.environment;
    if (t.match(/tecnologia|internet|digital|inovação|rede social|ia|cyber/)) return SEMANTIC_IMAGES_MAP.tech;
    if (t.match(/justiça|lei|stf|julgamento|direito|tribunal|jurídico/)) return SEMANTIC_IMAGES_MAP.justice;
    if (t.match(/congresso|câmara|senado|plenário|parlamentar|deputado|política/)) return SEMANTIC_IMAGES_MAP.congress;
    return SEMANTIC_IMAGES_MAP.brazil;
};

export interface AIResponse {
    text: string;
    sources: { web?: { uri: string; title: string }; maps?: { uri: string; title: string; source: string } }[];
}

export interface GeneratedArticle {
    title: string; text: string; topic: string; legislation?: string; impact?: string;
}

// --- MOTOR DE TRADUÇÃO JORNALÍSTICA (REGEX) ---
const TITLE_RULES: Array<{ regex: RegExp, template: string }> = [
    { regex: /oitivas? de testemunhas?/i, template: "CPI: Depoimento de Testemunhas" },
    { regex: /e votação de propostas/i, template: "Comissão: Votação de Projetos" },
    { regex: /audiência pública/i, template: "Debate Público na Câmara" },
    { regex: /reunião deliberativa/i, template: "Comissão: Votação de Pauta" },
    { regex: /sessão deliberativa/i, template: "Plenário: Decisão sobre Leis" },
    { regex: /seminário/i, template: "Seminário Legislativo" },
    { regex: /aprovado o requerimento de urgência/i, template: "Urgência Aprovada: Votação Acelerada" },
    { regex: /mantido o texto/i, template: "Veto Preservado: Lei Mantida" },
    { regex: /rejeitado o texto/i, template: "Veto Derrubado: Lei Alterada" },
    { regex: /encaminhada à publicação/i, template: "Projeto Protocolado Oficialmente" },
    { regex: /aprovada a redação final/i, template: "Texto Final Aprovado na Câmara" },
    { regex: /designado relator/i, template: "Relator Escolhido para o Projeto" },
    { regex: /novo despacho/i, template: "Nova Fase na Tramitação" },
    { regex: /retirado de pauta/i, template: "Votação Adiada: Retirado de Pauta" },
    { regex: /rejeitado o requerimento/i, template: "Proposta Negada pelo Plenário" },
    { regex: /aprovado o projeto/i, template: "Aprovado: Projeto Segue" },
    { regex: /transformado na lei/i, template: "Sanção: Nova Lei em Vigor" }
];

function generateJournalisticTitle(rawText: string, type: 'voto' | 'evento' | 'proposicao' = 'voto'): string {
    if (!rawText) return "Movimentação no Congresso";
    const text = rawText.trim();

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
        else if (lowerText.includes('oitiva')) context = "Investigação/CPI";

        let explanation = rawText;
        if (lowerText.includes('oitiva')) explanation = "Deputados ouvem testemunhas e investigados em comissão.";
        else if (lowerText.includes('cancelada')) explanation = "Esta sessão ou reunião foi cancelada da pauta do dia.";
        else if (lowerText.includes('convocada')) explanation = "Reunião convocada para debater pautas prioritárias.";
        else explanation = subject.length > 10 ? `Na pauta: ${subject}` : rawText;
        
        return { context, main: explanation };
    }

    if (type === 'proposicao') {
        let context = "Projeto de Lei";
        if (lowerText.includes('pec')) context = "Proposta Constitucional";
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
        explanation = `Aprovação para acelerar o projeto, pulando etapas de comissões.`;
    } else if (lowerText.includes('medida provisória')) {
        context = "Medida Provisória";
        explanation = `Análise de norma presidencial com força de lei imediata.`;
    } else if (lowerText.includes('pec')) {
        context = "Mudança na Constituição";
        explanation = `Votação de Emenda Constitucional (PEC). Exige quórum alto.`;
    } else if (lowerText.includes('aprovado')) {
        context = "Aprovado no Plenário";
        explanation = `Os deputados deram sinal verde para a proposta.`;
    }

    if (explanation.length > 200) explanation = explanation.substring(0, 197) + "...";

    return { context, main: explanation };
}

// --- GESTÃO DE HISTÓRICO ---
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getNewsHistory();
        let allArticles = [...newArticles, ...currentHistory];

        const seenSignatures = new Set();
        allArticles = allArticles.filter(item => {
            if (!item.title) return false;
            if (item.id && item.id.startsWith('emergency-')) return false;
            const sig = `${item.title.trim()}|${item.time.trim()}`;
            if (seenSignatures.has(sig)) return false;
            seenSignatures.add(sig);
            return true;
        });

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        allArticles = allArticles.filter(item => {
            if (item.timestamp) return (now - item.timestamp) < THIRTY_DAYS_MS;
            return true;
        });

        allArticles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setCache(NEWS_HISTORY_KEY, allArticles.slice(0, 300));
    } catch (e) { console.error("Erro crítico ao salvar histórico", e); }
};

export const getNewsHistory = (): NewsArticle[] => {
    const raw = getCache(NEWS_HISTORY_KEY, 0); 
    if (!Array.isArray(raw)) return [];
    return raw.filter(item => item && typeof item.title === 'string');
};

export const clearNewsHistory = (): void => {
    try { localStorage.removeItem(NEWS_HISTORY_KEY); } catch (e) { console.error(e); }
};

export const getBestAvailableNews = (): NewsArticle[] | null => getCache(NEWS_CACHE_KEY, 0);

export function getEmergencyNews(): NewsArticle[] {
    return [
        { 
            id: 'emergency-1',
            title: "Sessão Deliberativa na Câmara", 
            source: "Agência Câmara", 
            url: "https://www.camara.leg.br", 
            time: "Hoje", 
            timestamp: Date.now(),
            summary: { context: "Atividade em Plenário", main: "Deputados debatem pautas prioritárias para o país em sessão deliberativa." },
            imageUrl: SEMANTIC_IMAGES_MAP.congress 
        },
        { 
            id: 'emergency-2',
            title: "Votações no Senado Federal", 
            source: "Agência Senado", 
            url: "https://www12.senado.leg.br", 
            time: "Hoje", 
            timestamp: Date.now(),
            summary: { context: "Senado em Ação", main: "Senadores analisam medidas provisórias e projetos de lei em tramitação." },
            imageUrl: SEMANTIC_IMAGES_MAP.brazil
        }
    ];
}

// --- GERAÇÃO DE IMAGEM DE NOTÍCIA (GOOGLE GEMINI) ---
export const generateNewsImage = async (headline: string): Promise<string | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const prompt = `Create a high-quality abstract 3D isometric editorial illustration for a news article titled: "${headline}".
        Style: Minimalist, Corporate Memphis 3D, Political symbolism.
        Mandatory Constraints: NO TEXT, NO HUMAN FACES, NO REALISTIC PEOPLE, NO CROWDS.
        Colors: Professional palette inspired by Brazil (Deep Green, Navy Blue, Golden Yellow, White, Grey).
        Composition: Clean background, single central subject (e.g. 3D gavel, document, stylized building, chart, abstract shapes).`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
        });
        
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        return null;
    }
};

// --- FETCH REAL API DATA ---
export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return cachedNews;

    try {
        const headers = { 'Accept': 'application/json' };
        const fetchConfig = { headers, cache: 'no-store' as RequestCache };

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - 30);
        const dateStr = dateLimit.toISOString().split('T')[0];

        const [votacoesRes, eventosRes, proposicoesRes] = await Promise.allSettled([
            fetch(`https://dadosabertos.camara.leg.br/api/v2/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&dataInicio=${dateStr}&itens=5`, fetchConfig),
            fetch(`https://dadosabertos.camara.leg.br/api/v2/eventos?ordem=DESC&ordenarPor=dataHoraInicio&dataInicio=${dateStr}&itens=5`, fetchConfig),
            fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?ordem=DESC&ordenarPor=id&dataApresentacaoInicio=${dateStr}&itens=10`, fetchConfig)
        ]);

        let combinedData: NewsArticle[] = [];

        const createNewsObject = (item: any, type: 'voto' | 'evento' | 'proposicao', rawDateStr: string): NewsArticle => {
            const dateObj = new Date(rawDateStr);
            // USA O NOVO GERADOR DE TÍTULOS JORNALÍSTICOS AQUI
            const title = generateJournalisticTitle(item.descricao || item.ementa || item.descricaoTipo, type);
            const smartImage = getSmartImage(title + " " + (item.descricao || ""));

            return {
                id: item.id ? item.id.toString() : generateId(),
                title: title,
                source: type === 'voto' ? "Plenário" : type === 'evento' ? "Agenda" : "Protocolo",
                url: type === 'evento' 
                    ? `https://www.camara.leg.br/eventos-sessoes-e-reunioes` 
                    : (type === 'proposicao' ? `https://www.camara.leg.br/propostas-legislativas/${item.id}` : `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(item.descricao)}`),
                time: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                timestamp: dateObj.getTime(),
                summary: generateStructuredSummary(item.descricao || item.ementa || item.descricaoTipo, type),
                imageUrl: smartImage
            };
        };

        if (votacoesRes.status === 'fulfilled' && votacoesRes.value.ok) {
            const json = await votacoesRes.value.json();
            if (json.dados) combinedData.push(...json.dados.map((d: any) => createNewsObject(d, 'voto', d.dataHoraRegistro)));
        }

        if (proposicoesRes.status === 'fulfilled' && proposicoesRes.value.ok) {
            const json = await proposicoesRes.value.json();
            if (json.dados) combinedData.push(...json.dados.map((d: any) => createNewsObject(d, 'proposicao', d.dataApresentacao || new Date().toISOString())));
        }

        if (eventosRes.status === 'fulfilled' && eventosRes.value.ok) {
            const json = await eventosRes.value.json();
            if (json.dados) combinedData.push(...json.dados.map((d: any) => createNewsObject(d, 'evento', d.dataHoraInicio)));
        }

        if (combinedData.length === 0) return getEmergencyNews();

        const uniqueMap = new Map();
        combinedData.forEach(item => uniqueMap.set(item.title + item.time, item));
        
        const sortedNews = Array.from(uniqueMap.values())
            .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 8);

        if (sortedNews.length > 0) {
            const topNews = sortedNews[0];
            if (!topNews.imageUrl?.startsWith('data:image')) {
                try {
                    const generatedImage = await generateNewsImage(topNews.title);
                    if (generatedImage) topNews.imageUrl = generatedImage;
                } catch (err) { }
            }
        }

        setCache(NEWS_CACHE_KEY, sortedNews);
        saveToHistory(sortedNews);
        return sortedNews;

    } catch (error: any) {
        console.warn("News Fetch Error:", error);
        return getEmergencyNews();
    }
};

export const speakContent = async (text: string): Promise<Uint8Array | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Diga de forma clara e profissional: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
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
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Pesquise sobre: "${query}"...`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks.map((c: any) => ({ web: c.web ? { uri: c.web.uri, title: c.web.title } : undefined })).filter((s: any) => s.web);
        return { text: response.text || "Sem resumo.", sources: sources };
    } catch (error) { return null; }
};

export const chatWithGemini = async (message: string, mode: 'fast' | 'standard' | 'search' | 'location' | 'thinking', history: { role: string; parts: { text: string }[] }[] = []): Promise<{ text: string; searchSources?: any[]; mapSources?: any[] }> => {
    const ai = getAi();
    if (!ai) return { text: "⚠️ Sistema offline. Verifique a API Key." };
    try {
        let model = 'gemini-3-pro-preview'; 
        let tools: any[] = [];
        let config: any = {};
        switch (mode) {
            case 'fast': model = 'gemini-flash-lite-latest'; break;
            case 'search': model = 'gemini-3-flash-preview'; tools = [{ googleSearch: {} }]; break;
            case 'location': model = 'gemini-flash-latest'; tools = [{ googleMaps: {} }]; break;
            case 'thinking': model = 'gemini-3-pro-preview'; config = { thinkingConfig: { thinkingBudget: 32768 } }; break;
        }
        const contents = [...history, { role: 'user', parts: [{ text: message }] }];
        const response = await ai.models.generateContent({ model, contents, config: { ...config, tools: tools.length > 0 ? tools : undefined } });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchSources = groundingChunks.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
        const mapSources = groundingChunks.filter((c: any) => c.maps).map((c: any) => ({ uri: c.maps.uri, title: c.maps.title, source: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.snippet || "Localização" }));
        return { text: response.text || "Sem resposta.", searchSources, mapSources };
    } catch (error: any) {
        if (checkQuotaError(error)) return { text: "⚠️ Limite de uso da IA atingido." };
        return { text: "Erro ao processar mensagem." };
    }
};

export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    const ai = getAi();
    if (!ai) return null;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (error) { return null; }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/webm'): Promise<string> => {
    const ai = getAi();
    if (!ai) return "";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcreva o áudio." }] }
        });
        return response.text || "";
    } catch (error) { return ""; }
};

const checkQuotaError = (error: any): boolean => {
    if (!error) return false;
    if (error.status === 429 || error.code === 429) return true;
    if (error.error && (error.error.code === 429 || error.error.status === 'RESOURCE_EXHAUSTED')) return true;
    const msg = error.message || JSON.stringify(error);
    return msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota');
};

export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    const ai = getAi();
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
    if (!ai) return staticContent;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Atue como um Professor de Direito Constitucional. Gere 3 artigos educativos curtos e diretos sobre política brasileira. Regras: Máximo 60 palavras, linguagem simples, JSON.`,
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: 4000, 
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { title: { type: Type.STRING }, text: { type: Type.STRING }, topic: { type: Type.STRING }, legislation: { type: Type.STRING }, impact: { type: Type.STRING } },
                        required: ["title", "text", "topic"]
                    }
                }
            }
        });
        let jsonStr = response.text?.trim();
        if (!jsonStr) return staticContent;
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        try { return JSON.parse(jsonStr) as GeneratedArticle[]; } catch (e) { return staticContent; }
    } catch (error: any) { return staticContent; }
};
