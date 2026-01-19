
import { GoogleGenAI, Type } from "@google/genai";

// Inicialização com API Key do ambiente
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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
}

export interface TranslatedQuizItem {
    theme: string;
    context: string;
    proposal: string;
    question: string;
}

// --- TRADUTOR DE VOTAÇÕES PARA QUIZ (NOVO) ---
export const translateVoteToQuiz = async (technicalDescription: string): Promise<TranslatedQuizItem> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Você é um especialista em educação política para jovens.
            Analise a descrição técnica desta votação da Câmara dos Deputados e extraia os pontos chave para um quiz didático.
            
            Descrição Técnica: "${technicalDescription}"
            
            Gere um JSON com:
            1. theme: Tag curta do assunto (max 2 palavras, ex: "Economia", "Segurança").
            2. context: Uma frase curta explicando o cenário atual ou o problema que motivou a lei (sem juridiquês).
            3. proposal: Uma frase curta explicando o que a lei muda na prática (o que está sendo votado).
            4. question: Uma pergunta direta de "Sim ou Não" para o usuário opinar sobre a proposta.
            
            Regras: Linguagem simples (Geração Z), neutra e direta.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        theme: { type: Type.STRING },
                        context: { type: Type.STRING, description: "O problema ou cenário atual" },
                        proposal: { type: Type.STRING, description: "A solução ou mudança proposta" },
                        question: { type: Type.STRING, description: "A pergunta final" }
                    },
                    required: ["theme", "context", "proposal", "question"]
                }
            }
        });

        const jsonStr = response.text?.trim();
        if (!jsonStr) throw new Error("Empty AI response");
        return JSON.parse(jsonStr) as TranslatedQuizItem;
    } catch (error) {
        console.error("AI Translation Error:", error);
        // Fallback simples caso a IA falhe
        return {
            theme: "Votação",
            context: "Tema complexo em discussão na Câmara.",
            proposal: technicalDescription.slice(0, 100) + "...",
            question: "Você concorda com essa medida?"
        };
    }
};

// --- BUSCA COM GROUNDING (Recente/Notícias) ---
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

// --- CHAT GERAL (Com seleção de modelo) ---
export const chatWithGemini = async (
    message: string, 
    mode: 'fast' | 'standard' | 'search' | 'location' | 'thinking',
    history: { role: string; parts: { text: string }[] }[] = []
): Promise<{ text: string; searchSources?: any[]; mapSources?: any[] }> => {
    try {
        let model = 'gemini-3-pro-preview'; // Padrão
        let tools: any[] = [];
        let config: any = {};

        switch (mode) {
            case 'fast':
                model = 'gemini-2.5-flash-lite';
                break;
            case 'search':
                model = 'gemini-3-flash-preview';
                tools = [{ googleSearch: {} }];
                break;
            case 'location':
                model = 'gemini-2.5-flash';
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
                uri: c.maps.googleMapsLink, 
                title: c.maps.title,
                source: c.maps.placeAnswerSources?.[0]?.reviewSnippets?.[0]?.snippet || "Localização Google Maps"
            }));

        return { 
            text: response.text || "Sem resposta.", 
            searchSources, 
            mapSources 
        };

    } catch (error) {
        console.error("Chat Error:", error);
        return { text: "Erro ao processar sua mensagem. Tente novamente." };
    }
};

// --- GERAÇÃO DE IMAGEM ---
export const generateCampaignImage = async (prompt: string, aspectRatio: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio, // "1:1", "3:4", "4:3", "9:16", "16:9", etc.
                    imageSize: "1K"
                }
            }
        });

        // Procurar a parte da imagem na resposta
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Image Gen Error:", error);
        return null;
    }
};

// --- TRANSCRIÇÃO DE ÁUDIO ---
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

// --- GERAÇÃO DE CONTEÚDO EDUCATIVO (Existente) ---
export const generateEducationalContent = async (): Promise<GeneratedArticle[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Gere 6 artigos educativos curtos e impactantes sobre o funcionamento da política brasileira, focados em transparência e fiscalização cidadã.
            Público-alvo: Jovens e adultos que querem entender política sem "juridiquês". Linguagem direta, "Papo Reto".
            Formato JSON estrito.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Título curto e chamativo (use um emoji no final)" },
                            text: { type: Type.STRING, description: "Explicação resumida em 2 ou 3 frases impactantes." },
                            topic: { type: Type.STRING, description: "Categoria do assunto (ex: 'Orçamento', 'Leis', 'Corrupção')" }
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
        console.error("Erro ao gerar artigos educativos:", error);
        return [];
    }
};
