
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart3, Users, Compass, ChevronRight, X, Trophy, AlertCircle, TrendingDown, ChevronLeft, AlertTriangle, UserCheck, Scale, CircleDot } from 'lucide-react';
import { Politician, FeedItem, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';

interface PartiesDashboardViewProps {
  politicians: Politician[];
  parties?: Party[];
  feedItems?: FeedItem[];
  onSelectCandidate?: (pol: Politician) => void;
}

interface PartyStats {
  name: string;
  totalMembers: number;
  femaleCount: number; 
  totalSpending: number;
  avgSpending: number;
  avgAttendance: number;
  totalAbsences: number;
  totalSessions: number;
  totalProjects: number;
  members: Politician[];
}

type DetailType = 'spending' | 'attendance' | 'projects' | 'composition' | 'ideology' | null;

// Novo Componente: Barra de Espectro Horizontal (Mais compacta e moderna)
const IdeologySpectrum = ({ left, center, right }: { left: number, center: number, right: number }) => {
    const total = Math.max(left + center + right, 1);
    const getPct = (val: number) => ((val / total) * 100);
    
    const pctLeft = getPct(left);
    const pctCenter = getPct(center);
    const pctRight = getPct(right);

    return (
        <div className="w-full flex flex-col justify-center h-full px-2">
            <div className="flex justify-between mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                <span className="text-yellow-600 flex items-center gap-1">Esquerda <span className="text-[9px] bg-yellow-100 px-1.5 rounded">{left}</span></span>
                <span className="text-gray-500 flex items-center gap-1">Centro <span className="text-[9px] bg-gray-100 px-1.5 rounded">{center}</span></span>
                <span className="text-blue-600 flex items-center gap-1"><span className="text-[9px] bg-blue-100 px-1.5 rounded">{right}</span> Direita</span>
            </div>
            
            <div className="w-full h-6 flex rounded-full overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-800 relative">
                {/* Left */}
                <div style={{ width: `${pctLeft}%` }} className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center group relative min-w-[2%] transition-all duration-1000">
                    {pctLeft > 10 && <span className="text-[9px] font-black text-white drop-shadow-md">{pctLeft.toFixed(0)}%</span>}
                </div>
                
                {/* Center */}
                <div style={{ width: `${pctCenter}%` }} className="h-full bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center group relative min-w-[2%] transition-all duration-1000">
                    {pctCenter > 10 && <span className="text-[9px] font-black text-white drop-shadow-md">{pctCenter.toFixed(0)}%</span>}
                </div>

                {/* Right */}
                <div style={{ width: `${pctRight}%` }} className="h-full bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center group relative min-w-[2%] transition-all duration-1000">
                    {pctRight > 10 && <span className="text-[9px] font-black text-white drop-shadow-md">{pctRight.toFixed(0)}%</span>}
                </div>
            </div>
            
            <div className="mt-2 text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                    Distribuição baseada na afiliação partidária oficial dos {total} parlamentares.
                </p>
            </div>
        </div>
    );
};

const PartyRankingChart = ({ data, onClick, isOffline }: { data: PartyStats[], onClick: () => void, isOffline: boolean }) => {
    const topParties = [...data].sort((a, b) => b.totalMembers - a.totalMembers);
    const maxMembers = topParties[0]?.totalMembers || 1;

    // Helper para abreviar nomes longos nos badges
    const getBadgeName = (name: string) => {
        const clean = formatPartyName(name).toUpperCase();
        const map: Record<string, string> = {
            'SOLIDARIEDADE': 'SD',
            'CIDADANIA': 'CID',
            'PATRIOTA': 'PAT',
            'AVANTE': 'AVT',
            'PODEMOS': 'PODE',
            'REPUBLICANOS': 'REP',
            'UNIÃO': 'UNI',
            'UNIAO': 'UNI',
            'PROGRESSISTAS': 'PP'
        };
        return map[clean] || (clean.length > 4 ? clean.substring(0, 3) : clean);
    };

    return (
        <div 
            className="w-full h-full bg-white dark:bg-gray-900 rounded-[2rem] p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col relative overflow-hidden"
        >
            <div className="flex justify-between items-center mb-4 relative z-10 shrink-0">
                 <div className="flex items-center gap-2">
                     <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 shadow-sm">
                         <Trophy size={18} />
                     </div>
                     <h3 className="font-bold text-gray-900 dark:text-white text-base">Maiores Bancadas</h3>
                 </div>
                 {isOffline && <span className="bg-yellow-100 text-yellow-600 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase">Estimado</span>}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 pr-1 space-y-2">
                {topParties.map((party, index) => {
                    const widthPct = (party.totalMembers / maxMembers) * 100;
                    const isTop3 = index < 3;
                    return (
                        <div 
                            key={party.name} 
                            onClick={onClick}
                            className="group/item relative flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                        >
                            <span className={`text-[10px] font-black w-5 text-center ${isTop3 ? 'text-blue-600 scale-110' : 'text-gray-400'}`}>#{index + 1}</span>
                            
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-black text-gray-600 dark:text-gray-300 shrink-0 border border-gray-200 dark:border-gray-600 group-hover/item:border-blue-300 transition-colors">
                                {getBadgeName(party.name)}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">{formatPartyName(party.name)}</span>
                                    <span className="text-xs font-black text-gray-900 dark:text-white">{party.totalMembers}</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden w-full">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 relative ${isTop3 ? 'bg-blue-600' : 'bg-blue-300 dark:bg-blue-800'}`}
                                        style={{ width: `${Math.max(widthPct, 2)}%` }} 
                                    ></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, icon: Icon, color, subtext, className }: any) => (
    <div className={`bg-white dark:bg-gray-900 p-4 rounded-[2rem] border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 ${className || ''}`}>
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-opacity-100`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{value}</p>
            {subtext && <p className="text-[10px] text-gray-500 font-medium mt-0.5">{subtext}</p>}
        </div>
    </div>
);

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians, parties = [], onSelectCandidate }) => {
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const [selectedGenderParty, setSelectedGenderParty] = useState<string | null>(null);
  const [chartAnimatedPct, setChartAnimatedPct] = useState(0);

  const { partyStats, genderStats, ideologyStats, isOffline, dominantIdeology } = useMemo(() => {
    const useFallback = politicians.length === 0;
    
    if (useFallback) {
        return { 
            partyStats: [], 
            genderStats: { 'M': 0, 'F': 0 }, 
            ideologyStats: { 'Esquerda': 0, 'Centro': 0, 'Direita': 0 },
            isOffline: true,
            dominantIdeology: 'N/A'
        };
    }

    const groups: Record<string, PartyStats> = {};
    const genderGroups: Record<string, number> = { 'M': 0, 'F': 0 };
    const ideologyGroups: Record<string, number> = { 'Esquerda': 0, 'Centro': 0, 'Direita': 0 };

    politicians.forEach(pol => {
        const partyName = pol.party ? pol.party.trim().toUpperCase() : 'OUTROS';
        
        if (!groups[partyName]) {
            groups[partyName] = {
                name: partyName,
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
        
        const g = groups[partyName];
        g.members.push(pol);
        g.totalMembers += 1;

        if (pol.hasApiIntegration && pol.stats.spending > 0) {
            g.totalSpending += pol.stats.spending;
        }

        const gender = pol.sex === 'F' ? 'F' : 'M';
        genderGroups[gender] += 1;
        if (gender === 'F') {
            g.femaleCount += 1;
        }

        const ideology = getIdeology(partyName);
        ideologyGroups[ideology] += 1;
    });

    // Determine dominant ideology
    let max = 0;
    let dom = 'Centro';
    Object.entries(ideologyGroups).forEach(([k, v]) => {
        if (v > max) { max = v; dom = k; }
    });

    return {
        partyStats: Object.values(groups).filter(g => g.totalMembers > 0),
        genderStats: genderGroups,
        ideologyStats: ideologyGroups,
        dominantIdeology: dom,
        isOffline: false
    };
  }, [politicians, parties]);

  const femaleCount = Number(genderStats['F'] || 0);
  const totalPols = Math.max(politicians.length, 1);
  const femalePercentage = (femaleCount / totalPols) * 100;

  useEffect(() => {
      const timer = setTimeout(() => {
          setChartAnimatedPct(femalePercentage);
      }, 300);
      return () => clearTimeout(timer);
  }, [femalePercentage]);

  const partiesWithWomen = partyStats.filter(p => p.femaleCount > 0).sort((a,b) => b.femaleCount - a.femaleCount);
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
              subtitle = isOffline ? "Dados de membros indisponíveis no momento." : "Tamanho e membros de cada partido.";
              colorClass = "text-blue-600";
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
          data = data.filter(p => p.name.toLowerCase().includes(search));
      }

      return { title, subtitle, colorClass, data, metricFormatter };
  };

  const detailConfig = getDetailData();

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-black font-sans overflow-y-auto pb-32">
        <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 space-y-6 relative z-10">
            
            {/* Header Title */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Raio-X do Congresso</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">Análise de composição e forças políticas.</p>
                </div>
                {isOffline && <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase">Modo Offline</span>}
            </div>

            {/* Top Summary Cards (Quick Stats) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryCard 
                    label="Total de Cadeiras" 
                    value={totalPols} 
                    subtext="Parlamentares em exercício"
                    icon={UserCheck} 
                    color="bg-blue-500" 
                />
                <SummaryCard 
                    label="Participação Feminina" 
                    value={`${femalePercentage.toFixed(1)}%`} 
                    subtext={`${femaleCount} mulheres eleitas`}
                    icon={Users} 
                    color="bg-green-500" 
                />
                <SummaryCard 
                    label="Maioria Ideológica" 
                    value={dominantIdeology} 
                    subtext="Tendência predominante"
                    icon={Scale} 
                    color="bg-yellow-500"
                    className="sm:col-span-2 lg:col-span-1"
                />
            </div>

            {/* Bento Grid Layout - Altura automática para adaptação ao conteúdo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                
                {/* Left Column (Ranking) - Altura fixa para lista longa */}
                <div className="order-2 md:order-1 md:col-span-1 lg:col-span-4 h-[500px]">
                    <PartyRankingChart 
                        data={partyStats} 
                        onClick={() => { setActiveDetail('composition'); setExpandedParty(null); }}
                        isOffline={isOffline}
                    />
                </div>

                {/* Right Column (Charts) - Altura natural */}
                <div className="order-1 md:order-2 md:col-span-1 lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Ideology Spectrum (Horizontal) - Compacto */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center h-auto">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 shadow-sm">
                                <Compass size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Espectro Político</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Equilíbrio de Forças</p>
                            </div>
                        </div>
                        <div className="flex items-center pt-2 pb-1">
                            <IdeologySpectrum 
                                left={ideologyStats['Esquerda'] || 0} 
                                center={ideologyStats['Centro'] || 0} 
                                right={ideologyStats['Direita'] || 0} 
                            />
                        </div>
                    </div>

                    {/* Gender Distribution - Altura ajustada ao conteúdo */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col relative overflow-hidden h-auto">
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 shadow-sm"><Users size={18}/></div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Representatividade</h3>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">Mulheres por Partido</p>
                                </div>
                            </div>
                            {selectedGenderParty && (
                                <button onClick={() => setSelectedGenderParty(null)} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full font-bold hover:bg-gray-200 transition-colors">
                                    <ChevronLeft size={12}/> Voltar
                                </button>
                            )}
                        </div>

                        {/* Flex Container: Chart Left, List Right */}
                        <div className="flex flex-col lg:flex-row gap-8 relative z-10 items-center">
                            
                            {/* CHART AREA */}
                            <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-auto">
                                <div className="relative w-40 h-40">
                                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                        {/* Background Track */}
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f3f4f6" strokeWidth="3" className="dark:stroke-gray-800" />
                                        
                                        {/* Progress Arc */}
                                        <path 
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                            fill="none" 
                                            stroke="#22c55e" 
                                            strokeWidth="3" 
                                            strokeLinecap="round" 
                                            strokeDasharray={`${chartAnimatedPct}, 100`} 
                                            className="transition-all duration-[1500ms] ease-out drop-shadow-sm"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white">{femalePercentage.toFixed(0)}%</span>
                                        <span className="text-[9px] uppercase font-bold text-green-600 dark:text-green-400">Mulheres</span>
                                    </div>
                                </div>
                                
                                {/* Simple Legend */}
                                <div className="flex gap-4 mt-4">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div> Mulheres
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                        <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-800"></div> Homens
                                    </div>
                                </div>
                            </div>

                            {/* LIST AREA - Altura limitada para scroll */}
                            <div className="flex-1 w-full min-h-0 flex flex-col border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-800 pt-4 lg:pt-0 lg:pl-6 h-[240px]">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-xs font-black uppercase text-gray-400">
                                        {selectedGenderParty ? `Mulheres no ${formatPartyName(selectedGenderParty)}` : 'Ranking por Partido'}
                                    </p>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                    {!selectedGenderParty ? (
                                        partiesWithWomen.slice(0, 100).map((party) => (
                                            <button 
                                                key={party.name} 
                                                onClick={() => setSelectedGenderParty(party.name)} 
                                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all group"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-[9px] font-black text-gray-500 border border-gray-200 group-hover:border-green-300 shadow-sm shrink-0">
                                                    {formatPartyName(party.name)}
                                                </div>
                                                
                                                <div className="flex-1">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatPartyName(party.name)}</span>
                                                        <span className="text-xs font-bold text-green-600">{party.femaleCount}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden w-full">
                                                        <div 
                                                            className="h-full bg-green-500 rounded-full" 
                                                            style={{ width: `${(party.femaleCount / (partiesWithWomen[0].femaleCount||1))*100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={12} className="text-gray-300 group-hover:text-green-500"/>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedGenderPartyMembers.map(pol => (
                                                <div 
                                                    key={pol.id} 
                                                    onClick={() => onSelectCandidate && onSelectCandidate(pol)} 
                                                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 hover:border-green-400 cursor-pointer transition-all hover:bg-white dark:hover:bg-gray-800 shadow-sm"
                                                >
                                                    <img src={pol.photo} className="w-7 h-7 rounded-full object-cover bg-gray-200" alt=""/>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{pol.name}</p>
                                                        <p className="text-[9px] text-gray-500 font-medium">{pol.state}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

        {/* Modal de Detalhes (Mantido igual, apenas ajuste visual) */}
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
                        <button onClick={() => { setActiveDetail(null); setDetailSearch(''); setExpandedParty(null); }} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-blue-600 transition-colors"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                        {detailConfig.data.map((party, idx) => (
                            <div key={party.name} onClick={() => !isOffline && setExpandedParty(expandedParty === party.name ? null : party.name)} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 text-sm">#{idx + 1}</div>
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-gray-700 dark:text-gray-300 text-xs shadow-sm">{formatPartyName(party.name)}</div>
                                        <div><h4 className="font-bold text-gray-900 dark:text-white text-lg">{formatPartyName(party.name)}</h4></div>
                                    </div>
                                    {!isOffline && <span className={`text-lg font-black ${detailConfig.colorClass}`}>{detailConfig.metricFormatter(activeDetail === 'composition' || activeDetail === 'ideology' ? party.totalMembers : party.avgSpending)}</span>}
                                </div>
                                {expandedParty === party.name && !isOffline && (
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
