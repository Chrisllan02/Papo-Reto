
import { GoogleGenAI, Type, Schema } from "@google/genai";

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

export interface EducationalItem {
    id: number;
    title: string;
    text: string;
    icon: string; // 'Banknote' | 'Scale' | 'Megaphone' | 'Globe'
    colorFrom: string;
    colorTo: string;
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

// NOVO: Gerador Automático de Conteúdo Educativo
export const generateEducationalFeed = async (): Promise<EducationalItem[]> => {
    try {
        const schema: Schema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "Título curto e chamativo do tópico (Ex: 'Reforma Tributária')" },
                    text: { type: Type.STRING, description: "Explicação didática de 2 parágrafos para um leigo entender o impacto prático." },
                    icon: { type: Type.STRING, description: "Uma palavra chave para ícone: 'money', 'law', 'alert', 'world'" }
                },
                required: ["title", "text", "icon"]
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Identifique os 3 tópicos políticos ou legislativos mais debatidos no Brasil nesta semana (leis, polêmicas, economia).
            Para cada tópico, gere um conteúdo educativo para um cidadão leigo entender o que está acontecendo.
            Seja imparcial, direto e use linguagem simples.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                tools: [{ googleSearch: {} }] // Garante dados atuais
            }
        });

        const rawData = JSON.parse(response.text || "[]");
        
        // Mapeamento visual para o Frontend
        return rawData.map((item: any, index: number) => {
            let colors = { from: 'from-gray-700', to: 'to-gray-900' };
            let iconName = 'Lightbulb';

            // Lógica simples de design baseado no conteúdo
            if (item.icon.includes('money') || item.title.toLowerCase().includes('imposto') || item.title.toLowerCase().includes('economia')) {
                colors = { from: 'from-green-600', to: 'to-green-900' };
                iconName = 'Banknote';
            } else if (item.icon.includes('law') || item.title.toLowerCase().includes('lei') || item.title.toLowerCase().includes('pec')) {
                colors = { from: 'from-blue-600', to: 'to-blue-900' };
                iconName = 'ScrollText';
            } else if (item.icon.includes('alert') || item.title.toLowerCase().includes('polêmica')) {
                colors = { from: 'from-red-600', to: 'to-red-900' };
                iconName = 'Megaphone';
            }

            return {
                id: index + 100, // IDs dinâmicos
                title: item.title,
                text: item.text,
                icon: iconName,
                colorFrom: colors.from,
                colorTo: colors.to
            };
        });

    } catch (error) {
        console.error("Erro ao gerar feed educativo automático:", error);
        // Fallback elegante se a IA falhar (pode retornar vazio ou itens estáticos de emergência)
        return [];
    }
};
