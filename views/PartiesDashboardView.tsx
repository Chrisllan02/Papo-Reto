
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, Users, Compass, ChevronRight, X, Trophy, AlertCircle, TrendingDown, ChevronLeft } from 'lucide-react';
import { Politician, FeedItem } from '../types';
import { formatPartyName } from '../services/camaraApi';

interface PartiesDashboardViewProps {
  politicians: Politician[];
  feedItems?: FeedItem[];
  onSelectCandidate?: (pol: Politician) => void;
}

interface PartyStats {
  name: string;
  totalMembers: number;
  femaleCount: number; // Nova propriedade
  totalSpending: number;
  avgSpending: number;
  avgAttendance: number;
  totalAbsences: number;
  totalSessions: number;
  totalProjects: number;
  members: Politician[];
}

type DetailType = 'spending' | 'attendance' | 'projects' | 'composition' | 'ideology' | null;

const IDEOLOGY_MAP: Record<string, 'Esquerda' | 'Centro' | 'Direita'> = {
    'PT': 'Esquerda', 'PSOL': 'Esquerda', 'PCDOB': 'Esquerda', 'PSB': 'Esquerda', 'REDE': 'Esquerda', 'PV': 'Esquerda', 'PDT': 'Esquerda',
    'MDB': 'Centro', 'PSD': 'Centro', 'PSDB': 'Centro', 'CIDADANIA': 'Centro', 'SOLIDARIEDADE': 'Centro', 'PODE': 'Centro', 'AVANTE': 'Centro', 'PP': 'Centro',
    'PL': 'Direita', 'REPUBLICANOS': 'Direita', 'UNIÃO': 'Direita', 'NOVO': 'Direita', 'PATRIOTA': 'Direita', 'PRTB': 'Direita', 'PSC': 'Direita'
};

// Componente de Gráfico de Barras Vertical (Bússola Grande)
const IdeologyBarChart = ({ left, center, right }: { left: number, center: number, right: number }) => {
    const total = Math.max(left + center + right, 1);
    const maxVal = Math.max(left, center, right, 1);
    
    // Calculate heights (max height 100%)
    const getPct = (val: number) => ((val / total) * 100).toFixed(1);
    const getHeight = (val: number) => Math.max((val / maxVal) * 100, 15); // Min 15% height for visibility + pill shape

    return (
        <div className="flex items-end justify-center gap-8 md:gap-24 h-64 w-full px-8 pt-10 pb-4">
            {/* Esquerda */}
            <div className="flex flex-col items-center gap-3 group w-24 md:w-32">
                <span className="text-2xl font-black text-red-500 scale-100 group-hover:scale-110 transition-transform">{getPct(left)}%</span>
                <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-full h-48 flex items-end overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div 
                        style={{ height: `${getHeight(left)}%` }} 
                        className="w-full bg-gradient-to-t from-red-800 to-red-500 rounded-full relative min-h-[2rem] transition-all duration-1000 group-hover:opacity-90 group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                    >
                         <div className="absolute top-0 left-0 right-0 h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20 mix-blend-overlay"></div>
                    </div>
                </div>
                <div className="text-center mt-2 w-full">
                     <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">Esquerda</span>
                     <span className="text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-1.5 rounded-full shadow-sm block">{left} dep.</span>
                </div>
            </div>

            {/* Centro */}
            <div className="flex flex-col items-center gap-3 group w-24 md:w-32">
                <span className="text-2xl font-black text-yellow-500 scale-100 group-hover:scale-110 transition-transform">{getPct(center)}%</span>
                <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-full h-48 flex items-end overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div 
                        style={{ height: `${getHeight(center)}%` }} 
                        className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 rounded-full relative min-h-[2rem] transition-all duration-1000 group-hover:opacity-90 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.4)]"
                    >
                        <div className="absolute top-0 left-0 right-0 h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20 mix-blend-overlay"></div>
                    </div>
                </div>
                <div className="text-center mt-2 w-full">
                     <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">Centro</span>
                     <span className="text-xs font-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-4 py-1.5 rounded-full shadow-sm block">{center} dep.</span>
                </div>
            </div>

            {/* Direita */}
            <div className="flex flex-col items-center gap-3 group w-24 md:w-32">
                <span className="text-2xl font-black text-blue-500 scale-100 group-hover:scale-110 transition-transform">{getPct(right)}%</span>
                 <div className="relative w-full bg-gray-100 dark:bg-gray-800 rounded-full h-48 flex items-end overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
                    <div 
                        style={{ height: `${getHeight(right)}%` }} 
                        className="w-full bg-gradient-to-t from-blue-900 to-blue-600 rounded-full relative min-h-[2rem] transition-all duration-1000 group-hover:opacity-90 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                    >
                        <div className="absolute top-0 left-0 right-0 h-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20 mix-blend-overlay"></div>
                    </div>
                </div>
                <div className="text-center mt-2 w-full">
                     <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-2">Direita</span>
                     <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-1.5 rounded-full shadow-sm block">{right} dep.</span>
                </div>
            </div>
        </div>
    );
};

// Componente para o Gráfico de Barras Laterais (Ranking Geral)
const PartyRankingChart = ({ data, onClick }: { data: PartyStats[], onClick: () => void }) => {
    // Exibe TODOS os partidos ordenados, sem limite
    const topParties = [...data].sort((a, b) => b.totalMembers - a.totalMembers);
    const maxMembers = topParties[0]?.totalMembers || 1;

    return (
        <div 
            onClick={onClick}
            className="w-full bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
        >
            <div className="flex justify-between items-center mb-4 relative z-10">
                 <div className="flex items-center gap-3">
                     <div className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 shadow-sm">
                         <Users size={20} />
                     </div>
                     <div>
                         <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">Ranking das Bancadas</h3>
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Por tamanho (Dep + Sen)</p>
                     </div>
                 </div>
                 <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight size={16}/>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pr-2 space-y-3">
                {topParties.map((party, index) => {
                    const widthPct = (party.totalMembers / maxMembers) * 100;
                    return (
                        <div key={party.name} className="flex items-center gap-3">
                            <span className="w-5 text-[10px] font-black text-gray-300">#{index + 1}</span>
                            <span className="w-12 text-xs font-black text-gray-900 dark:text-white">{formatPartyName(party.name)}</span>
                            <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-green-500 rounded-full transition-all duration-1000 group-hover:bg-green-600 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                    style={{ width: `${widthPct}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-bold text-gray-500 w-12 text-right">{party.totalMembers}</span>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest group-hover:text-green-600 transition-colors">Toque para detalhes</span>
            </div>
        </div>
    );
};

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians, onSelectCandidate }) => {
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  
  // State for Gender Card Drill-down
  const [selectedGenderParty, setSelectedGenderParty] = useState<string | null>(null);
  
  const [chartAnimatedPct, setChartAnimatedPct] = useState(0);

  // --- STATS LOGIC ---
  const { partyStats, genderStats, ideologyStats } = useMemo(() => {
    const groups: Record<string, PartyStats> = {};
    const genderGroups: Record<string, number> = { 'M': 0, 'F': 0 };
    const ideologyGroups: Record<string, number> = { 'Esquerda': 0, 'Centro': 0, 'Direita': 0 };

    politicians.forEach(pol => {
        // Party Grouping
        if (!groups[pol.party]) {
            groups[pol.party] = {
                name: pol.party,
                totalMembers: 0,
                femaleCount: 0,
                totalSpending: 0,
                avgSpending: 0,
                avgAttendance: 0,
                totalAbsences: 0,
                totalSessions: 0,
                totalProjects: 0,
                members: []
            };
        }
        
        const g = groups[pol.party];
        g.members.push(pol);
        g.totalMembers += 1;

        // Só considera estatísticas se tiver integração de API e dados carregados
        if (pol.hasApiIntegration && pol.stats.spending > 0) {
            g.totalSpending += pol.stats.spending;
        }

        // Gender Grouping
        const gender = pol.sex === 'F' ? 'F' : 'M';
        genderGroups[gender] += 1;
        if (gender === 'F') {
            g.femaleCount += 1;
        }

        // Ideology Grouping
        const ideology = IDEOLOGY_MAP[pol.party.toUpperCase()] || 'Centro';
        ideologyGroups[ideology] += 1;
    });

    const calculatedParties = Object.values(groups).map(g => {
        const integratedMembers = g.members.filter(m => m.hasApiIntegration && m.stats.spending > 0).length || 1;
        return {
            ...g,
            avgSpending: g.totalSpending / integratedMembers,
            avgAttendance: 0 // Simplificado pois não carregamos presença de todos no dash global
        };
    }).filter(g => g.totalMembers > 0);

    return {
        partyStats: calculatedParties,
        genderStats: genderGroups,
        ideologyStats: ideologyGroups
    };
  }, [politicians]);

  // Calculate percentages safely outside JSX to avoid type errors
  const femaleCount = Number(genderStats['F'] || 0);
  const totalPols = politicians.length;
  const femalePercentage = totalPols > 0 ? (femaleCount / totalPols) * 100 : 0;

  // Animation Trigger
  useEffect(() => {
      // Pequeno delay para garantir que o componente montou antes de animar
      const timer = setTimeout(() => {
          setChartAnimatedPct(femalePercentage);
      }, 300);
      return () => clearTimeout(timer);
  }, [femalePercentage]);

  // Lógica para o Ranking Feminino: AGORA MOSTRAMOS TODOS
  const sortedByFemale = [...partyStats].sort((a, b) => b.femaleCount - a.femaleCount);
  
  // Filtra quem tem mulher e quem não tem
  const partiesWithWomen = sortedByFemale.filter(p => p.femaleCount > 0);
  const partiesWithoutWomen = sortedByFemale.filter(p => p.femaleCount === 0);

  // Lógica para exibir a lista detalhada de mulheres do partido selecionado
  const selectedGenderPartyMembers = useMemo(() => {
      if (!selectedGenderParty) return [];
      const partyData = partyStats.find(p => p.name === selectedGenderParty);
      return partyData ? partyData.members.filter(m => m.sex === 'F') : [];
  }, [selectedGenderParty, partyStats]);

  const getDetailData = () => {
      let data = [...partyStats];
      let title = "";
      let subtitle = "";
      let colorClass = "";
      let metricFormatter = (val: number) => val.toString();

      switch (activeDetail) {
          case 'composition':
          case 'ideology':
              title = "Composição das Bancadas";
              subtitle = "Tamanho e membros de cada partido.";
              colorClass = "text-purple-600";
              data.sort((a, b) => b.totalMembers - a.totalMembers);
              metricFormatter = (val) => `${val} membros`;
              break;
          default:
              title = "Dados Detalhados";
              subtitle = "Informações por partido.";
              colorClass = "text-gray-600";
              metricFormatter = (val) => `${val}`;
              break;
      }

      if (detailSearch) {
          const search = detailSearch.toLowerCase();
          data = data.filter(p => 
              p.name.toLowerCase().includes(search) || 
              p.members.some(m => m.name.toLowerCase().includes(search))
          );
      }

      return { title, subtitle, colorClass, data, metricFormatter };
  };

  const detailConfig = getDetailData();

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 font-sans overflow-y-auto pb-32">
        {/* BACKGROUND PATTERN */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* MAIN CONTENT AREA */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 space-y-8 relative z-10 pt-8">
            
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                    <BarChart3 size={24}/>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Dashboard</h1>
                </div>
            </div>

            {/* MODERN GRID LAYOUT (BENTO GRID) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* 1. RANKING (1 Coluna) */}
                <div className="h-full">
                    <PartyRankingChart 
                        data={partyStats} 
                        onClick={() => { setActiveDetail('composition'); setExpandedParty(null); }}
                    />
                </div>

                {/* 2. GENDER (2 Colunas no Desktop) */}
                <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all h-full flex flex-col relative overflow-hidden">
                    
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 shadow-sm"><Users size={24}/></div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-xl">Mulheres na Política</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Representatividade Feminina</p>
                            </div>
                        </div>
                        {selectedGenderParty && (
                            <button 
                                onClick={() => setSelectedGenderParty(null)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
                            >
                                <ChevronLeft size={14}/> Voltar
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col xl:flex-row gap-10 items-center xl:items-start relative z-10">
                        
                        {/* Esquerda: Gráfico Geral (Sticky no Desktop XL) */}
                        <div className="flex flex-col items-center justify-center w-full xl:w-auto shrink-0 self-start xl:sticky xl:top-0 min-w-[220px]">
                            <div className="relative w-48 h-48">
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 filter drop-shadow-lg">
                                    {/* Fundo do círculo */}
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="3" className="dark:stroke-gray-800" />
                                    {/* Círculo de progresso animado */}
                                    <path 
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none" 
                                        stroke="#DC2626" 
                                        strokeWidth="3" 
                                        strokeLinecap="round"
                                        strokeDasharray={`${chartAnimatedPct}, 100`} 
                                        className="transition-all duration-[1500ms] ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter transition-all duration-1000">
                                        {femalePercentage.toFixed(0)}<span className="text-2xl text-red-500">%</span>
                                    </span>
                                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest mt-1">do Congresso</span>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6 w-full justify-center">
                                <div className="text-center px-4 py-2 bg-red-50 dark:bg-red-900/10 rounded-xl">
                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-wide">Feminino</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{genderStats['F'] || 0}</p>
                                </div>
                                <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Masculino</p>
                                    <p className="text-xl font-black text-gray-900 dark:text-white">{genderStats['M'] || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Direita: Área de Conteúdo Dinâmico (Lista Partidos OU Detalhe Partido) */}
                        <div className="w-full flex-1 border-t xl:border-t-0 xl:border-l border-gray-100 dark:border-gray-800 pt-6 xl:pt-0 xl:pl-10 flex flex-col h-[400px]">
                            
                            {!selectedGenderParty ? (
                                // VISÃO 1: LISTA DE PARTIDOS
                                <>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 shrink-0">
                                        <Trophy size={14} className="text-yellow-500"/> Com Representação ({partiesWithWomen.length})
                                    </h4>
                                    
                                    <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pb-4">
                                            {partiesWithWomen.map((party, idx) => {
                                                const pct = (party.femaleCount / (partiesWithWomen[0].femaleCount || 1)) * 100;
                                                return (
                                                    <button 
                                                        key={party.name} 
                                                        onClick={() => setSelectedGenderParty(party.name)}
                                                        className="flex items-center gap-3 group text-left w-full hover:bg-gray-50 dark:hover:bg-gray-800/50 p-2 rounded-xl transition-all"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] font-black text-gray-500 shrink-0 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                                                            {formatPartyName(party.name)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-1">
                                                                <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full group-hover:brightness-110 transition-all" style={{ width: `${pct}%` }}></div>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black text-gray-900 dark:text-white w-6 text-right group-hover:text-red-500">{party.femaleCount}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Lista Sem Representação */}
                                        {partiesWithoutWomen.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <AlertCircle size={12} className="text-gray-400"/> Sem Mulheres ({partiesWithoutWomen.length})
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {partiesWithoutWomen.map(party => (
                                                        <span key={party.name} className="text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700">
                                                            {formatPartyName(party.name)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                // VISÃO 2: DETALHE DO PARTIDO (Grid de Mulheres)
                                <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
                                    <div className="flex items-center gap-3 mb-4 shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center font-black text-xs">
                                            {formatPartyName(selectedGenderParty)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white leading-tight">Parlamentares</h4>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">{selectedGenderPartyMembers.length} Mulheres</p>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                        <div className="grid grid-cols-2 gap-3 pb-4">
                                            {selectedGenderPartyMembers.map(pol => (
                                                <button 
                                                    key={pol.id} 
                                                    onClick={() => onSelectCandidate && onSelectCandidate(pol)}
                                                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md transition-all text-left group"
                                                >
                                                    <img src={pol.photo} className="w-10 h-10 rounded-full object-cover bg-gray-200 border-2 border-white dark:border-gray-700 group-hover:scale-105 transition-transform" alt={pol.name}/>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight group-hover:text-red-500 transition-colors">{pol.name}</p>
                                                        <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">{pol.state} • {pol.role === 'Senador' ? 'Senadora' : 'Deputada'}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. IDEOLOGY (Full Width) */}
                <div className="col-span-1 md:col-span-2 xl:col-span-3 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 shadow-sm"><Compass size={24}/></div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-xl">Espectro Político</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Distribuição das Cadeiras</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveDetail('ideology')}
                                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Ver Lista <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative z-10">
                        <IdeologyBarChart 
                            left={ideologyStats['Esquerda'] || 0} 
                            center={ideologyStats['Centro'] || 0} 
                            right={ideologyStats['Direita'] || 0} 
                        />
                    </div>
                </div>

            </div>

            <div className="text-center pb-8 opacity-60">
                 <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium px-4">
                     * Dados oficiais da Câmara dos Deputados e Senado Federal (API).
                 </p>
            </div>
        </div>

        {/* DETAIL OVERLAY */}
        {activeDetail && (
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none">
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
                    onClick={() => { setActiveDetail(null); setDetailSearch(''); setExpandedParty(null); }}
                ></div>
                <div className="bg-white dark:bg-gray-900 w-full md:w-[90%] md:max-w-4xl h-[90vh] md:h-[85vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative pointer-events-auto flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden border border-white/20">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex justify-between items-start shrink-0 z-10 sticky top-0">
                        <div>
                            <h2 className={`text-2xl font-black ${detailConfig.colorClass}`}>{detailConfig.title}</h2>
                            <p className="text-gray-500 text-sm font-medium mt-1">{detailConfig.subtitle}</p>
                        </div>
                        <button onClick={() => { setActiveDetail(null); setDetailSearch(''); setExpandedParty(null); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        {detailConfig.data.map((party, idx) => (
                            <div key={party.name} onClick={() => setExpandedParty(expandedParty === party.name ? null : party.name)} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 text-sm">#{idx + 1}</div>
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-gray-700 dark:text-gray-300 text-xs shadow-sm">{formatPartyName(party.name)}</div>
                                        <div><h4 className="font-bold text-gray-900 dark:text-white text-lg">{formatPartyName(party.name)}</h4><p className="text-xs text-gray-500 font-bold mt-1">{party.totalMembers} Membros</p></div>
                                    </div>
                                    <span className={`text-lg font-black ${detailConfig.colorClass}`}>{detailConfig.metricFormatter(activeDetail === 'composition' || activeDetail === 'ideology' ? party.totalMembers : party.avgSpending)}</span>
                                </div>
                                {expandedParty === party.name && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {party.members.map(m => (
                                            <div key={m.id} onClick={(e) => { e.stopPropagation(); onSelectCandidate && onSelectCandidate(m); }} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 hover:border-blue-300 cursor-pointer">
                                                <img src={m.photo} className="w-8 h-8 rounded-full bg-gray-200" alt=""/>
                                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{m.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PartiesDashboardView;
