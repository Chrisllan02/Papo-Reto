
import React, { useMemo, useState, useEffect } from 'react';
import { Users, Compass, Trophy, TrendingDown, UserCheck, Scale, MapPin, ShieldCheck, HelpCircle, Calendar, Info, TrendingUp, Minus, Check, AlertTriangle, Unlock, Globe, PieChart, ChevronRight } from 'lucide-react';
import { Politician, FeedItem, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { QUIZ_QUESTIONS } from '../constants';
import BrazilMap from '../components/BrazilMap';

interface PartiesDashboardViewProps {
  politicians: Politician[];
  parties?: Party[];
  feedItems?: FeedItem[];
  onSelectCandidate?: (pol: Politician) => void;
}

interface RegionStats {
    Norte: number;
    Nordeste: number;
    CentroOeste: number;
    Sudeste: number;
    Sul: number;
}

interface PartyStats {
  name: string;
  totalMembers: number;
  femaleCount: number; 
  totalSpending: number;
  avgSpending: number;
  avgAttendance: number; 
  cohesionIndex: number; 
  regionStats: RegionStats;
  members: Politician[];
}

const getRegion = (uf: string): keyof RegionStats => {
    const cleanUF = uf ? uf.trim().toUpperCase() : 'DF';
    const regions: Record<string, keyof RegionStats> = {
        'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
        'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
        'DF': 'CentroOeste', 'GO': 'CentroOeste', 'MT': 'CentroOeste', 'MS': 'CentroOeste',
        'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
        'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
    };
    return regions[cleanUF] || 'Sudeste'; 
};

// --- WIDGET DE REPRESENTAÇÃO FEMININA ---
const FemaleRepresentationWidget = ({ politicians }: { politicians: Politician[] }) => {
    const stats = useMemo(() => {
        const total = Math.max(politicians.length, 1);
        const women = politicians.filter(p => p.sex === 'F');
        const womenCount = women.length;
        const percentage = ((womenCount / total) * 100).toFixed(1);

        // Agrupamento por partido
        const partyCounts: Record<string, number> = {};
        const allParties = new Set<string>();
        
        politicians.forEach(p => {
            const pName = p.party || 'S/P';
            allParties.add(pName);
            if (p.sex === 'F') {
                partyCounts[pName] = (partyCounts[pName] || 0) + 1;
            }
        });

        const withWomen = Object.entries(partyCounts)
            .sort((a, b) => b[1] - a[1]); // Ordernar por quem tem mais mulheres

        const withoutWomen = Array.from(allParties)
            .filter(p => !partyCounts[p])
            .sort();

        return { total, womenCount, percentage, withWomen, withoutWomen };
    }, [politicians]);

    // Configuração do SVG Donut
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (parseFloat(stats.percentage) / 100) * circumference;

    return (
        <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-5 md:p-6 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-6 h-full min-h-[260px] w-full relative overflow-hidden group hover:shadow-2xl transition-shadow">
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Left: Chart & Main Stat */}
            <div className="flex flex-col items-center justify-center shrink-0 relative">
                <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 100 100">
                        {/* Track */}
                        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-200 dark:text-gray-700/50" />
                        {/* Progress */}
                        <circle 
                            cx="50" cy="50" r={radius} 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="8" 
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="text-orange-500 transition-all duration-1000 ease-out drop-shadow-md"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{stats.percentage}%</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Mulheres</span>
                    </div>
                </div>
                <div className="mt-2 text-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total: {stats.womenCount}</p>
                </div>
            </div>

            {/* Right: Breakdown Lists */}
            <div className="flex-1 w-full flex flex-col gap-3 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg backdrop-blur-sm">
                        <Users size={14} />
                    </div>
                    <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Representatividade</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-48 overflow-y-auto custom-scrollbar pr-2">
                    {/* Column 1: Parties WITH Women */}
                    <div>
                        <p className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase mb-2 sticky top-0 bg-white/60 dark:bg-midnight/90 backdrop-blur-md py-1 z-10 border-b border-gray-100/50 dark:border-white/10">
                            Com Mulheres ({stats.withWomen.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.withWomen.map(([party, count]) => (
                                <div key={party} className="flex items-center gap-1 bg-orange-50/50 dark:bg-white/5 border border-orange-100 dark:border-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{party}</span>
                                    <span className="text-[9px] font-black text-orange-600 bg-white dark:bg-gray-800 px-1.5 rounded-full shadow-sm">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Parties WITHOUT Women */}
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-2 sticky top-0 bg-white/60 dark:bg-midnight/90 backdrop-blur-md py-1 z-10 border-b border-gray-100/50 dark:border-white/10">
                            Sem Mulheres ({stats.withoutWomen.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.withoutWomen.map((party) => (
                                <span key={party} className="text-[9px] font-bold text-gray-400 bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 px-2 py-1 rounded-md opacity-70 backdrop-blur-sm">
                                    {party}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const IdeologySpectrum = ({ left, center, right }: { left: number, center: number, right: number }) => {
    const total = Math.max(left + center + right, 1);
    const maxVal = Math.max(left, center, right, 1); 

    // Updated colors to avoid semantic conflict
    const data = [
        { label: 'Esq.', fullLabel: 'Esquerda', count: left, color: 'bg-rose-500', track: 'bg-rose-100/50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400' },
        { label: 'Cent.', fullLabel: 'Centro', count: center, color: 'bg-amber-400', track: 'bg-amber-100/50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
        { label: 'Dir.', fullLabel: 'Direita', count: right, color: 'bg-indigo-600', track: 'bg-indigo-100/50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' }
    ];

    return (
        <div className="w-full flex flex-row items-end justify-between gap-3 h-full px-2 pb-2" aria-label={`Espectro Político: Esquerda ${left}, Centro ${center}, Direita ${right}`}>
            {data.map((item) => {
                const heightPct = ((item.count as number) / (maxVal as number)) * 100;
                const realPct = Math.round((item.count / total) * 100);

                return (
                    <div key={item.label} className="flex-1 flex flex-col items-center justify-end h-full group cursor-default">
                        <div className="mb-2 text-center transition-transform group-hover:-translate-y-1 duration-300">
                            <span className="block text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                {realPct}%
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest opacity-60 ${item.text}`}>
                                {item.count} cadeiras
                            </span>
                        </div>

                        <div className={`w-full max-w-[60px] h-64 md:h-80 rounded-full ${item.track} relative overflow-hidden backdrop-blur-md border border-white/20`}>
                            <div 
                                className={`absolute bottom-0 left-0 right-0 w-full rounded-full ${item.color} shadow-lg transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:brightness-110`}
                                style={{ height: `${Math.max(heightPct, 5)}%` }} 
                            ></div>
                        </div>

                        <div className={`mt-3 px-3 py-1 rounded-lg ${item.track} backdrop-blur-md border border-white/10`}>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${item.text}`}>
                                {item.fullLabel}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- GEO DISTRIBUTION WIDGET ---
const GeoDistributionWidget = ({ politicians }: { politicians: Politician[] }) => {
    const stateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        politicians.forEach(p => {
            if (p.state) counts[p.state] = (counts[p.state] || 0) + 1;
        });
        return counts;
    }, [politicians]);

    const total = politicians.length || 1;
    const topStates = Object.entries(stateCounts)
        .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
        .slice(0, 5);

    return (
        <section className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] min-h-[550px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl text-blue-600 shadow-sm backdrop-blur-sm">
                    <Globe size={18} aria-hidden="true" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Força Regional</h3>
                    <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Distribuição de Parlamentares</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center h-full">
                {/* Map Area */}
                <div className="w-full lg:w-1/2 h-[450px]">
                    <BrazilMap data={stateCounts} heatmapMode={true} />
                </div>

                {/* Ranking List */}
                <div className="w-full lg:w-1/2 space-y-3">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2">Maiores Bancadas Estaduais</p>
                    {topStates.map(([uf, count]: [string, number], index: number) => {
                        const percent = ((count / total) * 100).toFixed(1);
                        const maxVal = topStates[0][1] as number;
                        return (
                            <div key={uf} className="flex items-center gap-3">
                                <span className="w-6 text-[10px] font-black text-gray-400">#{index + 1}</span>
                                <div className="flex-1 bg-gray-100/50 dark:bg-white/5 rounded-full h-8 relative overflow-hidden flex items-center px-3 backdrop-blur-sm border border-gray-200/20 dark:border-white/5">
                                    <div 
                                        className="absolute top-0 left-0 bottom-0 bg-blue-100/80 dark:bg-blue-900/40 transition-all duration-1000" 
                                        style={{ width: `${(count / maxVal) * 100}%` }}
                                    ></div>
                                    <span className="relative z-10 text-xs font-bold text-gray-700 dark:text-gray-200">{uf}</span>
                                    <span className="relative z-10 ml-auto text-xs font-black text-blue-600 dark:text-blue-400">{count}</span>
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 w-10 text-right">{percent}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

// --- SVG MATH HELPERS FOR ROUNDED ARCS ---
const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
}

const ParliamentHemicycle = ({ data, onClick, activeParty }: { data: PartyStats[], onClick: (name: string) => void, activeParty: string | null }) => {
    const totalSeats = data.reduce((acc, p) => acc + p.totalMembers, 0) || 513;
    
    // Sort logic
    const sortedParties = useMemo(() => {
        const orderMap = { 'Esquerda': 1, 'Centro': 2, 'Direita': 3 };
        return [...data].sort((a, b) => {
            const ideA = getIdeology(a.name);
            const ideB = getIdeology(b.name);
            if (orderMap[ideA] !== orderMap[ideB]) return (orderMap as any)[ideA] - (orderMap as any)[ideB];
            return b.totalMembers - a.totalMembers;
        });
    }, [data]);

    // Updated Colors for Hemisphere (Rose, Indigo, Amber)
    const getPartyColor = (name: string) => {
        const ideology = getIdeology(name);
        if (ideology === 'Esquerda') return '#F43F5E'; // Rose 500
        if (ideology === 'Direita') return '#4F46E5'; // Indigo 600
        return '#FBBF24'; // Amber 400
    };

    // Configuration for the rounded hemicycle
    const centerX = 200;
    const centerY = 200;
    const radius = 130; 
    const strokeWidth = 55; // Thickness of the arc
    const totalAngle = 180; // Semicircle
    let currentAngle = 0; // Starts from left (which we map to 0-180 logic)

    return (
        <section className="w-full bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between relative overflow-hidden h-auto" aria-labelledby="hemicycle-title">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full mb-4 z-10 gap-4">
                 <div className="flex items-center gap-3">
                     <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-2xl text-blue-600 shadow-sm backdrop-blur-sm">
                         <Trophy size={24} className="md:w-6 md:h-6" aria-hidden="true" />
                     </div>
                     <div>
                        <h3 id="hemicycle-title" className="font-bold text-gray-900 dark:text-white text-lg md:text-xl leading-tight">Distribuição de Cadeiras</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Composição do Congresso</p>
                     </div>
                 </div>
                 <div className="flex gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-wide bg-gray-50/50 dark:bg-white/5 p-2 rounded-xl border border-gray-100/50 dark:border-white/10 backdrop-blur-sm">
                     <span className="flex items-center gap-1.5 text-rose-600"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Esq.</span>
                     <span className="flex items-center gap-1.5 text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Cent.</span>
                     <span className="flex items-center gap-1.5 text-indigo-600"><span className="w-2 h-2 rounded-full bg-indigo-600"></span> Dir.</span>
                 </div>
            </div>

            {/* Graphic Container: Ensure min-height on mobile for better visibility */}
            <div className="relative w-full max-w-[650px] aspect-[1.8/1] min-h-[220px] flex items-end justify-center mb-6 md:mb-10">
                <svg viewBox="0 0 400 230" className="w-full h-full overflow-visible drop-shadow-2xl" role="img" aria-describedby="hemicycle-data-table">
                    
                    {/* Background Track (Ghost Arc) */}
                    <path 
                        d={describeArc(centerX, centerY, radius, 0, 180)}
                        fill="none"
                        stroke="rgba(0,0,0,0.03)"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        className="dark:stroke-white/5"
                    />

                    {sortedParties.map((party) => {
                        const seats = party.totalMembers;
                        const sliceDegrees = (seats / totalSeats) * totalAngle;
                        
                        const gap = seats > 2 ? 1.5 : 0.5; 
                        
                        const start = currentAngle;
                        const end = currentAngle + sliceDegrees - (sliceDegrees > gap ? gap : 0);
                        
                        const nextStart = currentAngle + sliceDegrees;
                        currentAngle = nextStart;

                        const pathData = describeArc(centerX, centerY, radius, start, end);
                        const isActive = activeParty === party.name;
                        const isDimmed = activeParty && !isActive;
                        const color = getPartyColor(party.name);

                        return (
                            <g key={party.name} className="group">
                                <path
                                    d={pathData}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round" 
                                    className={`transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                                        ${isActive ? 'opacity-100 stroke-[65px]' : isDimmed ? 'opacity-20' : 'opacity-90'}
                                    `}
                                />
                                <title>{party.name}: {party.totalMembers} cadeiras</title>
                            </g>
                        );
                    })}

                    {/* Center Text Info (Adjusted size for small screens) */}
                    <g className="transition-all duration-300 transform translate-y-2">
                        <text x="200" y="175" textAnchor="middle" className="text-4xl md:text-6xl font-black fill-gray-900 dark:fill-white tracking-tighter drop-shadow-sm">
                            {activeParty ? data.find(p => p.name === activeParty)?.totalMembers : totalSeats}
                        </text>
                        <text x="200" y="200" textAnchor="middle" className="text-[10px] md:text-xs font-black uppercase fill-gray-400 tracking-[0.3em]">
                            {activeParty ? formatPartyName(activeParty) : 'Total de Cadeiras'}
                        </text>
                    </g>
                </svg>
            </div>

            {/* List of Parties (Legend) */}
            <div className="w-full flex flex-wrap gap-1.5 md:gap-2 justify-center content-start overflow-y-auto max-h-[140px] md:max-h-[160px] custom-scrollbar pr-1 pb-4">
                {sortedParties.map(p => (
                    <button
                        key={p.name}
                        onClick={() => onClick(p.name)}
                        aria-pressed={activeParty === p.name}
                        className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase border transition-all active:scale-95 flex items-center gap-1.5 backdrop-blur-sm ${
                            activeParty === p.name
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-transparent hover:bg-white/60 dark:hover:bg-white/10 shadow-sm'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: getPartyColor(p.name) }}></span>
                        {p.name} 
                        <span className="opacity-60 ml-0.5 pl-1 border-l border-current">({p.totalMembers})</span>
                    </button>
                ))}
            </div>
        </section>
    );
};

const CohesionCard = ({ data, selectedParty }: { data: PartyStats[], selectedParty?: string | null }) => {
    // Cálculo dos dados
    const avgCohesion = data.reduce((acc, p) => acc + p.cohesionIndex, 0) / (data.length || 1);
    const stats = selectedParty ? data.find(p => p.name === selectedParty) : null;
    const cohesion = stats ? stats.cohesionIndex : avgCohesion;
    const diff = cohesion - avgCohesion;
    
    // Configurações do Visual
    const isAboveAvg = diff >= 0;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (cohesion / 100) * circumference;
    
    const getStatus = (score: number) => {
        if (score >= 90) return { label: 'Fidelidade Alta', color: 'text-green-500', bg: 'bg-green-100/50 dark:bg-green-900/20' };
        if (score >= 70) return { label: 'Fidelidade Média', color: 'text-blue-500', bg: 'bg-blue-100/50 dark:bg-blue-900/20' }; // ALTERADO PARA AZUL
        return { label: 'Fidelidade Baixa', color: 'text-red-500', bg: 'bg-red-100/50 dark:bg-red-900/20' };
    };

    const status = getStatus(cohesion);

    return (
        <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between relative overflow-hidden min-h-[400px] group">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3 bg-purple-100/50 dark:bg-purple-900/30 rounded-2xl text-purple-600 shadow-sm backdrop-blur-sm`}>
                        <ShieldCheck size={28} aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-xl md:text-2xl leading-tight">Coesão Partidária</h3>
                        <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-wide">Fidelidade aos Votos</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-10 flex-1 relative z-10 py-4">
                
                {/* Main Gauge Graphic */}
                <div className="relative w-64 h-64 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="2 4" className="text-gray-200 dark:text-gray-800" />
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="16" strokeDasharray={`2 ${circumference}`} strokeDashoffset={-(circumference * (avgCohesion / 100))} className="text-gray-400 dark:text-gray-600 opacity-50" transform={`rotate(0 100 100)`} />
                        <circle cx="100" cy="100" r={radius} fill="none" strokeLinecap="round" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} className={`transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${cohesion >= 90 ? 'text-green-500' : cohesion >= 70 ? 'text-blue-500' : 'text-red-500'}`} stroke="currentColor" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                            {cohesion.toFixed(0)}<span className="text-2xl align-top opacity-50">%</span>
                        </span>
                        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider backdrop-blur-sm border border-white/10 ${status.bg} ${status.color}`}>
                            {status.label}
                        </div>
                    </div>
                </div>

                {/* Explanatory Table */}
                <div className="flex-1 w-full space-y-4 bg-gray-50/50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100/50 dark:border-white/5 backdrop-blur-sm">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b border-gray-200 dark:border-gray-700 pb-3 mb-2">Entenda os Níveis</h4>
                    
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center">
                        {/* High Fidelity */}
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Alta (+90%)</span>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase">Unidos</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Bancada segue rigorosamente a orientação do líder partidário em quase todas as votações.</p>
                        </div>

                        {/* Medium Fidelity */}
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Média (70-90%)</span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Flexíveis</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Maioria segue a liderança, mas dissidentes aparecem em pautas polêmicas ou de costumes.</p>
                        </div>

                        {/* Low Fidelity */}
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Baixa (-70%)</span>
                                <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase">Independentes</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Alta fragmentação. Parlamentares votam por convicção pessoal ou interesses regionais.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians, parties = [], onSelectCandidate }) => {
  const [expandedPartyName, setExpandedPartyName] = useState<string | null>(null);

  const { partyStats, ideologyStats, dominantIdeology } = useMemo(() => {
    const groups: Record<string, PartyStats> = {};
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
                cohesionIndex: 0,
                regionStats: { Norte: 0, Nordeste: 0, CentroOeste: 0, Sudeste: 0, Sul: 0 },
                members: []
            };
        }
        const g = groups[partyName];
        g.members.push(pol);
        g.totalMembers += 1;
        if (pol.sex === 'F') g.femaleCount += 1;
        const ideology = getIdeology(partyName);
        ideologyGroups[ideology] += 1;
        g.avgAttendance += (pol.stats.attendancePct || 0);
        g.regionStats[getRegion(pol.state)] += 1;
    });

    Object.values(groups).forEach(g => {
        if (g.totalMembers > 0) {
            g.avgAttendance /= g.totalMembers;
            g.cohesionIndex = 85; 
        }
    });

    let max = 0;
    let dom = 'Centro';
    Object.entries(ideologyGroups).forEach(([k, v]) => {
        if (v > max) { max = v; dom = k; }
    });

    return {
        partyStats: Object.values(groups).filter(g => g.totalMembers > 0),
        ideologyStats: ideologyGroups,
        dominantIdeology: dom
    };
  }, [politicians]);

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-32">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6 space-y-6 relative z-10 px-safe">
            <div className="pt-safe">
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Cenário Político</h1>
                <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest mt-1.5">Raio-X das Forças do Congresso Nacional</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <FemaleRepresentationWidget politicians={politicians} />
            </div>

            <div className="grid grid-cols-1 gap-6">
                <ParliamentHemicycle data={partyStats} onClick={(name) => setExpandedPartyName(name)} activeParty={expandedPartyName} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <GeoDistributionWidget politicians={politicians} />
                    
                    <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-center min-h-[550px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-xl text-yellow-600 shadow-sm backdrop-blur-sm">
                                <Compass size={18} aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Espectro Político</h3>
                        </div>
                        <IdeologySpectrum left={ideologyStats['Esquerda']} center={ideologyStats['Centro']} right={ideologyStats['Direita']} />
                    </div>
                </div>

                <div className="w-full">
                    <CohesionCard data={partyStats} selectedParty={expandedPartyName} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default PartiesDashboardView;
