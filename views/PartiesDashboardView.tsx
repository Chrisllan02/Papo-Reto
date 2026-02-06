
import React, { useMemo, useState } from 'react';
import { Users, Compass, Trophy, TrendingDown, UserCheck, Scale, MapPin, ShieldCheck, HelpCircle, Calendar, Info, TrendingUp, Minus, Check, AlertTriangle, Unlock, Globe, PieChart, ChevronRight, X, Grid, MousePointerClick, ChevronDown, ChevronUp } from 'lucide-react';
import { Politician, FeedItem, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { getIdeologyTheme } from '../utils/themeUtils';

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
  avgAttendance: number; // Dado Real
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
    const [isExpanded, setIsExpanded] = useState(false);

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

    const visibleWithWomen = isExpanded ? stats.withWomen : stats.withWomen.slice(0, 6);
    const visibleWithoutWomen = isExpanded ? stats.withoutWomen : stats.withoutWomen.slice(0, 8);

    return (
        <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-5 md:p-6 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-6 h-full w-full relative overflow-hidden group hover:shadow-2xl transition-shadow">
            
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
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg backdrop-blur-sm">
                            <Users size={14} />
                        </div>
                        <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">Representatividade</h4>
                    </div>
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                        {isExpanded ? 'Ver menos' : 'Ver todos'}
                        {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Column 1: Parties WITH Women */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black text-green-600 dark:text-green-400 uppercase border-b border-gray-100/50 dark:border-white/10 pb-1">
                            Com Mulheres ({stats.withWomen.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleWithWomen.map(([party, count]) => (
                                <div key={party} className="flex items-center gap-1 bg-orange-50/50 dark:bg-white/5 border border-orange-100 dark:border-white/10 px-2 py-1 rounded-md backdrop-blur-sm">
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200">{party}</span>
                                    <span className="text-[9px] font-black text-orange-600 bg-white dark:bg-gray-800 px-1.5 rounded-full shadow-sm">{count}</span>
                                </div>
                            ))}
                            {!isExpanded && stats.withWomen.length > 6 && (
                                <span className="text-[9px] font-bold text-gray-400 self-center">+{stats.withWomen.length - 6}</span>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Parties WITHOUT Women */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase border-b border-gray-100/50 dark:border-white/10 pb-1">
                            Sem Mulheres ({stats.withoutWomen.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleWithoutWomen.map((party) => (
                                <span key={party} className="text-[9px] font-bold text-gray-400 bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 px-2 py-1 rounded-md opacity-70 backdrop-blur-sm">
                                    {party}
                                </span>
                            ))}
                             {!isExpanded && stats.withoutWomen.length > 8 && (
                                <span className="text-[9px] font-bold text-gray-400 self-center">+{stats.withoutWomen.length - 8}</span>
                            )}
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

    const leftTheme = getIdeologyTheme('Esquerda');
    const centerTheme = getIdeologyTheme('Centro');
    const rightTheme = getIdeologyTheme('Direita');

    const data = [
        { label: 'Esq.', fullLabel: 'Esquerda', count: left, color: leftTheme.fillColorClass, track: leftTheme.trackBg, text: leftTheme.textColorClass },
        { label: 'Cent.', fullLabel: 'Centro', count: center, color: centerTheme.fillColorClass, track: centerTheme.trackBg, text: centerTheme.textColorClass },
        { label: 'Dir.', fullLabel: 'Direita', count: right, color: rightTheme.fillColorClass, track: rightTheme.trackBg, text: rightTheme.textColorClass }
    ];

    return (
        <div className="w-full flex flex-row items-end justify-between gap-3 h-full px-2 pb-2 overflow-x-auto" aria-label={`Espectro Político: Esquerda ${left}, Centro ${center}, Direita ${right}`}>
            {data.map((item) => {
                const heightPct = ((item.count as number) / (maxVal as number)) * 100;
                const realPct = Math.round((item.count / total) * 100);

                return (
                    <div key={item.label} className="flex-1 min-w-[80px] flex flex-col items-center justify-end h-full group cursor-default">
                        <div className="mb-2 text-center transition-transform group-hover:-translate-y-1 duration-300">
                            <span className="block text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                {realPct}%
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider opacity-60 ${item.text}`}>
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

// --- WIDGET MOSAICO DE REGIÕES (Otimizado Mobile) ---
const REGIONS_STRUCT = [
    { name: 'Norte', states: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'], color: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-400' },
    { name: 'Nordeste', states: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'], color: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 text-orange-700 dark:text-orange-400' },
    { name: 'Centro-Oeste', states: ['DF', 'GO', 'MT', 'MS'], color: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    { name: 'Sudeste', states: ['ES', 'MG', 'RJ', 'SP'], color: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30 text-blue-700 dark:text-blue-400' },
    { name: 'Sul', states: ['PR', 'RS', 'SC'], color: 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
];

// --- NOVO COMPONENTE: PIE CHART DE PARTIDOS ---
const PartyPieChart = ({ data, total }: { data: { name: string, value: number, percent: number, color: string }[], total: number }) => {
    const size = 200;
    const strokeWidth = 40;
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    let accumulatedPercent = 0;

    return (
        <div className="flex flex-col items-center justify-center w-full h-full py-4 animate-in fade-in zoom-in duration-300">
            <div className="relative w-48 h-48 flex items-center justify-center shrink-0 mb-4">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-xl">
                    {/* Fundo */}
                    <circle cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" className="text-gray-100 dark:text-white/5" stroke="currentColor" />
                    
                    {data.map((item, i) => {
                        const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                        const rotation = (accumulatedPercent / 100) * 360;
                        const offset = 0; 
                        accumulatedPercent += item.percent;

                        return (
                            <circle
                                key={item.name}
                                cx={center}
                                cy={center}
                                r={radius}
                                strokeWidth={strokeWidth}
                                fill="none"
                                stroke={item.color}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={offset}
                                strokeLinecap="round" 
                                transform={`rotate(${rotation} ${center} ${center})`}
                                className="transition-all duration-1000 ease-out hover:opacity-90 cursor-pointer"
                            >
                                <title>{item.name}: {item.value} ({Math.round(item.percent)}%)</title>
                            </circle>
                        );
                    })}
                </svg>
                {/* Texto Central */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{total}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Repres.</span>
                </div>
            </div>

            {/* Legenda */}
            <div className="w-full grid grid-cols-2 gap-2 px-2">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center justify-between bg-white/50 dark:bg-white/5 px-2 py-1.5 rounded-lg border border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            <div className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-gray-500">{Math.round(item.percent)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GeoDistributionWidget = ({ politicians }: { politicians: Politician[] }) => {
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<string>('Sudeste');

    const stateCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        politicians.forEach(p => {
            if (p.state) counts[p.state] = (counts[p.state] || 0) + 1;
        });
        return counts;
    }, [politicians]);

    // Prepara dados para o Gráfico de Pizza
    const pieChartData = useMemo(() => {
        const sourcePoliticians = selectedState 
            ? politicians.filter(p => p.state === selectedState) 
            : politicians;
        
        const total = Math.max(sourcePoliticians.length, 1);
        const partyCounts: Record<string, number> = {};
        
        sourcePoliticians.forEach(p => {
            const pName = p.party || 'S/P';
            partyCounts[pName] = (partyCounts[pName] || 0) + 1;
        });

        const getPartyColor = (idx: number, name: string) => {
            if (name === 'OUTROS') return '#94a3b8'; // Neutral gray
            const ide = getIdeology(name);
            return getIdeologyTheme(ide).baseColor;
        };

        const sorted = Object.entries(partyCounts)
            .sort((a, b) => b[1] - a[1]);

        // Pega Top 5 e agrupa o resto em "Outros"
        const top5 = sorted.slice(0, 5);
        const othersCount = sorted.slice(5).reduce((acc, curr) => acc + curr[1], 0);
        
        const finalData = top5.map(([name, val], i) => ({
            name,
            value: val,
            percent: (val / total) * 100,
            color: getPartyColor(i, name)
        }));

        if (othersCount > 0) {
            finalData.push({
                name: 'OUTROS',
                value: othersCount,
                percent: (othersCount / total) * 100,
                color: '#64748b' // Slate 500
            });
        }

        return {
            title: selectedState ? `Partidos em ${selectedState}` : 'Cenário Partidário Nacional',
            subtitle: selectedState ? 'Distribuição Estadual' : 'Distribuição no Congresso',
            data: finalData,
            total
        };
    }, [politicians, selectedState]);

    const activeRegionData = REGIONS_STRUCT.find(r => r.name === selectedRegion) || REGIONS_STRUCT[3];

    return (
        <section className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-4 md:p-6 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] min-h-[550px] w-full relative overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-100/50 dark:bg-blue-900/30 rounded-xl text-blue-600 shadow-sm backdrop-blur-sm">
                        <Globe size={18} aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Força Regional</h3>
                        <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wide">Distribuição nos Estados</p>
                    </div>
                </div>
                {selectedState && (
                    <button 
                        onClick={() => setSelectedState(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                    >
                        <X size={12} /> Limpar
                    </button>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-stretch flex-1 relative z-10">
                {/* Seletor de Estados (Tabs + Grid) */}
                <div className="w-full lg:w-3/5 flex flex-col gap-4">
                    
                    {/* Region Tabs (Scrollable on Mobile) */}
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {REGIONS_STRUCT.map(region => (
                            <button
                                key={region.name}
                                onClick={() => { setSelectedRegion(region.name); setSelectedState(null); }}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase whitespace-nowrap transition-all border ${
                                    selectedRegion === region.name
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-100 dark:border-white/5 hover:bg-gray-100'
                                }`}
                            >
                                {region.name}
                            </button>
                        ))}
                    </div>

                    {/* States Grid for Active Region */}
                    <div className={`p-4 rounded-3xl border flex-1 ${activeRegionData.color} flex flex-col relative transition-colors duration-300`}>
                        <div className="flex justify-between items-center mb-3">
                            <span className="font-black uppercase tracking-wider text-sm flex items-center gap-2">
                                <MapPin size={14}/> {activeRegionData.name}
                            </span>
                            <span className="text-[10px] font-bold bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full opacity-80">
                                {activeRegionData.states.reduce((acc, uf) => acc + (stateCounts[uf] || 0), 0)} Reps
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 content-start">
                            {activeRegionData.states.map(uf => {
                                const isActive = selectedState === uf;
                                const count = stateCounts[uf] || 0;
                                return (
                                    <button
                                        key={uf}
                                        onClick={() => setSelectedState(prev => prev === uf ? null : uf)}
                                        className={`py-3 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center gap-1 border shadow-sm ${
                                            isActive
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105 z-20 ring-2 ring-white dark:ring-midnight'
                                            : 'bg-white/80 dark:bg-black/20 text-gray-700 dark:text-gray-300 border-transparent hover:bg-white hover:scale-105'
                                        }`}
                                    >
                                        <span>{uf}</span>
                                        <span className={`text-[9px] font-bold ${isActive ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {!selectedState && (
                            <div className="mt-auto pt-4 text-center">
                                <p className="text-[10px] uppercase font-bold opacity-60 flex items-center justify-center gap-1">
                                    <MousePointerClick size={12}/> Selecione um estado
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pie Chart Card */}
                <div className="w-full lg:w-2/5 animate-in slide-in-from-right-4 fade-in duration-300 bg-gray-50/50 dark:bg-white/5 p-4 rounded-[2.5rem] border border-gray-100 dark:border-white/5 flex flex-col" key={selectedState || 'br'}>
                    <div className="mb-2 text-center">
                        <h4 className="font-black text-gray-900 dark:text-white text-sm">{pieChartData.title}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{pieChartData.subtitle}</p>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center">
                        <PartyPieChart data={pieChartData.data} total={pieChartData.total} />
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- SVG MATH HELPERS ---
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
    const [hoveredParty, setHoveredParty] = useState<string | null>(null);
    const totalSeats = data.reduce((acc, p) => acc + p.totalMembers, 0) || 513;
    
    // Sort logic
    const sortedParties = useMemo(() => {
        const orderMap: Record<string, number> = { 'Esquerda': 1, 'Centro': 2, 'Direita': 3 };
        return [...data].sort((a, b) => {
            const ideA = getIdeology(a.name);
            const ideB = getIdeology(b.name);
            
            // Explicitly typed as number to avoid arithmetic errors
            const valA: number = orderMap[ideA] || 0;
            const valB: number = orderMap[ideB] || 0;
            
            if (valA !== valB) return valA - valB;
            return b.totalMembers - a.totalMembers;
        });
    }, [data]);

    const getPartyColor = (name: string) => {
        const ideology = getIdeology(name);
        return getIdeologyTheme(ideology).baseColor;
    };

    const centerX = 200;
    const centerY = 200;
    const radius = 130; 
    const strokeWidth = 50; // Slightly thinner to show separation
    const totalAngle = 180; 
    let currentAngle = 0; 

    // Handle interaction bridging
    const effectiveActive = hoveredParty || activeParty;

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

            {/* Graphic Container */}
            <div className="relative w-full max-w-[650px] aspect-[1.8/1] min-h-[220px] flex items-end justify-center mb-6 md:mb-10">
                <svg viewBox="0 0 400 230" className="w-full h-full overflow-visible drop-shadow-2xl" role="img">
                    {/* Background Track */}
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
                        
                        // Dynamic gap: smaller gap for small parties to prevent disappearance
                        const gap = seats > 3 ? 1.5 : (seats > 1 ? 0.8 : 0.2);
                        
                        const start = currentAngle;
                        const end = currentAngle + sliceDegrees - (sliceDegrees > gap ? gap : 0);
                        const nextStart = currentAngle + sliceDegrees;
                        currentAngle = nextStart;

                        if (seats === 0) return null;

                        const pathData = describeArc(centerX, centerY, radius, start, end);
                        const isHighlighted = effectiveActive === party.name;
                        const isDimmed = effectiveActive && !isHighlighted;
                        const color = getPartyColor(party.name);

                        return (
                            <g 
                                key={party.name} 
                                className="group cursor-pointer"
                                onClick={() => onClick(party.name)}
                                onMouseEnter={() => setHoveredParty(party.name)}
                                onMouseLeave={() => setHoveredParty(null)}
                            >
                                <path
                                    d={pathData}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap={seats > 2 ? "round" : "butt"} 
                                    className={`transition-all duration-300 ease-out hover:stroke-[58px]
                                        ${isHighlighted ? 'opacity-100 stroke-[58px]' : isDimmed ? 'opacity-20' : 'opacity-90'}
                                    `}
                                />
                                <title>{party.name}: {party.totalMembers} cadeiras</title>
                            </g>
                        );
                    })}

                    {/* Center Text */}
                    <g className="transition-all duration-300 transform translate-y-2 pointer-events-none">
                        <text x="200" y="175" textAnchor="middle" className="text-4xl md:text-6xl font-black fill-gray-900 dark:fill-white tracking-tighter drop-shadow-sm">
                            {effectiveActive ? data.find(p => p.name === effectiveActive)?.totalMembers : totalSeats}
                        </text>
                        <text x="200" y="200" textAnchor="middle" className="text-[10px] md:text-xs font-black uppercase fill-gray-400 tracking-[0.3em]">
                            {effectiveActive ? formatPartyName(effectiveActive) : 'Total de Cadeiras'}
                        </text>
                    </g>
                </svg>
            </div>

            {/* List of Parties (Interactive Legend) */}
            <div className="w-full flex flex-wrap gap-1.5 md:gap-2 justify-center content-start overflow-y-auto max-h-[140px] md:max-h-[160px] custom-scrollbar pr-1 pb-4">
                {sortedParties.map(p => (
                    <button
                        key={p.name}
                        onClick={() => onClick(p.name)}
                        onMouseEnter={() => setHoveredParty(p.name)}
                        onMouseLeave={() => setHoveredParty(null)}
                        aria-pressed={activeParty === p.name}
                        className={`px-3 py-1.5 rounded-full text-[9px] md:text-[10px] font-black uppercase border transition-all active:scale-95 flex items-center gap-1.5 backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${
                            activeParty === p.name || hoveredParty === p.name
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                            : 'bg-gray-50/50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-transparent hover:bg-white/60 dark:hover:bg-white/10 shadow-sm opacity-80 hover:opacity-100'
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

// --- DATA INTEGRITY FIX: Attendance Card (Substitutes Fake Cohesion) ---
const AttendanceCard = ({ data, selectedParty }: { data: PartyStats[], selectedParty?: string | null }) => {
    // Uses Calculated Average Attendance instead of Fake Cohesion
    const avgOverall = data.reduce((acc, p) => acc + p.avgAttendance, 0) / (data.length || 1);
    const stats = selectedParty ? data.find(p => p.name === selectedParty) : null;
    const value = stats ? stats.avgAttendance : avgOverall;
    
    // Configurações do Visual
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    
    const getStatus = (score: number) => {
        if (score >= 90) return { label: 'Assiduidade Alta', color: 'text-green-500', bg: 'bg-green-100/50 dark:bg-green-900/20' };
        if (score >= 70) return { label: 'Assiduidade Média', color: 'text-blue-500', bg: 'bg-blue-100/50 dark:bg-blue-900/20' }; 
        return { label: 'Assiduidade Baixa', color: 'text-red-500', bg: 'bg-red-100/50 dark:bg-red-900/20' };
    };

    const status = getStatus(value);

    return (
        <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-between relative overflow-hidden min-h-[400px] group w-full">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={`p-3 bg-green-100/50 dark:bg-green-900/30 rounded-2xl text-green-600 shadow-sm backdrop-blur-sm`}>
                        <UserCheck size={28} aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-xl md:text-2xl leading-tight">Assiduidade Média</h3>
                        <p className="text-xs md:text-sm text-gray-500 font-bold uppercase tracking-wide">Presença em Sessões</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-between gap-10 flex-1 relative z-10 py-4">
                
                {/* Main Gauge Graphic */}
                <div className="relative w-64 h-64 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-xl" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="2 4" className="text-gray-200 dark:text-gray-800" />
                        {/* Background Ghost Arc */}
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="16" strokeDasharray={`2 ${circumference}`} strokeDashoffset={-(circumference * (avgOverall / 100))} className="text-gray-400 dark:text-gray-600 opacity-30" transform={`rotate(0 100 100)`} />
                        {/* Value Arc */}
                        <circle cx="100" cy="100" r={radius} fill="none" strokeLinecap="round" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} className={`transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${value >= 90 ? 'text-green-500' : value >= 70 ? 'text-blue-500' : 'text-red-500'}`} stroke="currentColor" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-6xl font-black text-gray-900 dark:text-white tracking-tighter">
                            {value.toFixed(0)}<span className="text-2xl align-top opacity-50">%</span>
                        </span>
                        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-wider backdrop-blur-sm border border-white/10 ${status.bg} ${status.color}`}>
                            {status.label}
                        </div>
                    </div>
                </div>

                {/* Explanatory Table */}
                <div className="flex-1 w-full space-y-4 bg-gray-50/50 dark:bg-white/5 p-6 rounded-3xl border border-gray-100/50 dark:border-white/5 backdrop-blur-sm">
                    <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b border-gray-200 dark:border-gray-700 pb-3 mb-2">Média da Bancada</h4>
                    
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Alta (+90%)</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Presença constante em sessões deliberativas.</p>
                        </div>

                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Média (70-90%)</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Frequência regular, com algumas ausências justificadas.</p>
                        </div>

                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Baixa (-70%)</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Alto índice de faltas não justificadas ou licenças.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians, parties = [], onSelectCandidate }) => {
  const [expandedPartyName, setExpandedPartyName] = useState<string | null>(null);

  const { partyStats, ideologyStats } = useMemo(() => {
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
        }
    });

    return {
        partyStats: Object.values(groups).filter(g => g.totalMembers > 0),
        ideologyStats: ideologyGroups,
    };
  }, [politicians]);

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-32">
        <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-6 space-y-8 relative z-10 px-safe">
            <div className="pt-safe">
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Cenário Político</h1>
                <p className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest mt-1.5">Raio-X das Forças do Congresso Nacional</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <FemaleRepresentationWidget politicians={politicians} />
            </div>

            {/* Layout Flex para controle vertical */}
            <div className="flex flex-col gap-8">
                <ParliamentHemicycle data={partyStats} onClick={(name) => setExpandedPartyName(name === expandedPartyName ? null : name)} activeParty={expandedPartyName} />
                
                <div className="w-full pb-4">
                    <GeoDistributionWidget politicians={politicians} />
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-2">
                    <div className="bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col justify-center min-h-[400px]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-xl text-yellow-600 shadow-sm backdrop-blur-sm">
                                <Compass size={18} aria-hidden="true" />
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Espectro Político</h3>
                        </div>
                        <IdeologySpectrum left={ideologyStats['Esquerda']} center={ideologyStats['Centro']} right={ideologyStats['Direita']} />
                    </div>

                    <AttendanceCard data={partyStats} selectedParty={expandedPartyName} />
                </div>
            </div>
        </div>
    </div>
  );
};

export default PartiesDashboardView;
