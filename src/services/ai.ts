
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../../types';

// --- CONFIGURAÇÃO SEGURA DO CLIENTE AI ---
// Inicialização Lazy: Só cria a instância quando for usada.
// Isso evita que o app quebre (Tela Branca) se a API_KEY estiver faltando na inicialização.
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

// Cache Utils para AI
const NEWS_CACHE_KEY = 'paporeto_news_v8_daily'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v1';
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Horas

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

// Fallback de Imagens de Alta Qualidade
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

// --- GERAÇÃO DE VOZ ---
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
        console.error("Erro no TTS Gemini:", e);
        return null;
    }
};

export const generateNewsImage = async (headline: string): Promise<string | null> => {
    const ai = getAi();
    if (!ai) return null;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: {
                parts: [{ text: `Fotojornalismo profissional, estilo editorial de revista...: '${headline}'.` }]
            },
            config: { imageConfig: { aspectRatio: "16:9" } }
        });
        
        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e: any) {
        if (!e.message?.includes('429')) console.warn("Falha na geração de imagem:", e.message);
        return null;
    }
};

const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getCache(NEWS_HISTORY_KEY, 0) as NewsArticle[] || [];
        const uniqueNew = newArticles.filter(n => !currentHistory.some(h => h.title === n.title));
        if (uniqueNew.length > 0) {
            const updatedHistory = [...uniqueNew, ...currentHistory].slice(0, 50);
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        }
    } catch (e) { console.error("Erro ao salvar histórico", e); }
};

export const getNewsHistory = (): NewsArticle[] => getCache(NEWS_HISTORY_KEY, 0) || [];
export const getBestAvailableNews = (): NewsArticle[] | null => getCache(NEWS_CACHE_KEY, 0);

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return cachedNews;

    const ai = getAi();
    // Fallback imediato se não houver AI configurada
    if (!ai) return createEmergencyNews();

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Busque as 3 principais notícias políticas do Brasil de hoje...`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                maxOutputTokens: 2000,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            source: { type: Type.STRING },
                            url: { type: Type.STRING },
                            time: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            imageUrl: { type: Type.STRING }
                        },
                        required: ["title", "source", "url", "time", "summary"]
                    }
                }
            }
        });

        let jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty AI response");
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        else if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');

        const data = JSON.parse(jsonStr) as NewsArticle[];
        const enrichedData = await Promise.all(data.map(async (item, index) => {
            let img = null;
            if (index < 3) {
                try {
                    img = await Promise.race([generateNewsImage(item.title), new Promise<string | null>(r => setTimeout(() => r(null), 6000))]);
                } catch (e) { console.warn(`Image skip for ${item.title}`); }
            }
            if (!img) img = STATIC_FALLBACK_IMAGES[index % STATIC_FALLBACK_IMAGES.length];
            return { ...item, imageUrl: img };
        }));

        if (enrichedData.length > 0) {
            setCache(NEWS_CACHE_KEY, enrichedData);
            saveToHistory(enrichedData);
        }
        return enrichedData;

    } catch (error: any) {
        console.warn("News Fetch Error or Quota:", error);
        return createEmergencyNews();
    }
};

function createEmergencyNews() {
    return [
        { title: "Sessão Deliberativa na Câmara", source: "Agência Câmara", url: "https://www.camara.leg.br", time: "Hoje", summary: "Deputados debatem pautas prioritárias.", imageUrl: STATIC_FALLBACK_IMAGES[0] },
        { title: "Votações no Senado", source: "Agência Senado", url: "https://www12.senado.leg.br", time: "Hoje", summary: "Senadores analisam medidas provisórias.", imageUrl: STATIC_FALLBACK_IMAGES[1] },
        { title: "Pauta Econômica", source: "Portal da Câmara", url: "https://www.camara.leg.br/noticias/", time: "Recente", summary: "Discussões sobre orçamento.", imageUrl: STATIC_FALLBACK_IMAGES[2] }
    ];
}

export const getNewsSummary = async (title: string, source: string): Promise<string> => {
    const ai = getAi();
    if (!ai) return "Resumo indisponível (Erro de conexão).";

    const summaryKey = `news_summary_${btoa(title).slice(0, 20)}`;
    const cached = getCache(summaryKey, NEWS_CACHE_TTL);
    if (cached) return cached;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resumo detalhado sobre: "${title}" (${source})...`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const text = response.text || "Resumo indisponível.";
        setCache(summaryKey, text);
        return text;
    } catch (error) {
        return "Resumo indisponível.";
    }
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
        if (error.message?.includes('429')) return { text: "⚠️ Cota excedida. Tente novamente em breve." };
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

export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    const ai = getAi();
    
    // Conteúdo estático de fallback em caso de falha da API
    const staticContent: GeneratedArticle[] = [
        {
            title: "O Orçamento Público",
            text: "O Orçamento Público estima as receitas e fixa as despesas do governo para um ano. É a lei que define onde seu dinheiro será gasto: saúde, educação, segurança. Sem ele, o governo não pode funcionar.",
            topic: "Orçamento",
            legislation: "Art. 165 da Constituição Federal",
            impact: "Define a qualidade dos serviços públicos que você usa."
        },
        {
            title: "PEC vs Projeto de Lei",
            text: "PEC (Proposta de Emenda à Constituição) altera a Constituição e exige 3/5 dos votos em dois turnos. PL (Projeto de Lei) cria leis comuns e exige maioria simples. PECs mudam as regras do jogo; PLs jogam o jogo.",
            topic: "Legislação",
            legislation: "Art. 59 a 69 da CF/88",
            impact: "PECs geralmente trazem mudanças profundas e duradouras."
        },
        {
            title: "O Papel do STF",
            text: "O Supremo Tribunal Federal é o guardião da Constituição. Ele não cria leis, mas julga se as leis criadas pelo Congresso e atos do Presidente respeitam a Constituição. É a última instância da Justiça.",
            topic: "Poder Judiciário",
            legislation: "Art. 101 da CF/88",
            impact: "Garante que seus direitos fundamentais não sejam violados."
        }
    ];

    if (!ai) return staticContent;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Atue como um Professor de Direito Constitucional.
            Gere 3 artigos educativos curtos e diretos sobre política brasileira.
            
            REGRAS RÍGIDAS:
            - Texto deve ter NO MÁXIMO 60 palavras.
            - Linguagem simples.
            - Retorne APENAS o JSON válido.

            Temas sugeridos: Orçamento Público, Tramitação de Leis, STF, Papel do Deputado.`,
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
        
        try {
            return JSON.parse(jsonStr) as GeneratedArticle[];
        } catch (e) {
            console.warn("JSON Parse Error in Ed Content, attempting fix", e);
            const lastBracket = jsonStr.lastIndexOf(']');
            if (lastBracket !== -1) {
                try {
                    const fixedStr = jsonStr.substring(0, lastBracket + 1);
                    return JSON.parse(fixedStr) as GeneratedArticle[];
                } catch (e2) {
                    return staticContent;
                }
            }
            return staticContent;
        }
    } catch (error: any) { 
        // 429 Error Handling
        if (error.message?.includes('429') || error.status === 429 || error.message?.includes('RESOURCE_EXHAUSTED')) {
            console.warn("Educational Content: Quota exceeded (429), using static fallback.");
        } else {
            console.error("Educational Content Gen Error:", error);
        }
        return staticContent; 
    }
};
