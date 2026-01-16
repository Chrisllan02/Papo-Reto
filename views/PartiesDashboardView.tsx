
import React, { useMemo, useState } from 'react';
import { BarChart3, Users, Banknote, Crown, Compass, Activity, Gavel, MapPin, ThumbsUp, ThumbsDown, Clock, Star, ChevronRight, X, FileText, Info, Calculator, ExternalLink, Database, Scale, Lock, CheckCircle2 } from 'lucide-react';
import { Politician, FeedItem } from '../types';
import BrazilMap from '../components/BrazilMap';

interface PartiesDashboardViewProps {
  politicians: Politician[];
  feedItems?: FeedItem[];
  onSelectCandidate?: (pol: Politician) => void;
  onGoToFeed: () => void;
  onGoToExplore: () => void;
}

interface PartyStats {
  name: string;
  totalMembers: number;
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

const METRICS_EXPLANATIONS = {
    ideology: {
        title: "Balança de Poder & Quórum",
        math: "Soma das cadeiras agrupadas por espectro histórico.",
        logic: "Não é apenas um gráfico de pizza. As linhas pontilhadas indicam os 'números mágicos' da política: 257 votos para Leis Comuns e 308 votos para PECs (Emendas Constitucionais). Isso mostra quem tem força para aprovar ou bloquear pautas.",
        source: "Regimento Interno da Câmara",
        link: "https://www2.camara.leg.br/legin/fed/lei/2000-2009/lei-10689-13-junho-2003-516853-normaatual-pl.html"
    },
    types: {
        title: "Tipos de Propostas",
        math: "Classificação das últimas 20 votações nominais registradas no Plenário.",
        logic: "Categorizamos pelo prefixo do título: PL (Projeto de Lei), PEC (Emenda à Constituição), MPV (Medida Provisória).",
        source: "Dados abertos da Câmara: /votacoes",
        link: "https://dadosabertos.camara.leg.br/api/v2/votacoes?ordem=DESC&ordenarPor=dataHoraRegistro"
    },
    gender: {
        title: "Distribuição de Gênero",
        math: "(Total Feminino / Total Parlamentares) * 100",
        logic: "Baseado no campo 'sexo' do cadastro oficial de cada parlamentar na API da Câmara e Senado.",
        source: "Cadastro Parlamentar Oficial",
        link: "https://dadosabertos.camara.leg.br/swagger/api.html"
    }
};

// Componente SVG do Hemciclo com Linhas de Quórum
const ParliamentHemicycle = ({ left, center, right }: { left: number, center: number, right: number }) => {
    const radius = 90; // Aumentei um pouco para caber as linhas
    const stroke = 22;
    const circumference = Math.PI * radius; // Apenas meia circunferência (180 graus)
    
    const total = left + center + right;
    
    if (total === 0) return (
        <div className="w-64 h-32 mx-auto mb-4 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-t-full border-t border-x border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-400 font-bold uppercase">Carregando...</span>
        </div>
    );

    const pLeft = (left / total) * circumference;
    const pCenter = (center / total) * circumference;
    const pRight = (right / total) * circumference;

    // Cálculo das linhas de Quórum (Baseado em 513 deputados)
    // Maioria Simples (257 votos) = ~50.1%
    // PEC (308 votos) = ~60%
    const totalSeats = 513; 
    const pctSimples = 257 / totalSeats; 
    const pctPEC = 308 / totalSeats;

    // Converter porcentagem em graus (0 a 180, da esquerda pra direita)
    // 0% = 180deg (Esquerda) -> 100% = 0deg (Direita) no sistema SVG rotacionado
    // Ajuste fino visual
    const angleSimples = 180 - (pctSimples * 180);
    const anglePEC = 180 - (pctPEC * 180);

    return (
        <div className="relative w-72 h-40 mx-auto mb-2 overflow-hidden group cursor-help">
            <svg viewBox="0 0 220 120" className="w-full h-full drop-shadow-xl overflow-visible">
                {/* Background Track */}
                <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#e5e7eb" strokeWidth={stroke} strokeLinecap="round" className="dark:stroke-gray-800 opacity-50" />
                
                {/* 1. Left Segment (Green/Esquerda) */}
                <circle 
                    cx="110" cy="110" r={radius} 
                    fill="none" 
                    stroke="url(#gradGreen)" 
                    strokeWidth={stroke}
                    strokeDasharray={`${pLeft} ${circumference}`} 
                    strokeDashoffset="0"
                    transform="rotate(180 110 110)"
                    className="transition-all duration-1000 ease-out hover:stroke-width-[26]"
                />

                {/* 2. Center Segment (Yellow/Centro) */}
                <circle 
                    cx="110" cy="110" r={radius} 
                    fill="none" 
                    stroke="url(#gradYellow)" 
                    strokeWidth={stroke}
                    strokeDasharray={`${pCenter} ${circumference}`} 
                    strokeDashoffset={-pLeft} 
                    transform="rotate(180 110 110)"
                    className="transition-all duration-1000 ease-out hover:stroke-width-[26]"
                />

                {/* 3. Right Segment (Blue/Direita) */}
                <circle 
                    cx="110" cy="110" r={radius} 
                    fill="none" 
                    stroke="url(#gradBlue)" 
                    strokeWidth={stroke}
                    strokeDasharray={`${pRight} ${circumference}`} 
                    strokeDashoffset={-(pLeft + pCenter)} 
                    transform="rotate(180 110 110)"
                    className="transition-all duration-1000 ease-out hover:stroke-width-[26]"
                />

                {/* QUORUM LINES (IMPORTANT) */}
                {/* Linha 257 (Maioria Simples) */}
                <g transform={`rotate(${angleSimples} 110 110)`}>
                    <line x1="110" y1="10" x2="110" y2="40" stroke="black" strokeWidth="1" strokeDasharray="2 2" className="dark:stroke-white opacity-60" />
                    <text x="110" y="5" textAnchor="middle" className="text-[6px] font-bold fill-gray-500 dark:fill-gray-400 uppercase" style={{fontSize: '6px'}} transform={`rotate(${-angleSimples} 110 5)`}>257 (Lei)</text>
                </g>

                {/* Linha 308 (PEC) */}
                <g transform={`rotate(${anglePEC} 110 110)`}>
                    <line x1="110" y1="10" x2="110" y2="40" stroke="black" strokeWidth="1.5" strokeDasharray="3 1" className="dark:stroke-white opacity-80" />
                    <text x="110" y="5" textAnchor="middle" className="text-[6px] font-black fill-gray-800 dark:fill-white uppercase" style={{fontSize: '7px'}} transform={`rotate(${-anglePEC} 110 5)`}>308 (PEC)</text>
                </g>

                {/* Definitions for Gradients */}
                <defs>
                    <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#00804C" />
                        <stop offset="100%" stopColor="#74C365" />
                    </linearGradient>
                    <linearGradient id="gradYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#DBE64C" />
                        <stop offset="100%" stopColor="#F9F9A9" />
                    </linearGradient>
                    <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#001F3F" />
                        <stop offset="100%" stopColor="#1E488F" />
                    </linearGradient>
                </defs>
            </svg>
            
            {/* Center Info */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-center z-10">
                <div className="w-14 h-14 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.1)] border-4 border-gray-50 dark:border-gray-800 mx-auto group-hover:scale-110 transition-transform">
                     <Scale size={24} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
            </div>
        </div>
    );
};

const MetricExplanationModal = ({ data, onClose }: { data: any, onClose: () => void }) => {
    if (!data) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative border border-gray-100 dark:border-gray-700 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                    <X size={20}/>
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                        <Calculator size={24}/>
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-gray-900 dark:text-white leading-none">{data.title}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Metodologia</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> A Matemática
                        </h4>
                        <div className="bg-gray-50 dark:bg-black/30 p-4 rounded-2xl font-mono text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800">
                            {data.math}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Lógica Aplicada
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                            {data.logic}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Fonte de Dados
                        </h4>
                        <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group cursor-pointer" onClick={() => window.open(data.link, '_blank')}>
                            <span className="text-xs font-bold text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{data.source}</span>
                            <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-500"/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians, feedItems = [], onSelectCandidate, onGoToFeed, onGoToExplore }) => {
  const [activeDetail, setActiveDetail] = useState<DetailType>(null);
  const [detailSearch, setDetailSearch] = useState('');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const [explanationTarget, setExplanationTarget] = useState<keyof typeof METRICS_EXPLANATIONS | null>(null);

  // ... (useMemo Stats Logic permanece igual)
  const { partyStats, globalStats, stateStats, genderStats, ideologyStats, feedStats } = useMemo(() => {
    const groups: Record<string, PartyStats> = {};
    const stateGroups: Record<string, { spending: number, count: number }> = {};
    const genderGroups: Record<string, number> = { 'M': 0, 'F': 0 };
    const ideologyGroups: Record<string, number> = { 'Esquerda': 0, 'Centro': 0, 'Direita': 0 };

    politicians.forEach(pol => {
        // Party Grouping
        if (!groups[pol.party]) {
            groups[pol.party] = {
                name: pol.party,
                totalMembers: 0,
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

        if (pol.hasApiIntegration && pol.stats.spending > 0) {
            g.totalSpending += pol.stats.spending;
            if (!stateGroups[pol.state]) stateGroups[pol.state] = { spending: 0, count: 0 };
            stateGroups[pol.state].spending += pol.stats.spending;
        }

        if (!stateGroups[pol.state]) stateGroups[pol.state] = { spending: 0, count: 0 };
        stateGroups[pol.state].count += 1;

        const gender = pol.sex === 'F' ? 'F' : 'M';
        genderGroups[gender] += 1;

        const ideology = IDEOLOGY_MAP[pol.party.toUpperCase()] || 'Centro';
        ideologyGroups[ideology] += 1;
    });

    const feedVoteTypes: Record<string, number> = { 'PL': 0, 'PEC': 0, 'MPV': 0, 'REQ': 0, 'Outros': 0 };
    const feedVoteStatus: Record<string, number> = { 'Aprovado': 0, 'Rejeitado': 0, 'Tramitação': 0 };
    
    feedItems.forEach(item => {
        if (item.type === 'voto') {
            const status = item.status || 'Tramitação';
            feedVoteStatus[status] = (feedVoteStatus[status] || 0) + 1;
            const titleUpper = item.title.toUpperCase();
            if (titleUpper.includes('PL') || titleUpper.includes('PROJETO DE LEI')) feedVoteTypes['PL']++;
            else if (titleUpper.includes('PEC')) feedVoteTypes['PEC']++;
            else if (titleUpper.includes('MPV') || titleUpper.includes('MEDIDA PROVISÓRIA')) feedVoteTypes['MPV']++;
            else if (titleUpper.includes('REQ') || titleUpper.includes('REQUERIMENTO')) feedVoteTypes['REQ']++;
            else feedVoteTypes['Outros']++;
        }
    });

    const calculatedParties = Object.values(groups).map(g => {
        const integratedMembers = g.members.filter(m => m.hasApiIntegration && m.stats.spending > 0).length || 1;
        return {
            ...g,
            avgSpending: g.totalSpending / integratedMembers,
            avgAttendance: 0
        };
    }).filter(g => g.totalMembers > 0);

    return {
        partyStats: calculatedParties,
        stateStats: stateGroups,
        genderStats: genderGroups,
        ideologyStats: ideologyGroups,
        feedStats: {
            voteTypes: Object.entries(feedVoteTypes).map(([type, value]) => ({ type, value })).filter(x => x.value > 0).sort((a, b) => b.value - a.value),
            votes: feedVoteStatus,
            totalVotes: feedItems.filter(f => f.type === 'voto').length
        },
        globalStats: {
            totalPoliticians: politicians.length,
            biggestParty: calculatedParties.sort((a: PartyStats, b: PartyStats) => b.totalMembers - a.totalMembers)[0]
        }
    };
  }, [politicians, feedItems]);

  const femaleCount = Number(genderStats['F'] || 0);
  const totalPols = Number(globalStats.totalPoliticians || 0);
  const femalePercentage = totalPols > 0 ? (femaleCount / totalPols) * 100 : 0;

  const mapData: Record<string, number> = useMemo(() => {
      const data: Record<string, number> = {};
      Object.keys(stateStats).forEach(uf => {
          data[uf] = stateStats[uf].count; 
      });
      return data;
  }, [stateStats]);

  const getDetailData = () => {
      let data = [...partyStats];
      let title = "";
      let subtitle = "";
      let colorClass = "";
      let metricFormatter = (val: number) => val.toString();

      switch (activeDetail) {
          case 'composition':
          case 'ideology':
              title = "Poder de Voto (Bancadas)";
              subtitle = "Quem detém os votos necessários para aprovar leis?";
              colorClass = "text-purple-600";
              data.sort((a, b) => b.totalMembers - a.totalMembers);
              metricFormatter = (val) => `${((val / 513) * 100).toFixed(1)}% da Câmara`; // Mostra % de poder
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

  const KpiCard = ({ title, value, icon: Icon, color, sub, onClick, actionLabel }: any) => (
      <button 
        onClick={onClick}
        className={`text-left w-full bg-white dark:bg-gray-900 rounded-[2rem] p-5 border shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group cursor-pointer border-gray-100 dark:border-gray-800`}
      >
          <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform`}>
              <Icon size={64} className={color} />
          </div>
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full text-gray-400">
                  <ChevronRight size={16} />
              </div>
          </div>
          <div className={`w-10 h-10 rounded-full ${color.replace('text-', 'bg-').replace('600', '100').replace('500', '100')} dark:bg-opacity-20 flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
          </div>
          <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
              <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</h4>
              <div className="flex items-center gap-1 mt-1">
                  {sub && <p className="text-[10px] font-bold text-gray-400">{sub}</p>}
                  {actionLabel && <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{actionLabel}</span>}
              </div>
          </div>
      </button>
  );

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 font-sans overflow-y-auto pb-32">
        {/* BACKGROUND PATTERN */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {explanationTarget && (
            <MetricExplanationModal 
                data={METRICS_EXPLANATIONS[explanationTarget]} 
                onClose={() => setExplanationTarget(null)}
            />
        )}

        {/* MAIN CONTENT AREA */}
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 space-y-8 relative z-10 pt-8">
            
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                    <BarChart3 size={24}/>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-none">Inteligência de Dados</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-1">Métricas das Bancadas</p>
                </div>
            </div>

            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* KPI CARDS (DRILL-DOWN ENABLED) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard 
                        title="Propostas em Pauta" 
                        value={feedStats.totalVotes} 
                        icon={Gavel} 
                        color="text-blue-600"
                        sub="Últimas Votações"
                        actionLabel="Ver Feed"
                        onClick={onGoToFeed}
                    />
                    <KpiCard 
                        title="Maior Bancada" 
                        value={globalStats.biggestParty?.name || '-'} 
                        icon={Users} 
                        color="text-green-600"
                        sub={`${globalStats.biggestParty?.totalMembers || 0} Membros`}
                        actionLabel="Ver Lista"
                        onClick={() => { setActiveDetail('composition'); setExpandedParty(globalStats.biggestParty?.name); }}
                    />
                    <KpiCard 
                        title="Em Atividade" 
                        value={globalStats.totalPoliticians} 
                        icon={Activity} 
                        color="text-yellow-600"
                        sub="Parlamentares"
                        actionLabel="Explorar"
                        onClick={onGoToExplore}
                    />
                    <KpiCard 
                        title="Balança de Poder" 
                        value="Ideologia" 
                        icon={Compass} 
                        color="text-purple-600"
                        sub="Esquerda vs Direita"
                        onClick={() => { setActiveDetail('ideology'); setExpandedParty(null); }}
                    />
                </div>

                {/* NEW CHARTS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* CHART 1: IDEOLOGY (Hemicycle - Brazil Flag Style) */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:shadow-lg transition-all relative">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600"><Scale size={20}/></div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Governabilidade</h3>
                                <p className="text-xs text-gray-500">Quem tem votos para aprovar leis?</p>
                            </div>
                            <button onClick={() => setExplanationTarget('ideology')} className="ml-auto text-gray-300 hover:text-blue-500 transition-colors">
                                <Info size={18}/>
                            </button>
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-center items-center">
                            {/* Hemicycle Component */}
                            <ParliamentHemicycle 
                                left={ideologyStats['Esquerda'] || 0} 
                                center={ideologyStats['Centro'] || 0} 
                                right={ideologyStats['Direita'] || 0} 
                            />
                            
                            {/* CONTEXTO DE QUÓRUM DIDÁTICO */}
                            <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-2xl w-full text-center mt-4 border border-gray-100 dark:border-gray-700">
                                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-600 mb-2">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400">Lei Comum</p>
                                        <p className="text-lg font-black text-gray-800 dark:text-white">257</p>
                                        <p className="text-[9px] text-gray-500">votos necessários</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400">Mudar Const.</p>
                                        <p className="text-lg font-black text-gray-800 dark:text-white">308</p>
                                        <p className="text-[9px] text-gray-500">votos (PEC)</p>
                                    </div>
                                </div>
                                <p className="text-[10px] font-medium text-gray-500 leading-tight">
                                    <span className="font-bold text-purple-500">O que isso significa?</span> Nenhum lado governa sozinho. A negociação com o Centro é obrigatória para aprovar pautas importantes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CHART 2: ACTIVITY TYPES (Bar) - REPLACED EXPENSES TO BE REAL */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-sm text-left hover:shadow-lg transition-all group">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600"><FileText size={20}/></div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Termômetro Legislativo</h3>
                                    <p className="text-xs text-gray-500">Tipos de Propostas em Votação</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-xs font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full uppercase">Live Feed</div>
                                <button onClick={() => setExplanationTarget('types')} className="text-gray-300 hover:text-blue-500 transition-colors">
                                    <Info size={18}/>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {feedStats.voteTypes.map((item, i) => {
                                const maxVal = feedStats.voteTypes[0]?.value || 1;
                                const pct = (item.value / maxVal) * 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0 font-bold text-xs">{item.type}</div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                    {item.type === 'PL' ? 'Projeto de Lei' : item.type === 'PEC' ? 'Emenda Constitucional' : item.type === 'MPV' ? 'Medida Provisória' : 'Requerimentos/Outros'}
                                                </span>
                                                <span className="text-xs font-black text-gray-900 dark:text-white">{item.value}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {feedStats.voteTypes.length === 0 && <div className="text-center py-8 text-gray-400 text-xs">Nenhuma votação recente detectada no feed.</div>}
                        </div>
                    </div>
                </div>

                {/* ... (Other Charts remain same) */}
                {/* CHART 3: VOTING OUTCOMES & GENDER */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all" onClick={onGoToFeed}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600"><Gavel size={20}/></div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Resultados Recentes</h3>
                                <p className="text-xs text-gray-500">Status das últimas votações</p>
                            </div>
                            <div className="ml-auto text-xs font-bold text-green-600 flex items-center gap-1 cursor-pointer">
                                Ver Detalhes <ChevronRight size={14}/>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                             {Object.entries(feedStats.votes).map(([status, count]) => (
                                 <div key={status} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors">
                                     <div className="flex items-center gap-2">
                                         {status === 'Aprovado' ? <ThumbsUp size={16} className="text-green-500"/> : status === 'Rejeitado' ? <ThumbsDown size={16} className="text-red-500"/> : <Clock size={16} className="text-blue-500"/>}
                                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{status}</span>
                                     </div>
                                     <span className="text-lg font-black text-gray-900 dark:text-white">{count}</span>
                                 </div>
                             ))}
                             {Object.keys(feedStats.votes).length === 0 && <p className="text-center text-gray-400 text-xs py-4">Sem dados de votação.</p>}
                        </div>
                     </div>

                     <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600"><Users size={20}/></div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Gênero</h3>
                                <p className="text-xs text-gray-500">Distribuição no Congresso</p>
                            </div>
                            <button onClick={() => setExplanationTarget('gender')} className="ml-auto text-gray-300 hover:text-blue-500 transition-colors">
                                <Info size={18}/>
                            </button>
                        </div>
                        <div className="flex-1 flex items-center gap-6">
                            <div className="relative w-32 h-32 shrink-0">
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#eee" strokeWidth="4" className="dark:stroke-gray-800" />
                                    <path 
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none" stroke="#DC2626" strokeWidth="4" 
                                        strokeDasharray={`${femalePercentage}, 100`} 
                                        className="animate-[spin_1s_ease-out_reverse]"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-2xl font-black text-red-600">{femalePercentage.toFixed(0)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 text-sm font-bold w-full">
                                <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                    <span className="text-red-700 dark:text-red-400">Mulheres</span>
                                    <span className="text-gray-900 dark:text-white">{genderStats['F'] || 0}</span>
                                </div>
                                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-gray-600 dark:text-gray-400">Homens</span>
                                    <span className="text-gray-900 dark:text-white">{genderStats['M'] || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAPA DO PODER (MOVED & IMPROVED) --- */}
                <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-6 lg:p-8 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden flex flex-col xl:flex-row gap-8">
                    <div className="flex-1 relative z-10">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600"><MapPin size={24} /></div>
                                Geografia do Poder
                            </h2>
                            <p className="text-sm text-gray-500 mt-2 max-w-md">Visualização da concentração de parlamentares por unidade federativa.</p>
                        </div>
                        
                        <div className="w-full aspect-[4/3] xl:aspect-[16/9]">
                            <BrazilMap 
                                data={mapData} 
                                metricName="Parlamentares"
                                labelFormatter={(v: number) => v.toString()}
                            />
                        </div>
                    </div>

                    <div className="xl:w-80 shrink-0 flex flex-col">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 h-full">
                            <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Crown size={16} className="text-yellow-500"/> Maiores Bancadas
                            </h3>
                            <div className="space-y-3 overflow-y-auto max-h-[400px] scrollbar-hide">
                                {Object.entries(mapData).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).map(([uf, val], i) => (
                                    <div key={uf} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 group hover:scale-[1.02] transition-transform">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 flex items-center justify-center font-black rounded-lg ${i < 3 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                                                {i + 1}
                                            </div>
                                            <span className="font-bold text-gray-900 dark:text-white">{uf}</span>
                                        </div>
                                        <span className="font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full text-xs">
                                            {val}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                        {/* HEADER EXPLICATIVO PARA BANCADAS */}
                        {(activeDetail === 'composition' || activeDetail === 'ideology') && (
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-3xl border border-purple-100 dark:border-purple-900/30 flex gap-4 items-center">
                                <div className="p-3 bg-white dark:bg-purple-900/30 rounded-full text-purple-600 shadow-sm shrink-0">
                                    <Crown size={20}/>
                                </div>
                                <p className="text-sm font-medium text-purple-900 dark:text-purple-300 leading-tight">
                                    Para aprovar qualquer lei (maioria simples), um governo precisa de <strong>257 votos</strong>. A lista abaixo mostra o "peso" de cada partido nessa conta matemática.
                                </p>
                            </div>
                        )}

                        {detailConfig.data.map((party, idx) => (
                            <div key={party.name} onClick={() => setExpandedParty(expandedParty === party.name ? null : party.name)} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 text-sm">#{idx + 1}</div>
                                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-gray-700 dark:text-gray-300 text-xs shadow-sm">{party.name}</div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                                {party.name} 
                                                {IDEOLOGY_MAP[party.name.toUpperCase()] && (
                                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 font-bold uppercase">{IDEOLOGY_MAP[party.name.toUpperCase()]}</span>
                                                )}
                                            </h4>
                                            <p className="text-xs text-gray-500 font-bold mt-1">{party.totalMembers} Membros</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-black ${detailConfig.colorClass} bg-gray-50 dark:bg-gray-900/50 px-3 py-1 rounded-lg`}>
                                        {detailConfig.metricFormatter(activeDetail === 'composition' || activeDetail === 'ideology' ? party.totalMembers : party.avgSpending)}
                                    </span>
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
                    
                    {/* Botão de Fonte Oficial */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 text-center">
                        <a 
                            href="https://dadosabertos.camara.leg.br/swagger/api.html" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors"
                        >
                            <Database size={12}/> Ver Dados Brutos (API Oficial) <ExternalLink size={10}/>
                        </a>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default PartiesDashboardView;
