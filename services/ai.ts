import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../types';

// Inicialização segura
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const NEWS_CACHE_KEY = 'paporeto_news_v8_daily'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v1';
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 24; 

const THEMATIC_IMAGE_BANK: Record<string, string[]> = {
    congresso: [
        "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?q=80&w=800&auto=format&fit=crop", 
        "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=800&auto=format&fit=crop"
    ],
    justica: [
        "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1529101091760-6149d4c46b7d?q=80&w=800&auto=format&fit=crop"
    ],
    economia: [
        "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=800&auto=format&fit=crop", 
        "https://images.unsplash.com/photo-1621261304229-373981882c9e?q=80&w=800&auto=format&fit=crop"
    ],
    saude: [
        "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop"
    ],
    educacao: [
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop"
    ],
    ambiente: [
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop"
    ],
    tecnologia: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop"
    ],
    agro: [
        "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800&auto=format&fit=crop"
    ]
};

const getThematicImage = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('amazônia') || t.includes('floresta') || t.includes('clima')) return THEMATIC_IMAGE_BANK.ambiente[0];
    if (t.includes('agro') || t.includes('safra')) return THEMATIC_IMAGE_BANK.agro[0];
    if (t.includes('dólar') || t.includes('economia') || t.includes('orçamento')) return THEMATIC_IMAGE_BANK.economia[0];
    if (t.includes('stf') || t.includes('juiz') || t.includes('lei')) return THEMATIC_IMAGE_BANK.justica[0];
    if (t.includes('saúde') || t.includes('sus')) return THEMATIC_IMAGE_BANK.saude[0];
    if (t.includes('educação') || t.includes('escola')) return THEMATIC_IMAGE_BANK.educacao[0];
    if (t.includes('tech') || t.includes('digital')) return THEMATIC_IMAGE_BANK.tecnologia[0];
    return THEMATIC_IMAGE_BANK.congresso[0];
};

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
        localStorage.removeItem('paporeto_img_cache_v2'); 
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    }
};

export interface AIResponse {
    text: string;
    searchSources?: { uri: string; title: string }[];
    mapSources?: { uri: string; title: string; source: string }[];
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
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Diga de forma clara e profissional: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
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
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: {
                parts: [{ text: `Fotojornalismo profissional no Brasil: ${headline}. Sem texto.` }]
            },
            config: {
               imageConfig: { aspectRatio: "16:9" }
            }
        });
        
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
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
    } catch (e) {}
};

export const getNewsHistory = (): NewsArticle[] => {
    return getCache(NEWS_HISTORY_KEY, 0) || [];
};

export const getBestAvailableNews = (): NewsArticle[] | null => {
    return getCache(NEWS_CACHE_KEY, 0);
};

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    if (cachedNews && cachedNews.length > 0) return cachedNews;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Busque as 3 principais notícias políticas do Brasil de hoje. JSON array.`,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            source: { type: Type.STRING },
                            url: { type: Type.STRING },
                            time: { type: Type.STRING },
                            imageUrl: { type: Type.STRING }
                        },
                        required: ["title", "source", "url", "time"]
                    }
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty AI response");
        const data = JSON.parse(jsonStr) as NewsArticle[];
        
        const enrichedData = await Promise.all(data.map(async (item, index) => {
            let img = null;
            if (index < 1) { 
                try {
                    img = await Promise.race([
                        generateNewsImage(item.title),
                        new Promise<string | null>(resolve => setTimeout(() => resolve(null), 6000))
                    ]);
                } catch (e) {}
            }
            if (!img) img = getThematicImage(item.title);
            return { ...item, imageUrl: img };
        }));

        if (enrichedData.length > 0) {
            setCache(NEWS_CACHE_KEY, enrichedData);
            saveToHistory(enrichedData);
        }
        return enrichedData;
    } catch (error) {
        return [
            { 
                title: "Acompanhe o Congresso Nacional", 
                source: "Agência Câmara", 
                url: "https://www.camara.leg.br", 
                time: "Hoje", 
                imageUrl: THEMATIC_IMAGE_BANK.congresso[0]
            }
        ];
    }
};

export const getNewsSummary = async (title: string, source: string): Promise<string> => {
    const summaryKey = `news_summary_${btoa(title).slice(0, 20)}`;
    const cached = getCache(summaryKey, NEWS_CACHE_TTL);
    if (cached) return cached;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resumo detalhado sobre: "${title}" (${source}). Estilo Papo Reto.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const text = response.text || "Resumo indisponível.";
        setCache(summaryKey, text);
        return text;
    } catch (error) {
        return "Resumo indisponível.";
    }
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
            case 'fast': model = 'gemini-flash-lite-latest'; break;
            case 'search': model = 'gemini-3-flash-preview'; tools = [{ googleSearch: {} }]; break;
            case 'location': model = 'gemini-flash-latest'; tools = [{ googleMaps: {} }]; break;
            case 'thinking': model = 'gemini-3-pro-preview'; config = { thinkingConfig: { thinkingBudget: 32768 } }; break;
            case 'standard': default: model = 'gemini-3-pro-preview'; break;
        }

        const contents = [...history, { role: 'user', parts: [{ text: message }] }];
        const response = await ai.models.generateContent({ model, contents, config: { ...config, tools: tools.length > 0 ? tools : undefined } });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const searchSources = groundingChunks.filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }));
        const mapSources = groundingChunks.filter((c: any) => c.maps).map((c: any) => ({ uri: c.maps.uri, title: c.maps.title, source: "Google Maps" }));

        return { text: response.text || "Sem resposta.", searchSources, mapSources };
    } catch (error) {
        return { text: "Erro ao processar mensagem." };
    }
};

export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (error) {
        return null;
    }
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcreva." }] }
        });
        return response.text || "";
    } catch (error) {
        return "";
    }
};

export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Gere 6 artigos educativos sobre Direito Constitucional Brasileiro. JSON.`,
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
        return JSON.parse(jsonStr) as GeneratedArticle[];
    } catch (error) {
        return [];
    }
};