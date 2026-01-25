
export interface Mandate {
  start: string;
  end: string;
}

export interface Cabinet {
  room?: string;
  floor?: string;
  building?: string;
  phone?: string;
  email?: string;
  address?: string; // Endereço físico completo
}

export interface ExpenseCategory {
  type: string;
  value: number;
  percent: number;
}

export interface ExpenseHistoryItem {
  month: string;
  year: number;
  value: number;
  label: string; // Ex: "Jan"
}

export interface PresenceStats {
  total: number;
  present: number;
  justified: number;
  unjustified: number;
  percentage: number;
}

export interface AmendmentStats {
  authorized: number;
}

export interface YearStats {
  year: number;
  attendancePct: number;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  projects: number;
  spending: number;
  plenary: PresenceStats; // NOVO: Detalhe por ano
  commissions: PresenceStats; // NOVO: Detalhe por ano
}

export interface Stats {
  attendancePct: number; // Mantido para compatibilidade, reflete Plenário
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  plenary: PresenceStats; // NOVO
  commissions: PresenceStats; // NOVO
  projects: number;
  spending: number;
}

export interface Bill {
  id: string;
  title: string;
  status: string;
  type: string;
  date: string;
  description: string;
  number?: number;
  year?: number;
  externalLink?: string; 
}

export interface LegislativeVote {
  id: string;
  date: string;
  description: string;
  vote: string; // Sim, Não, Obstrução, etc.
  approved?: boolean;
}

export interface Relatoria {
  id: string;
  billTitle: string;
  billType: string;
  date: string;
  commission: string;
  externalLink: string;
}

export interface Role {
  id: string;
  name: string; // Ex: Comissão de Constituição e Justiça
  acronym: string; // Ex: CCJC
  title: string; // Ex: Titular, Suplente, Presidente
  type: string; // Ex: Permanente, Especial, Externa
  startDate: string;
  endDate?: string; // NOVO: Para histórico
}

export interface Occupation {
  title: string;
  entity?: string;
  state?: string;
  startYear?: number;
  endYear?: number;
}

export interface Asset {
  type: string;
  value: string;
  description: string;
}

export interface Donor {
  name: string;
  value: string;
  type: string;
}

export interface Amendment {
  id: number;
  year: number;
  type: string;
  number: number;
  value: number;
  beneficiary: string; // Local ou órgão beneficiado
  status: string;
}

export interface Travel {
  date: string;
  destiny: string;
  reason: string;
  value: number; // Custo total da viagem
}

export interface Secretary {
  name: string;
  role: string;
  group: string; // Grupo funcional (CD-Cargo de Natureza Especial, etc)
  start: string;
}

export interface Remuneration {
  gross: number; // Bruto
  net: number; // Líquido
  tax: number; // Descontos
  housingAllowance: number; // Auxílio Moradia
  otherBenefits: number; // Outros auxílios
  month: number;
  year: number;
}

export interface Speech {
  date: string;
  summary: string;
  type: string;
  keywords?: string[]; // NOVO
  externalLink?: string; 
}

export interface Front {
  id: number;
  title: string;
  externalLink?: string; 
}

export interface TimelineItem {
  id: string;
  date: string; // ISO Date
  type: 'voto' | 'despesa' | 'discurso' | 'projeto' | 'evento';
  title: string;
  description?: string;
  value?: string; // Para despesas (R$)
  status?: string; // Para votos (Sim/Não) ou Projetos (Aprovado)
  icon?: any; // Metadado interno
  link?: string;
}

export interface Party {
  id: number;
  sigla: string;
  nome: string;
  uri: string;
  urlLogo?: string;
  totalMembers?: number; // Calculado no frontend
  ideology?: 'Esquerda' | 'Centro' | 'Direita'; // Calculado no frontend
}

export interface Politician {
  id: number;
  name: string;
  sex?: string; // 'M' ou 'F'
  civilName?: string;
  birthDate?: string;
  birthCity?: string; 
  birthState?: string;      
  education?: string;     
  profession?: string;    
  role: string;
  state: string;
  party: string;
  partyShort: string;
  photo: string;
  matchScore: number; 
  bio: string;
  email?: string;
  cabinet?: Cabinet;
  socials?: string[]; // NOVO: Redes Sociais da API
  mandate: Mandate;
  stats: Stats;
  yearlyStats?: Record<number, YearStats>; 
  votes: Record<number, string>; 
  bills?: Bill[];
  reportedBills?: Relatoria[]; // NOVO: Projetos relatados
  votingHistory?: LegislativeVote[]; // NOVO: Histórico completo de votações
  amendmentStats?: AmendmentStats; // NOVO: Dados consolidados de emendas
  assets?: Asset[];
  donors?: Donor[]; 
  expensesBreakdown?: ExpenseCategory[];
  expensesHistory?: ExpenseHistoryItem[]; 
  amendments?: Amendment[]; // NOVO
  speeches?: Speech[];
  fronts?: Front[];
  roles?: Role[]; 
  occupations?: Occupation[]; // NOVO: Histórico de Ocupações
  suplentes?: string[]; // NOVO: Apenas para senadores
  staff?: Secretary[]; // NOVO: Secretários
  travels?: Travel[]; // NOVO: Viagens
  remuneration?: Remuneration; // NOVO: Salário
  agenda?: LegislativeEvent[]; // NOVO: Agenda
  percentage?: number; 
  externalLink?: string;
  timeline?: TimelineItem[]; 
  hasApiIntegration: boolean; // Flag para indicar se os dados são reais (API) ou apenas informativos
}

export interface QuizVoteStats {
  totalYes: number;
  totalNo: number;
  totalAbstain: number;
  partiesYes: string[]; // Top 3 partidos que votaram SIM
  partiesNo: string[]; // Top 3 partidos que votaram NÃO
  approvalRate: number; // Porcentagem de aprovação
}

export interface QuizQuestion {
  id: number;
  tema: string;
  peso: number;
  description: string; // Usado como Pergunta final
  context?: string; // NOVO: Contexto do problema
  proposal?: string; // NOVO: O que está sendo proposto
  realVoteId?: string;
  sourceUrl?: string; 
  originalDescription?: string;
  stats?: QuizVoteStats; // NOVO: Dados agregados da votação
}

export interface FeedItem {
  id: number;
  type: 'voto' | 'despesa' | 'educacao';
  title: string;
  date?: string;
  action?: string;
  candidateId?: number;
  description?: string;
  content?: string;
  amount?: string;
  provider?: string;
  source?: string;
  sourceUrl?: string; 
  tags?: string[];
  status?: 'Aprovado' | 'Rejeitado' | 'Tramitação' | 'Urgência';
  reactions?: {
    support: number;
    angry: number;
    clown: number;
  };
}

export interface Alert {
  id: number;
  type: 'critical' | 'warning' | 'info';
  title: string;
  msg: string;
  time: string;
}

export interface LegislativeEvent {
  id: number;
  startTime: string;
  endTime?: string;
  title: string; // descriptionType
  description: string;
  location: string;
  status: string; // Em andamento, Encerrada, Convocada
  type: string;
}

// --- AI Chat Types ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string; // Base64 url
  isThinking?: boolean;
  groundingMetadata?: {
    search?: { uri: string; title: string }[];
    maps?: { uri: string; title: string; source: string }[];
  };
  timestamp: number;
}

export type ChatMode = 'fast' | 'standard' | 'search' | 'location' | 'thinking';

// --- Workspace / Gabinete Digital Types ---
export interface WorkspaceEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  tag: 'Câmara' | 'Partido' | 'Eleitor' | 'Urgente';
  folder?: 'inbox' | 'sent' | 'trash'; // NOVO
}

export interface WorkspaceFile {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'slide' | 'pdf' | 'folder';
  owner: string;
  date: string;
  size?: string;
  parentId?: string | null; // NOVO
}

export interface WorkspaceEvent {
  id: number;
  day: number;
  title: string;
  time: string;
  type: 'Sessão' | 'Reunião' | 'Pessoal';
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  time: string;
  summary: string; // Agora obrigatório, pois vem do prompt
  category: 'politica' | 'economia' | 'justica' | 'social' | 'mundo'; // Para definir o ícone/cor
  imageUrl?: string; // Mantido como opcional, mas não será usado no novo design
  timestamp?: number; // Para controle de exclusão (1 mês)
}