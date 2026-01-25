
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../types';

// Fix: Always initialize GoogleGenAI strictly using process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Cache Utils para AI
const NEWS_CACHE_KEY = 'paporeto_news_v9_daily_summary';
const NEWS_HISTORY_KEY = 'paporeto_news_history_v2';
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Horas de Cache para o "Destaque do Dia"

const EDU_CACHE_KEY = 'paporeto_edu_content_v1';
const EDU_CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 dias (Conteúdo Educativo é estático)

const getCache = (key: string, ttl: number) => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const { data, timestamp } = JSON.parse(item);
        // Se TTL for 0, é infinito (para histórico)
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
        console.warn('Cache full, attempting cleanup');
        try {
            localStorage.removeItem('paporeto_news_v8_daily'); // Remove chaves antigas
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(err) {
            console.error("Critical storage error", err);
        }
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper com Retry para Quota (429)
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
                const delay = 2000 * Math.pow(2, i); // 2s, 4s, 8s
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

// --- GERAÇÃO DE VOZ ACESSÍVEL (TTS) ---
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
        }, 1); // TTS retries less often as it's user initiated
        
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

// Funçao Auxiliar para salvar no Histórico (Com limpeza automática de 30 dias)
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getCache(NEWS_HISTORY_KEY, 0) as NewsArticle[] || [];
        const thirtyDaysAgo = Date.now() - (1000 * 60 * 60 * 24 * 30);

        // 1. Remove duplicatas (baseado no título)
        // 2. Remove itens mais antigos que 30 dias
        // 3. Adiciona timestamp se não tiver
        
        const validHistory = currentHistory.filter(h => {
            const ts = h.timestamp || Date.now();
            return ts > thirtyDaysAgo;
        });

        const newWithTs = newArticles.map(a => ({ ...a, timestamp: Date.now() }));
        const uniqueNew = newWithTs.filter(n => !validHistory.some(h => h.title === n.title));
        
        if (uniqueNew.length > 0) {
            const updatedHistory = [...uniqueNew, ...validHistory];
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        } else {
            // Apenas atualiza a limpeza de velhos se não houver novos
            if (validHistory.length !== currentHistory.length) {
                setCache(NEWS_HISTORY_KEY, validHistory);
            }
        }
    } catch (e) {
        console.error("Erro ao salvar histórico", e);
    }
};

export const getNewsHistory = (): NewsArticle[] => {
    return getCache(NEWS_HISTORY_KEY, 0) || [];
};

export const getBestAvailableNews = (): NewsArticle[] | null => {
    return getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
};

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    // 1. Cache Check (Daily)
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) {
        return cachedNews;
    }

    try {
        // 2. Single Gemini Call with Retry
        const response = await safeGenerateContent('gemini-3-flash-preview', {
            contents: `Busque as 3 principais notícias políticas do Brasil de hoje (Congresso, Leis, Economia).
            
            REGRAS:
            - Use APENAS fontes oficiais ou veículos confiáveis.
            - Categorize cada notícia em: 'politica', 'economia', 'justica', 'social' ou 'mundo'.
            - Gere um 'summary' (resumo) de 2 frases explicando o impacto para o cidadão comum.
            
            Formate a saída estritamente como um JSON Array.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
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
        
        // Parse sem necessidade de pós-processamento de imagem
        const data = JSON.parse(jsonStr) as NewsArticle[];
        
        if (data.length > 0) {
            setCache(NEWS_CACHE_KEY, data);
            saveToHistory(data);
        }

        return data;

    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
             console.warn("Gemini Quota Exceeded for News. Using fallback data to ensure UI stability.");
        } else {
             console.error("News Fetch Error:", error);
        }
        
        // Fallback robusto com design system
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

// Mantido para compatibilidade, mas o NewsTicker principal não usa mais isso
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

        // Chat typically uses safeGenerateContent but since it's interactive, we might want immediate feedback
        // However, retrying is better than crashing.
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
        const response = await safeGenerateContent('gemini-3-flash-preview', {
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
    // 1. Cache Check
    const cached = getCache(EDU_CACHE_KEY, EDU_CACHE_TTL);
    if (cached) return cached;

    try {
        // Reduzido para 3 artigos e solicitado concisão para evitar erro de JSON cortado
        const response = await safeGenerateContent('gemini-3-flash-preview', {
            contents: `Atue como um Professor de Direito Constitucional e Cidadania.
            Gere 3 artigos educativos curtos e diretos sobre temas fundamentais da política brasileira e Direitos do Cidadão.
            
            Temas sugeridos (variar): Orçamento Público, Tramitação de Leis (PEC vs PL), Funções do STF, O que faz um Deputado, Direitos do Consumidor, Reforma Tributária.

            Formato JSON Estrito:
            [
              {
                "title": "Título chamativo",
                "text": "Explicação didática de 2 parágrafos (máx 100 palavras). Linguagem simples.",
                "topic": "Categoria (ex: Legislação, Orçamento, Cidadania)",
                "legislation": "Artigo da Constituição ou Lei relacionada (ex: Art. 5º da CF/88)",
                "impact": "Como isso afeta a vida prática do cidadão (1 frase)."
              }
            ]`,
            config: {
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
        const jsonStr = response.text?.trim();
        if (!jsonStr) return [];
        const data = JSON.parse(jsonStr) as GeneratedArticle[];
        
        // Cache on success
        if (data.length > 0) setCache(EDU_CACHE_KEY, data);
        return data;

    } catch (error: any) {
        if (error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
             console.warn("Gemini Quota Exceeded for Education. Using fallback data.");
        } else {
             console.error("Educational Content Gen Error:", error);
        }
        
        // Fallback content in case of error (Extended to 3 items for UI balance)
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
