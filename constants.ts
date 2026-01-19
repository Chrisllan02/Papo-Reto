
import { Politician, QuizQuestion, FeedItem, Alert } from './types';

// CONFIGURAÇÃO DE VOTAÇÕES REAIS
export const REAL_VOTE_CONFIG: Record<number, string> = {
  1: "2256735-89", 
  2: "2316938-45", 
  3: "2358156-12", 
  4: "2192459-33"  
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1, tema: "Regulação das Redes", peso: 2, description: "Votação sobre o PL das Fake News (PL 2630/20)." },
  { id: 2, tema: "Fim da 'Saidinha'", peso: 3, description: "Votação para restringir a saída temporária de presos." },
  { id: 3, tema: "Reforma Tributária", peso: 1, description: "Votação da PEC 45/2019 (Simplificação de Impostos)." },
  { id: 4, tema: "Privatização Eletrobras", peso: 2, description: "Votação da MP da desestatização da Eletrobras." }
];

export const EDUCATION_CAROUSEL = [
  {
    id: 1,
    title: "O que é o tal do 'Centrão'? 🤔",
    text: "Não é um partido, é um modo de operar. Entenda como grupos de deputados negociam apoio ao governo em troca de verbas e cargos.",
    colorFrom: "from-green-600",
    colorTo: "to-green-900",
    icon: "Lightbulb"
  },
  {
    id: 2,
    title: "Para onde vai a 'Emenda'? 💸",
    text: "Cada deputado tem direito a milhões do orçamento para enviar à sua cidade. Fiscalize se esse dinheiro virou obra ou sumiu.",
    colorFrom: "from-blue-600",
    colorTo: "to-blue-900",
    icon: "Banknote"
  },
  {
    id: 3,
    title: "PEC vs PL: Qual a diferença? 📜",
    text: "PEC muda a Constituição e precisa de muito mais votos (3/5). PL é lei comum e passa com maioria simples. PEC é muito mais difícil de aprovar.",
    colorFrom: "from-yellow-500", 
    colorTo: "to-yellow-700",
    icon: "ScrollText"
  }
];

// BACKUP DE DADOS DE PARTIDOS (GARANTIA DE EXIBIÇÃO)
// ATUALIZADO: Usando Wikimedia Commons (SVG) para estabilidade
export const PARTY_METADATA: Record<string, { nome: string, logo: string, ideology: 'Esquerda' | 'Centro' | 'Direita' }> = {
    'PT': { nome: 'Partido dos Trabalhadores', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Partido_dos_Trabalhadores_Logo.svg', ideology: 'Esquerda' },
    'PL': { nome: 'Partido Liberal', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Partido_Liberal_%282006%29_logo.svg', ideology: 'Direita' },
    'PP': { nome: 'Progressistas', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Progressistas_logo.svg', ideology: 'Centro' },
    'MDB': { nome: 'Movimento Democrático Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Logo_MDB_2017.svg', ideology: 'Centro' },
    'PSD': { nome: 'Partido Social Democrático', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Partido_Social_Democr%C3%A1tico_%282011%29_logo.svg', ideology: 'Centro' },
    'REPUBLICANOS': { nome: 'Republicanos', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Republicanos_Logo.svg', ideology: 'Direita' },
    'REP': { nome: 'Republicanos', logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Republicanos_Logo.svg', ideology: 'Direita' },
    'UNIÃO': { nome: 'União Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Uni%C3%A3o_Brasil_logo.svg', ideology: 'Direita' },
    'UNIAO': { nome: 'União Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Uni%C3%A3o_Brasil_logo.svg', ideology: 'Direita' },
    'PSB': { nome: 'Partido Socialista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Partido_Socialista_Brasileiro_Logo.svg', ideology: 'Esquerda' },
    'PDT': { nome: 'Partido Democrático Trabalhista', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Partido_Democr%C3%A1tico_Trabalhista_logo.svg', ideology: 'Esquerda' },
    'PSOL': { nome: 'Partido Socialismo e Liberdade', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_PSOL.svg', ideology: 'Esquerda' },
    'PODE': { nome: 'Podemos', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Podemos_logo.svg', ideology: 'Centro' },
    'PODEMOS': { nome: 'Podemos', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Podemos_logo.svg', ideology: 'Centro' },
    'AVANTE': { nome: 'Avante', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Avante_logo.svg', ideology: 'Centro' },
    'PSC': { nome: 'Partido Social Cristão', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Partido_Social_Crist%C3%A3o_logo.svg', ideology: 'Direita' },
    'PCdoB': { nome: 'Partido Comunista do Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/PCdoB_Logo.svg', ideology: 'Esquerda' },
    'PCDOB': { nome: 'Partido Comunista do Brasil', logo: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/PCdoB_Logo.svg', ideology: 'Esquerda' },
    'CIDADANIA': { nome: 'Cidadania', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Cidadania_logo.svg', ideology: 'Centro' },
    'SOLIDARIEDADE': { nome: 'Solidariedade', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Solidariedade_logo.svg', ideology: 'Centro' },
    'SD': { nome: 'Solidariedade', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Solidariedade_logo.svg', ideology: 'Centro' },
    'NOVO': { nome: 'Partido Novo', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Partido_Novo_logo.svg', ideology: 'Direita' },
    'REDE': { nome: 'Rede Sustentabilidade', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Rede_Sustentabilidade_logo.svg', ideology: 'Esquerda' },
    'PATRIOTA': { nome: 'Patriota', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Patriota_logo.svg', ideology: 'Direita' },
    'PV': { nome: 'Partido Verde', logo: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Partido_Verde_logo.svg', ideology: 'Esquerda' },
    'PSDB': { nome: 'Partido da Social Democracia Brasileira', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Logo_do_PSDB.svg', ideology: 'Centro' },
    'AGIR': { nome: 'Agir', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Agir_logo.svg', ideology: 'Centro' },
    'PMB': { nome: 'Partido da Mulher Brasileira', logo: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Partido_da_Mulher_Brasileira_logo.svg', ideology: 'Centro' },
    'PRD': { nome: 'Partido da Renovação Democrática', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/PRD_logo.svg', ideology: 'Direita' },
    'DC': { nome: 'Democracia Cristã', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Democracia_Crist%C3%A3_logo.svg', ideology: 'Direita' },
    'UP': { nome: 'Unidade Popular', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Unidade_Popular_logo.svg', ideology: 'Esquerda' },
    'PCO': { nome: 'Partido da Causa Operária', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/22/PCO_Logo.svg', ideology: 'Esquerda' },
    'PSTU': { nome: 'Partido Socialista dos Trabalhadores Unificado', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/PSTU_Logo.svg', ideology: 'Esquerda' },
    'PCB': { nome: 'Partido Comunista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Partido_Comunista_Brasileiro_Logo.svg', ideology: 'Esquerda' },
    'PMN': { nome: 'Partido da Mobilização Nacional', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/43/PMN_Logo.svg', ideology: 'Direita' },
    'PRTB': { nome: 'Partido Renovador Trabalhista Brasileiro', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Partido_Renovador_Trabalhista_Brasileiro_logo.svg', ideology: 'Direita' }
};

export const POLITICIANS_DB: Politician[] = [];
export const FEED_ITEMS: FeedItem[] = []; // Garantindo lista vazia inicial
export const ALERTS_DATA: Alert[] = [];