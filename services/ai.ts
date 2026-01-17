
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export interface AIResponse {
    text: string;
    sources: {
        web?: {
            uri: string;
            title: string;
        };
    }[];
}

export const getSearchContext = async (query: string): Promise<AIResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Pesquise as últimas notícias, polêmicas e votações importantes recentes (últimos 6 meses) envolvendo: "${query}".
            
            Instruções:
            1. Seja direto e imparcial (Estilo "Papo Reto").
            2. Foque em fatos que não aparecem em dados brutos (contexto político, repercussão na mídia, posicionamento em polêmicas).
            3. Resuma em tópicos curtos.
            4. Responda em Português do Brasil.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        // Extract grounding chunks properly
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((c: any) => ({ web: c.web }))
            .filter((s: any) => s.web);

        return {
            text: response.text || "Não foi possível gerar um resumo no momento.",
            sources: sources
        };
    } catch (error) {
        console.error("AI Search Error:", error);
        return null;
    }
};
