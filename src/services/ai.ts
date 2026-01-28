import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsArticle } from '../../types';

// Fix: Always initialize GoogleGenAI strictly using process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Cache Utils para AI
const NEWS_CACHE_KEY = 'paporeto_news_v8_daily'; 
const NEWS_HISTORY_KEY = 'paporeto_news_history_v1';
const NEWS_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 Horas de Cache (Otimização de Performance e Custo)

// Helper para rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
        console.warn('Cache full, clearing old keys');
        try {
            // Estratégia simples de limpeza: remove chaves antigas se der erro de cota
            localStorage.removeItem('paporeto_img_cache_v2'); 
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(err) {
            console.error("Critical storage error", err);
        }
    }
};

// Fallback de Imagens de Alta Qualidade (Política/Brasil/Abstrato) - Substitui API externa complexa
const STATIC_FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop", // Planalto
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=800&auto=format&fit=crop", // Bandeira
    "https://images.unsplash.com/photo-1555848962-6e79363ec58f?q=80&w=800&auto=format&fit=crop", // Abstrato Dados
    "https://images.unsplash.com/photo-1529101091760-6149d4c46b7d?q=80&w=800&auto=format&fit=crop", // Caneta/Lei
    "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?q=80&w=800&auto=format&fit=crop"  // Congresso
];

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

export interface TranslatedQuizItem {
    theme: string;
    context: string;
    proposal: string;
    question: string;
}

// --- GERAÇÃO DE VOZ ACESSÍVEL (TTS) ---
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
        // Tenta gerar imagem única com o modelo Flash
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: {
                parts: [{ text: `Fotojornalismo profissional, estilo editorial de revista (como Time ou The Economist), alta resolução, 8k, hiper-realista. A imagem deve ilustrar de forma abstrata ou concreta a seguinte manchete política no Brasil: '${headline}'. Iluminação dramática e volumétrica, composição cinematográfica, foco nítido. IMPORTANTE: NÃO INCLUIR TEXTO, LETRAS OU MARCAS D'ÁGUA NA IMAGEM.` }]
            },
            config: {
               imageConfig: {
                   aspectRatio: "16:9"
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
    } catch (e: any) {
        // Apenas aviso se falhar imagem, pois temos fallback
        if (!e.message?.includes('429')) {
             console.warn("Falha na geração de imagem (usando fallback):", e.message);
        }
        return null;
    }
};

// Funçao Auxiliar para salvar no Histórico
const saveToHistory = (newArticles: NewsArticle[]) => {
    try {
        const currentHistory = getCache(NEWS_HISTORY_KEY, 0) as NewsArticle[] || [];
        
        // Evita duplicatas baseadas no título
        const uniqueNew = newArticles.filter(n => !currentHistory.some(h => h.title === n.title));
        
        if (uniqueNew.length > 0) {
            // Adiciona novos no início e mantém no máximo 50 itens
            const updatedHistory = [...uniqueNew, ...currentHistory].slice(0, 50);
            setCache(NEWS_HISTORY_KEY, updatedHistory);
        }
    } catch (e) {
        console.error("Erro ao salvar histórico", e);
    }
};

export const getNewsHistory = (): NewsArticle[] => {
    return getCache(NEWS_HISTORY_KEY, 0) || [];
};

export const getBestAvailableNews = (): NewsArticle[] | null => {
    return getCache(NEWS_CACHE_KEY, 0);
};

export const fetchDailyNews = async (): Promise<NewsArticle[]> => {
    // 1. PERFORMANCE: Cache Rigoroso (Verifica antes de qualquer coisa)
    const cachedNews = getCache(NEWS_CACHE_KEY, NEWS_CACHE_TTL);
    
    // Se temos cache válido e com imagens, RETORNA IMEDIATAMENTE (Zero Delay)
    if (cachedNews && cachedNews.length > 0) {
        return cachedNews;
    }

    try {
        // 2. Fetch Text from Gemini (apenas se não houver cache)
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Busque as 3 principais notícias políticas do Brasil de hoje (Congresso, Leis, Economia).
            
            IMPORTANTE: Foco em fatos concretos e votações recentes.
            
            REGRAS DE FONTE:
            - Use APENAS fontes oficiais (Agência Câmara, Senado, Gov) ou veículos de hard news.
            - IGNORE colunas de opinião.
            
            Para cada notícia, forneça um resumo ("summary") de 2 a 3 frases, explicativo e direto.
            
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
                            source: { type: Type.STRING },
                            url: { type: Type.STRING },
                            time: { type: Type.STRING, description: "Ex: 'Há 2 horas' ou 'Hoje'" },
                            summary: { type: Type.STRING, description: "Resumo jornalístico direto e imparcial da notícia em 2 a 3 frases." },
                            imageUrl: { type: Type.STRING, description: "Deixe vazio." }
                        },
                        required: ["title", "source", "url", "time", "summary"]
                    }
                }
            }
        });

        let jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty AI response");

        // CLEANUP: Remove markdown code blocks if present (fixes parsing errors)
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const data = JSON.parse(jsonStr) as NewsArticle[];
        
        // 3. Processamento de Imagens (Apenas para o que veio novo)
        // Se falhar o Gemini, usa o Array de Fallback estático
        const enrichedData = await Promise.all(data.map(async (item, index) => {
            let img = null;
            
            // Tenta gerar com Gemini Nano/Flash
            if (index < 3) { // Limita a 3 gerações para economizar quota
                try {
                    // Timeout curto de 6s para não travar a UI
                    img = await Promise.race([
                        generateNewsImage(item.title),
                        new Promise<string | null>(resolve => setTimeout(() => resolve(null), 6000))
                    ]);
                } catch (e) {
                    console.warn(`Image skip for ${item.title}`);
                }
            }

            // Fallback Garantido: Se não gerou, pega uma imagem bonita do Unsplash
            if (!img) {
                img = STATIC_FALLBACK_IMAGES[index % STATIC_FALLBACK_IMAGES.length];
            }
            
            return { ...item, imageUrl: img };
        }));

        if (enrichedData.length > 0) {
            // Salva no Cache Diário
            setCache(NEWS_CACHE_KEY, enrichedData);
            // Salva na Galeria de Histórico
            saveToHistory(enrichedData);
        }

        return enrichedData;

    } catch (error: any) {
        // Detect Quota Limit and handle gracefully
        const isQuota = error.message?.includes('429') || error.status === 429 || error.code === 429 || error.message?.includes('quota');
        
        if (isQuota) {
             console.warn("News Fetch: Gemini Quota Exceeded. Using fallback data.");
        } else {
             console.error("News Fetch Error:", error);
        }
        
        // Fallback de Emergência (Caso a API falhe totalmente ou esteja sem cota)
        const emergencyData = [
            { 
                title: "Sessão Deliberativa no Plenário da Câmara", 
                source: "Agência Câmara", 
                url: "https://www.camara.leg.br", 
                time: "Hoje",
                summary: "Deputados debatem pautas prioritárias e votações de projetos de lei em sessão no plenário da Câmara.",
                imageUrl: STATIC_FALLBACK_IMAGES[0]
            },
            { 
                title: "Votações de hoje no Senado Federal", 
                source: "Agência Senado", 
                url: "https://www12.senado.leg.br", 
                time: "Hoje",
                summary: "Senadores analisam medidas provisórias e indicações de autoridades em dia movimentado no Congresso.",
                imageUrl: STATIC_FALLBACK_IMAGES[1]
            },
            {
                title: "Pauta Econômica em destaque no Congresso",
                source: "Portal da Câmara",
                url: "https://www.camara.leg.br/noticias/",
                time: "Recente",
                summary: "Discussões sobre orçamento e reformas fiscais dominam a agenda legislativa desta semana.",
                imageUrl: STATIC_FALLBACK_IMAGES[2]
            }
        ];
        return emergencyData;
    }
};

export const getNewsSummary = async (title: string, source: string): Promise<string> => {
    const summaryKey = `news_summary_${btoa(title).slice(0, 20)}`;
    const cached = getCache(summaryKey, NEWS_CACHE_TTL);
    if (cached) return cached;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Resumo detalhado sobre a notícia: "${title}" (Fonte original: ${source}).
            
            Estrutura da resposta:
            - Escreva 2 parágrafos informativos e neutros.
            - Explique o impacto dessa notícia para o cidadão comum.
            - Use linguagem direta (Estilo "Papo Reto").
            - Não use markdown complexo, apenas texto corrido e quebras de linha.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const text = response.text || "Não foi possível carregar os detalhes desta notícia no momento.";
        if (response.text) {
            setCache(summaryKey, text);
        }
        return text;
    } catch (error: any) {
        if (error.message?.includes('429') || error.status === 429) {
            return "Resumo indisponível no momento (limite de tráfego excedido). Por favor, leia a matéria completa no link original.";
        }
        console.error("News Expansion Error:", error);
        return "Erro ao conectar com o serviço de inteligência para expandir a notícia.";
    }
};

export const getSearchContext = async (query: string): Promise<AIResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Pesquise as últimas notícias e dados atualizados sobre: "${query}".
            Seja direto, imparcial e didático (estilo Papo Reto).
            Responda em Português do Brasil.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((c: any) => ({ 
                web: c.web ? { uri: c.web.uri, title: c.web.title } : undefined 
            }))
            .filter((s: any) => s.web);

        return {
            text: response.text || "Não foi possível gerar um resumo.",
            sources: sources
        };
    } catch (error) {
        console.error("AI Search Error:", error);
        return null;
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

        const response = await ai.models.generateContent({
            model,
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
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
        if (error.message?.includes('429') || error.status === 429) {
            alert("Limite de criação de imagens excedido. Tente novamente mais tarde.");
        }
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
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Atue como um Professor de Direito Constitucional e Cidadania.
            Gere 4 artigos educativos curtos e diretos sobre temas fundamentais da política brasileira e Direitos do Cidadão.
            
            Temas sugeridos (variar): Orçamento Público, Tramitação de Leis (PEC vs PL), Funções do STF, O que faz um Deputado, Direitos do Consumidor, Reforma Tributária.

            Formato JSON Estrito:
            [
              {
                "title": "Título chamativo",
                "text": "Explicação didática de 2 parágrafos (aprox 80 palavras). Linguagem simples.",
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
        
        let jsonStr = response.text?.trim();
        if (!jsonStr) return [];

        // CLEANUP: Remove markdown code blocks if present (fixes parsing errors)
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        return JSON.parse(jsonStr) as GeneratedArticle[];
    } catch (error) {
        console.error("Educational Content Gen Error:", error);
        return [];
    }
};