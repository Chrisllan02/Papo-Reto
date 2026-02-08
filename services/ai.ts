
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
// ATUALIZADO PARA V15 PARA GARANTIR NOVA POLÍTICA DE RETENÇÃO DE 1 MÊS
const NEWS_CACHE_KEY = 'paporeto_news_v15_fresh'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v3_ids'; 
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 1; // 1 Hora (Updates frequentes)

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
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(err) {
            console.error("Critical storage error", err);
        }
    }
};

const generateId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const STATIC_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1529101091760-6149d4c46b7d?q=80&w=800&auto=format&fit=crop", 
    "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?q=80&w=800&auto=format&fit=crop"
];

export interface AIResponse {
    text: string;
    sources: { web?: { uri: string; title: string }; maps?: { uri: string; title: string; source: string } }[];
}

export interface GeneratedArticle {
    title: string; text: string; topic: string; legislation?: string; impact?: string;
}

// --- MOTOR DE TRADUÇÃO LEGISLATIVA (DETERMINÍSTICO) ---

// 1. Dicionário de Títulos (Manchetes)
const TITLE_TRANSLATION_MAP: Array<{ regex: RegExp, template: string }> = [
    { regex: /aprovado o requerimento de urgência/i, template: "Votação Acelerada: Urgência Aprovada" },
    { regex: /mantido o texto/i, template: "Veto Preservado: Texto Original Mantido" },
    { regex: /rejeitado o texto/i, template: "Veto Derrubado: Congresso Altera a Lei" },
    { regex: /encaminhada à publicação/i, template: "Projeto Protocolado Oficialmente" },
    { regex: /aprovada a redação final/i, template: "Texto Final Aprovado na Câmara" },
    { regex: /designado relator/i, template: "Relator Escolhido para o Projeto" },
    { regex: /novo despacho/i, template: "Atualização no Processo Legislativo" },
    { regex: /retirado de pauta/i, template: "Votação Adiada: Retirado de Pauta" },
    { regex: /rejeitado o requerimento/i, template: "Proposta Negada pelo Plenário" },
    { regex: /aprovado o projeto/i, template: "Aprovado: Projeto Segue Tramitação" },
    { regex: /transformado na lei/i, template: "Sanção: Nova Lei em Vigor" }
];

function generateJournalisticTitle(rawText: string): string {
    if (!rawText) return "Movimentação no Congresso";
    const text = rawText.trim();

    // 1. Tenta encontrar um padrão exato
    for (const rule of TITLE_TRANSLATION_MAP) {
        if (rule.regex.test(text)) {
            return rule.template;
        }
    }

    // 2. Se não achar, tenta limpar e formatar o texto bruto
    let cleaned = text
        .replace(/^(Votação|Discussão|Apreciação) (única )?(em \w+ turno )?(d[oa]s? )?/i, "")
        .replace(/^Aprovação d[oa] /i, "")
        .replace(/Projeto de Lei n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Proposta de Emenda à Constituição n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Medida Provisória n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Requerimento n\.? ?\d+(\/\d+)?/i, "")
        .replace(/Parecer.*proferido.*/i, "")
        .replace(/ - \d{2}\/\d{2}\/\d{4}.*$/, "");

    // Extração do tema principal se possível
    const matchInstitui = cleaned.match(/(?:que|visando|para) (institui|cria|autoriza|obriga|concede|reconhece|altera|dispõe|regulamenta) (.*?)(?:;|\.|$)/i);
    if (matchInstitui) {
        cleaned = matchInstitui[2].trim();
    } else {
        cleaned = cleaned.split(/,|;/)[0]; // Pega até a primeira vírgula
    }

    // Capitalização e limite
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    if (cleaned.length > 55) cleaned = cleaned.substring(0, 52) + "...";

    return cleaned || "Atualização Legislativa";
}

// 2. Motor de Resumos (Contexto + Texto)
function generateStructuredSummary(rawText: string, type: 'voto' | 'evento' = 'voto'): { context: string, main: string } {
    const defaultResponse = {
        context: type === 'evento' ? "Agenda Oficial" : "Tramitação",
        main: rawText || "Detalhes não disponíveis no momento."
    };

    if (!rawText) return defaultResponse;
    const lowerText = rawText.toLowerCase();

    // Extração do "Assunto"
    let subject = rawText;
    const matchSubject = rawText.match(/(?:institui|cria|sobre|acerca d[eo]|referente [aà])\s+(.*?)(?:;|\.|,|$)/i);
    if (matchSubject && matchSubject[1]) {
        subject = matchSubject[1].trim();
    }
    subject = subject.replace(/n\.º? ?\d+(\/\d+)?/g, "").replace(/Dispõe sobre/i, "trata de");

    // Lógica para EVENTOS (Sessões)
    if (type === 'evento') {
        let context = "Atividade Legislativa";
        if (lowerText.includes('sessão deliberativa')) context = "Sessão no Plenário";
        else if (lowerText.includes('comissão')) context = "Debate em Comissão";
        else if (lowerText.includes('audiência')) context = "Audiência Pública";
        else if (lowerText.includes('solene')) context = "Sessão Solene";

        let explanation = `Ocorrência registrada na agenda oficial da Câmara: ${rawText}.`;
        if (lowerText.includes('cancelada')) explanation = "Esta sessão ou reunião foi cancelada da pauta do dia.";
        else if (lowerText.includes('convocada')) explanation = "Reunião convocada para debater pautas prioritárias.";
        
        return { context, main: explanation };
    }

    // Lógica para VOTAÇÕES
    let context = "Em Análise";
    let explanation = `O texto trata de: ${subject}.`;

    if (lowerText.includes('urgência')) {
        context = "Regime de Urgência";
        explanation = `Aprovação para acelerar o projeto sobre ${subject}, pulando etapas de comissões.`;
    } else if (lowerText.includes('medida provisória')) {
        context = "Medida Provisória";
        explanation = `Análise de norma presidencial com força de lei imediata sobre ${subject}.`;
    } else if (lowerText.includes('pec')) {
        context = "Mudança na Constituição";
        explanation = `Votação de Emenda Constitucional (PEC) sobre ${subject}. Exige quórum alto.`;
    } else if (lowerText.includes('aprovado')) {
        context = "Aprovado no Plenário";
        explanation = `Os deputados deram sinal verde para a proposta sobre ${subject}.`;
    }

    if (explanation.length > 200) explanation = explanation.substring(0, 197) + "...";

    return { context, main: explanation };
}

// Persistência Inteligente
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getNewsHistory();
        const existingSignatures = new Set(currentHistory.map(h => `${h.title}|${h.time}`));
        const uniqueNew = newArticles.filter(n => !existingSignatures.has(`${n.title}|${n.time}`));
        
        if (uniqueNew.length > 0) {
            const stampedNew = uniqueNew.map(n => ({ ...n, id: n.id || generateId() }));
            // AUMENTADO PARA 300 ITENS (Aprox. 1 Mês de Histórico com ~10 notícias/dia)
            const updatedHistory = [...stampedNew, ...currentHistory].slice(0, 300);
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        }
    } catch (e) { console.error("Erro ao salvar histórico", e); }
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
            summary: { context: "Atividade em Plenário", main: "Deputados debatem pautas prioritárias para o país em sessão deliberativa." },
            imageUrl: STATIC_FALLBACK_IMAGES[0] 
        },
        { 
            id: 'emergency-2',
            title: "Votações no Senado Federal", 
            source: "Agência Senado", 
            url: "https://www12.senado.leg.br", 
            time: "Hoje", 
            summary: { context: "Senado em Ação", main: "Senadores analisam medidas provisórias e projetos de lei em tramitação." },
            imageUrl: STATIC_FALLBACK_IMAGES[1] 
        }
    ];
}

// --- FETCH REAL API DATA (HÍBRIDO: VOTAÇÕES + EVENTOS) ---
export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    // 1. Tenta Cache
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return cachedNews;

    // Define local extended type to include rawDate for sorting
    type NewsArticleWithRaw = NewsArticle & { rawDate: number };

    try {
        // 2. Fetch Paralelo: Votações (Decisões) + Eventos (Atividade Recente)
        // Isso resolve o problema de dias sem votação parecerem que o app parou.
        // ADICIONADO: Cache busting com timestamp para evitar cache agressivo do navegador
        const timestamp = Date.now();
        const headers = { 'Accept': 'application/json' };
        // Configuração de fetch com no-store para garantir dados frescos
        const fetchConfig = { headers, cache: 'no-store' as RequestCache };

        const [votacoesRes, eventosRes] = await Promise.allSettled([
            fetch(`https://dadosabertos.camara.leg.br/api/v2/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro&itens=10&_t=${timestamp}`, fetchConfig),
            fetch(`https://dadosabertos.camara.leg.br/api/v2/eventos?ordem=DESC&ordenarPor=dataHoraInicio&itens=10&_t=${timestamp}`, fetchConfig)
        ]);

        let combinedData: NewsArticleWithRaw[] = [];

        // Processa Votações
        if (votacoesRes.status === 'fulfilled' && votacoesRes.value.ok) {
            const json = await votacoesRes.value.json();
            if (json.dados) {
                const votes: NewsArticleWithRaw[] = json.dados.map((item: any, index: number) => ({
                    id: item.id || generateId(),
                    rawDate: new Date(item.dataHoraRegistro).getTime(),
                    title: generateJournalisticTitle(item.descricao),
                    source: "Plenário",
                    url: `https://www.camara.leg.br/busca-portal?contexto=votacoes&q=${encodeURIComponent(item.descricao)}`,
                    time: new Date(item.dataHoraRegistro).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + new Date(item.dataHoraRegistro).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    summary: generateStructuredSummary(item.descricao, 'voto'),
                    imageUrl: STATIC_FALLBACK_IMAGES[index % STATIC_FALLBACK_IMAGES.length]
                }));
                combinedData = [...combinedData, ...votes];
            }
        }

        // Processa Eventos (Para dias sem votação)
        if (eventosRes.status === 'fulfilled' && eventosRes.value.ok) {
            const json = await eventosRes.value.json();
            if (json.dados) {
                const events: NewsArticleWithRaw[] = json.dados.map((item: any, index: number) => ({
                    id: item.id?.toString() || generateId(),
                    rawDate: new Date(item.dataHoraInicio).getTime(),
                    title: item.descricaoTipo || "Atividade na Câmara",
                    source: "Agenda",
                    url: `https://www.camara.leg.br/eventos-sessoes-e-reunioes`,
                    time: new Date(item.dataHoraInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + new Date(item.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    summary: generateStructuredSummary(item.descricao || item.descricaoTipo, 'evento'),
                    imageUrl: STATIC_FALLBACK_IMAGES[(index + 2) % STATIC_FALLBACK_IMAGES.length] // Offset images
                }));
                combinedData = [...combinedData, ...events];
            }
        }

        // 3. Ordenação e Deduplicação
        if (combinedData.length === 0) return getEmergencyNews();

        // Remove duplicatas por título exato
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.title + item.time, item])).values());

        // Ordena por data (mais recente primeiro) e pega os top 6
        const sortedNews = uniqueData
            .sort((a, b) => b.rawDate - a.rawDate)
            .slice(0, 6)
            .map(({ rawDate, ...item }) => item); // Remove propriedade auxiliar rawDate

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

export const generateNewsImage = async (headline: string): Promise<string | null> => {
    return null;
};

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
