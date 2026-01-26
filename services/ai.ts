
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../types';
import { db } from './db';

// Initialize GoogleGenAI strictly using process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Cache Utils para AI (Async com IndexedDB)
const NEWS_CACHE_KEY = 'paporeto_news_v12_daily_summary';
const NEWS_HISTORY_KEY = 'paporeto_news_history_v2';
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Horas
const EDU_CACHE_KEY = 'paporeto_edu_content_v4';
const EDU_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 dias

const getCache = async <T>(key: string, ttl: number): Promise<T | null> => {
    try {
        const item = await db.get<{ data: T, timestamp: number }>(key);
        if (!item) return null;
        if (ttl > 0 && Date.now() - item.timestamp > ttl) return null;
        return item.data;
    } catch (e) {
        return null;
    }
};

const setCache = async (key: string, data: any) => {
    try {
        await db.set(key, { data, timestamp: Date.now() });
    } catch (e) {
        console.warn('DB Error', e);
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const safeGenerateContent = async (model: string, params: any, retries = 3): Promise<any> => {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent({
                model,
                ...params
            });
            return response;
        } catch (error: any) {
            lastError = error;
            const isQuota = error.status === 429 || 
                            error.code === 429 || 
                            (error.message && error.message.includes('429')) ||
                            (error.message && error.message.includes('quota')) ||
                            (error.message && error.message.includes('RESOURCE_EXHAUSTED'));
            
            if (isQuota && i < retries - 1) {
                const delay = 2000 * Math.pow(2, i);
                console.warn(`[AI] Quota limite atingida. Tentando novamente em ${delay/1000}s... (Tentativa ${i+1}/${retries})`);
                await sleep(delay);
                continue;
            }
            throw error;
        }
    }
    throw lastError;
};

export interface AIResponse {
    text: string;
    sources: {
        web?: {
            uri: string;
            title: string;
        };
        maps?: {
            uri: string;
            title: string;
            source: string;
        };
    }[];
}

export interface GeneratedArticle {
    title: string;
    text: string;
    topic: string;
    legislation?: string;
    impact?: string;
}

export const speakContent = async (text: string): Promise<Uint8Array | null> => {
    try {
        const response = await safeGenerateContent("gemini-2.5-flash-preview-tts", {
            contents: [{ parts: [{ text: `Diga de forma clara e profissional: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        }, 1);
        
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

const saveToHistory = async (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = await getCache<NewsArticle[]>(NEWS_HISTORY_KEY, 0) || [];
        const thirtyDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 30);

        const validHistory = currentHistory.filter(h => {
            const ts = h.timestamp || Date.now();
            return ts > thirtyDaysAgo;
        });

        const newWithTs = newArticles.map(a => ({ ...a, timestamp: Date.now() }));
        const uniqueNew = newWithTs.filter(n => !validHistory.some(h => h.title === n.title));
        
        if (uniqueNew.length > 0) {
            const updatedHistory = [...uniqueNew, ...validHistory];
            await setCache(NEWS_HISTORY_KEY, updatedHistory);
        } else {
            if (validHistory.length !== currentHistory.length) {
                await setCache(NEWS_HISTORY_KEY, validHistory);
            }
        }
    } catch (e) {
        console.error("Erro ao salvar histórico", e);
    }
};

export const getNewsHistory = async (): Promise<NewsArticle[]> => {
    return await getCache<NewsArticle[]>(NEWS_HISTORY_KEY, 0) || [];
};

export const getBestAvailableNews = async (): Promise<NewsArticle[] | null> => {
    return await getCache<NewsArticle[]>(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
};

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    const cachedNews = await getCache<NewsArticle[]>(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) {
        return cachedNews;
    }

    try {
        const response = await safeGenerateContent('gemini-3-flash-preview', {
            contents: `Busque as 3 principais notícias políticas do Brasil de hoje (Congresso, Leis, Economia).
            
            REGRAS:
            - Use APENAS fontes oficiais ou veículos confiáveis.
            - Categorize cada notícia em: 'politica', 'economia', 'justica', 'social' ou 'mundo'.
            - Gere um 'summary' (resumo) CURTO de 1 frase (máx 30 palavras) explicando o impacto direto.
            - Evite aspas ou caracteres especiais que quebrem JSON.
            
            Formate a saída estritamente como um JSON Array.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            source: { type: Type.STRING },
                            url: { type: Type.STRING },
                            time: { type: Type.STRING },
                            category: { type: Type.STRING, enum: ['politica', 'economia', 'justica', 'social', 'mundo'] }
                        },
                        required: ["title", "summary", "source", "url", "time", "category"]
                    }
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty AI response");
        
        const data = JSON.parse(jsonStr) as NewsArticle[];
        
        if (data.length > 0) {
            await setCache(NEWS_CACHE_KEY, data);
            await saveToHistory(data);
        }

        return data;

    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
             console.warn("Gemini Quota Exceeded for News. Using fallback data to ensure UI stability.");
        } else {
             console.error("News Fetch Error:", error);
        }
        
        return [
            { 
                title: "Congresso Nacional define pautas da semana",
                summary: "Câmara e Senado organizam votações prioritárias. Acompanhe as sessões ao vivo para saber como os deputados estão votando.",
                source: "Agência Câmara", 
                url: "https://www.camara.leg.br", 
                time: "Hoje",
                category: "politica",
                timestamp: Date.now()
            },
            {
                title: "Novas diretrizes econômicas em debate",
                summary: "Equipe econômica discute metas fiscais. Mudanças podem impactar inflação e juros no curto prazo.",
                source: "Portal da Câmara",
                url: "https://www.camara.leg.br/noticias/",
                time: "Recente",
                category: "economia",
                timestamp: Date.now()
            }
        ];
    }
};

export const getNewsSummary = async (title: string, source: string): Promise<string> => {
    return "Resumo disponível no card."; 
};

export const chatWithGemini = async (
    message: string, 
    mode: 'fast' | 'standard' | 'search' | 'location' | 'thinking',
    history: { role: string; parts: { text: string }[] }[] = []
): Promise<{ text: string; searchSources?: any[]; mapSources?: any[] }> => {
    try {
        let model = 'gemini-3-pro-preview'; 
        let tools: any[] = [];
        let config: any = {};

        switch (mode) {
            case 'fast':
                model = 'gemini-flash-lite-latest';
                break;
            case 'search':
                model = 'gemini-3-flash-preview';
                tools = [{ googleSearch: {} }];
                break;
            case 'location':
                model = 'gemini-flash-latest';
                tools = [{ googleMaps: {} }];
                break;
            case 'thinking':
                model = 'gemini-3-pro-preview';
                config = { thinkingConfig: { thinkingBudget: 32768 } };
                break;
            case 'standard':
            default:
                model = 'gemini-3-pro-preview';
                break;
        }

        const contents = [
            ...history,
            { role: 'user', parts: [{ text: message }] }
        ];

        const response = await safeGenerateContent(model, {
            contents,
            config: {
                ...config,
                tools: tools.length > 0 ? tools : undefined
            }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchSources = groundingChunks
            .filter((c: any) => c.web)
            .map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
        
        const mapSources = groundingChunks
            .filter((c: any) => c.maps)
            .map((c: any) => ({ 
                uri: c.maps.uri, 
                title: c.maps.title,
                source: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.snippet || "Localização Google Maps"
            }));

        return { 
            text: response.text || "Sem resposta.", 
            searchSources, 
            mapSources 
        };

    } catch (error: any) {
        console.error("Chat Error:", error);
        if (error.message?.includes('429') || error.status === 429) {
             return { text: "⚠️ O sistema de inteligência está sobrecarregado no momento (Cota Excedida). Por favor, aguarde alguns instantes e tente novamente." };
        }
        return { text: "Erro ao processar sua mensagem. Tente novamente." };
    }
};

export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const response = await safeGenerateContent('gemini-2.5-flash-image', {
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio as any, 
                }
            }
        });

        if (response.candidates && response.candidates[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (error: any) {
        console.error("Image Gen Error:", error);
        return null;
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string = 'audio/webm'): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Audio
                        }
                    },
                    { text: "Transcreva este áudio exatamente como foi falado." }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Audio Transcription Error:", error);
        return "";
    }
};

export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    const cached = await getCache<GeneratedArticle[]>(EDU_CACHE_KEY, EDU_CACHE_TTL);
    if (cached) return cached;

    try {
        const response = await safeGenerateContent('gemini-3-flash-preview', {
            contents: `Atue como um Professor de Direito Constitucional e Cidadania.
            Gere 3 artigos educativos curtos e diretos sobre temas fundamentais da política brasileira e Direitos do Cidadão.
            
            REGRAS DE FORMATACAO JSON:
            - SEJA CONCISO E DIRETO. Maximo 2 parágrafos curtos por texto.
            - NUNCA use aspas duplas (") dentro dos valores de texto. Use aspas simples (') se necessário.
            - O JSON deve ser válido.

            Temas sugeridos: Orçamento Público, Tramitação de Leis, Funções do STF, O que faz um Deputado, Direitos do Consumidor.

            Formato JSON Estrito:
            [
              {
                "title": "Título chamativo",
                "text": "Explicação didática e BREVE (máx 40 palavras). Linguagem simples.",
                "topic": "Categoria (ex: Legislação, Orçamento, Cidadania)",
                "legislation": "Artigo da Constituição ou Lei relacionada (ex: Art. 5º da CF/88)",
                "impact": "Como isso afeta a vida prática do cidadão (1 frase)."
              }
            ]`,
            config: {
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            text: { type: Type.STRING },
                            topic: { type: Type.STRING },
                            legislation: { type: Type.STRING },
                            impact: { type: Type.STRING }
                        },
                        required: ["title", "text", "topic"]
                    }
                }
            }
        });
        let jsonStr = response.text?.trim();
        if (!jsonStr) return [];
        
        // Remove markdown formatting if present
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const data = JSON.parse(jsonStr) as GeneratedArticle[];
        
        if (data.length > 0) await setCache(EDU_CACHE_KEY, data);
        return data;

    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
             console.warn("Gemini Quota Exceeded for Education. Using fallback data.");
        } else {
             console.error("Educational Content Gen Error:", error);
        }
        
        return [
            {
                title: "Entenda a Tramitação de Leis",
                text: "Projetos de lei passam por comissões e plenário antes de virarem lei. É um processo que garante debate e transparência. Se aprovado nas duas casas, segue para sanção presidencial.",
                topic: "Legislação",
                legislation: "CF/88 Art. 61",
                impact: "Garante que novas regras sejam discutidas antes de valerem para você."
            },
            {
                title: "Para onde vai seu imposto?",
                text: "O Orçamento da União define os gastos em saúde, educação e segurança. O Congresso pode alterar a proposta do Presidente através de emendas.",
                topic: "Orçamento",
                legislation: "CF/88 Art. 165",
                impact: "Define a qualidade dos serviços públicos que você usa."
            },
            {
                title: "O Papel do Deputado",
                text: "Eles fiscalizam o Executivo e criam leis. Não podem executar obras, mas podem destinar verbas para municípios através de emendas parlamentares.",
                topic: "Cidadania",
                legislation: "CF/88 Art. 49",
                impact: "Eles representam sua voz e seus interesses em Brasília."
            }
        ];
    }
};
