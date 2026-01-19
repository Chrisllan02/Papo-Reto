
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

export interface YearStats {
  year: number;
  attendancePct: number;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  projects: number;
  spending: number;
}

export interface Stats {
  attendancePct: number;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
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
  city: string;
  value: string;
  purpose: string;
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
  assets?: Asset[];
  donors?: Donor[]; 
  expensesBreakdown?: ExpenseCategory[];
  expensesHistory?: ExpenseHistoryItem[]; 
  amendments?: Amendment[];
  speeches?: Speech[];
  fronts?: Front[];
  roles?: Role[]; 
  occupations?: Occupation[]; // NOVO: Histórico de Ocupações
  suplentes?: string[]; // NOVO: Apenas para senadores
  percentage?: number; 
  externalLink?: string;
  timeline?: TimelineItem[]; 
  hasApiIntegration: boolean; // Flag para indicar se os dados são reais (API) ou apenas informativos
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
