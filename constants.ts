
import { Politician, QuizQuestion, FeedItem, Alert } from './types';

// CONFIGURAÇÃO DE VOTAÇÕES REAIS
// Mapeamos o ID do nosso Quiz para o ID da Votação Específica na API da Câmara.
// Fonte: dadosabertos.camara.leg.br
export const REAL_VOTE_CONFIG: Record<number, string> = {
  1: "2256735-89", // Exemplo: PL das Fake News (ID da votação de urgência ou mérito)
  2: "2316938-45", // Exemplo: Saída Temporária
  3: "2358156-12", // Exemplo: Reforma Tributária (2º Turno)
  4: "2192459-33"  // Exemplo: Privatização
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1, tema: "Regulação das Redes", peso: 2, description: "Votação sobre o PL das Fake News (PL 2630/20)." },
  { id: 2, tema: "Fim da 'Saidinha'", peso: 3, description: "Votação para restringir a saída temporária de presos." },
  { id: 3, tema: "Reforma Tributária", peso: 1, description: "Votação da PEC 45/2019 (Simplificação de Impostos)." },
  { id: 4, tema: "Privatização Eletrobras", peso: 2, description: "Votação da MP da desestatização da Eletrobras." }
];

// CONTEÚDO DO CARROSSEL EDUCATIVO (MINUTO CIDADÃO)
// CORES FIXAS: VERDE, AZUL E PRETO (PALETA + NEUTRO)
export const EDUCATION_CAROUSEL = [
  {
    id: 1,
    title: "O que é o tal do 'Centrão'? 🤔",
    text: "Não é um partido, é um modo de operar. Entenda como grupos de deputados negociam apoio ao governo em troca de verbas e cargos.",
    colorFrom: "from-green-700",
    colorTo: "to-green-900",
    icon: "Lightbulb"
  },
  {
    id: 2,
    title: "Para onde vai a 'Emenda'? 💸",
    text: "Cada deputado tem direito a milhões do orçamento para enviar à sua cidade. Fiscalize se esse dinheiro virou obra ou sumiu.",
    colorFrom: "from-blue-700",
    colorTo: "to-blue-900",
    icon: "Banknote"
  },
  {
    id: 3,
    title: "PEC vs PL: Qual a diferença? 📜",
    text: "PEC muda a Constituição e precisa de muito mais votos (3/5). PL é lei comum e passa com maioria simples. PEC é muito mais difícil de aprovar.",
    colorFrom: "from-gray-900", // Preto (Neutro) substitui cores fora da paleta
    colorTo: "to-black",
    icon: "ScrollText"
  }
];

export const POLITICIANS_DB: Politician[] = [];
export const FEED_ITEMS: FeedItem[] = [];
export const ALERTS_DATA: Alert[] = [];
