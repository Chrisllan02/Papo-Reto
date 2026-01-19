
import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Users, ChevronLeft, MapPin, Building2, Heart, LayoutGrid, Compass, Map } from 'lucide-react';
import { Politician, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { PARTY_METADATA } from '../services/camaraApi';
import BrazilMap from '../components/BrazilMap';

interface ExploreViewProps {
  politicians: Politician[];
  parties?: Party[]; 
  onSelectCandidate: (pol: Politician) => void;
  followingIds?: number[]; 
}

const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type IdeologyFilter = 'Todos' | 'Esquerda' | 'Centro' | 'Direita';

interface PartyCardProps {
  group: any;
  getPartyColor: (i: string) => string;
  onSelect: (name: string) => void;
}

const PartyCard: React.FC<PartyCardProps> = ({ group, getPartyColor, onSelect }) => {
    const [imgError, setImgError] = useState(false);
    const gradient = getPartyColor(group.ideology || 'Centro');
    const badgeLabel = formatPartyName(group.name);
    const previewMembers = group.members.slice(0, 3);

    return (
        <button 
            onClick={() => onSelect(group.name)}
            className="group relative bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 text-left border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden flex flex-col justify-between min-h-[220px]"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

            <div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    {group.logo && !imgError ? (
                        <div className="w-14 h-14 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform flex items-center justify-center">
                            <img 
                                src={group.logo} 
                                alt={group.name} 
                                className="max-w-full max-h-full object-contain" 
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform ${badgeLabel.length > 4 ? 'text-xs tracking-tighter' : 'text-lg'}`}>
                            {badgeLabel.substring(0, 4)}
                        </div>
                    )}
                    
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
                        group.ideology === 'Esquerda' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        group.ideology === 'Direita' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-yellow-50 text-yellow-600 border-yellow-100'
                    }`}>
                        {group.ideology}
                    </span>
                </div>

                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-blue-900 dark:text-white tracking-tight mb-1 truncate" title={group.officialName}>
                        {group.name}
                    </h3>
                    <p className="text-xs font-medium text-blue-400 line-clamp-1 mb-4">
                        {group.officialName}
                    </p>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wide">
                        {group.members.length} {group.members.length === 1 ? 'Membro' : 'Membros'}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex -space-x-3 relative z-10 h-10">
                {previewMembers.length > 0 ? previewMembers.map((m: any) => (
                    <img 
                        key={m.id} 
                        src={m.photo} 
                        className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 object-cover bg-gray-200" 
                        alt=""
                    />
                )) : (
                    // Placeholder avatars if API failed
                    [1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
                    ))
                )}
                {group.members.length > 3 && (
                    <div className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-blue-500">
                        +{group.members.length - 3}
                    </div>
                )}
            </div>
        </button>
    );
};

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, parties = [], onSelectCandidate, followingIds = [] }) => {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    
    const [selectedUF, setSelectedUF] = useState("");
    const [selectedIdeology, setSelectedIdeology] = useState<IdeologyFilter>('Todos');
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);

    // Calculate Politician counts by state for the map
    const mapData = useMemo(() => {
        const counts: Record<string, number> = {};
        politicians.forEach(p => {
            if (p.state) counts[p.state] = (counts[p.state] || 0) + 1;
        });
        return counts;
    }, [politicians]);

    // 1. Agrupamento Inteligente (Dados Estáticos + Dinâmicos)
    const partiesData = useMemo(() => {
        const groups: Record<string, { members: Politician[], officialData?: any, name: string }> = {};
        
        // Passo A: Inicializar TODOS os partidos conhecidos
        parties.forEach(p => {
            const sigla = p.sigla.trim().toUpperCase();
            groups[sigla] = { name: sigla, officialData: p, members: [] };
        });

        // 2. Garantir Metadata
        Object.keys(PARTY_METADATA).forEach(sigla => {
            if (!groups[sigla]) {
                groups[sigla] = {
                    name: sigla,
                    officialData: { 
                        nome: PARTY_METADATA[sigla].nome, 
                        urlLogo: PARTY_METADATA[sigla].logo, 
                        ideology: PARTY_METADATA[sigla].ideology 
                    },
                    members: []
                };
            }
        });

        // Passo B: Popular com Políticos
        politicians.forEach(p => {
            if (selectedUF && p.state !== selectedUF) return;

            const rawSigla = p.party ? p.party.trim().toUpperCase() : 'OUTROS';
            const sigla = formatPartyName(rawSigla);
            
            if (!groups[sigla]) {
                groups[sigla] = { name: sigla, members: [] };
            }
            groups[sigla].members.push(p);
        });

        // Passo C: Filtragem e Transformação
        return Object.values(groups)
            .map(group => {
                const officialName = group.officialData?.nome || group.name;
                const ideology = group.officialData?.ideology || getIdeology(group.name);
                const logo = group.officialData?.urlLogo || group.officialData?.logo;

                const searchLower = deferredSearch.toLowerCase();
                const matchesSearch = !searchLower 
                    ? true 
                    : group.name.toLowerCase().includes(searchLower) || 
                      officialName.toLowerCase().includes(searchLower) ||
                      group.members.some(m => m.name.toLowerCase().includes(searchLower));
                
                const matchesIdeology = selectedIdeology === 'Todos' || ideology === selectedIdeology;
                
                const hasMembersOrNoFilter = selectedUF ? group.members.length > 0 : true;

                return { 
                    name: group.name,
                    officialName,
                    members: group.members, 
                    logo,
                    ideology,
                    visible: matchesSearch && matchesIdeology && hasMembersOrNoFilter
                };
            })
            .filter(g => g.visible)
            .sort((a, b) => {
                if (b.members.length !== a.members.length) return b.members.length - a.members.length;
                return a.name.localeCompare(b.name);
            });

    }, [politicians, parties, deferredSearch, selectedIdeology, selectedUF]);

    const currentPartyMembers = useMemo(() => {
        if (!selectedParty) return [];
        const partyGroup = partiesData.find(p => p.name === selectedParty);
        if (!partyGroup) return [];

        if (!deferredSearch) return partyGroup.members;

        return partyGroup.members.filter(m => 
            m.name.toLowerCase().includes(deferredSearch.toLowerCase())
        );
    }, [partiesData, selectedParty, deferredSearch]);

    const getPartyColor = (ideology: string) => {
        if (ideology === 'Esquerda') return 'from-yellow-500 to-yellow-700';
        if (ideology === 'Direita') return 'from-blue-600 to-blue-800';
        if (ideology === 'Centro') return 'from-yellow-500 to-orange-600';
        return 'from-gray-500 to-gray-700'; 
    };

    return (
        <div className="w-full h-full bg-transparent flex flex-col">
            
            {/* Header Area */}
            <div className="sticky top-0 z-30 pt-4 px-4 pb-2">
                <div className="w-full bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-white/40 dark:border-gray-700 rounded-[2.5rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] space-y-6 max-w-[2000px] mx-auto">
                    
                    {/* Top Controls */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                         
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold transition-transform hover:scale-105 shadow-lg active:scale-95"
                             >
                                 <ChevronLeft size={20} /> Voltar para Bancadas
                             </button>
                         ) : (
                             <div className="flex items-center gap-3 text-xl font-black text-blue-900 dark:text-white">
                                 <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                     <LayoutGrid size={24} className="text-blue-500"/>
                                 </div>
                                 <span className="hidden md:inline">Bancadas & Partidos</span>
                             </div>
                         )}

                         <div className="w-full md:max-w-xl relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={selectedParty ? `Buscar em ${selectedParty}...` : "Buscar partido ou político..."}
                                className="block w-full pl-12 pr-4 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-full text-blue-900 dark:text-white placeholder-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 transition-all text-sm font-bold shadow-inner"
                            />
                         </div>
                    </div>

                    {!selectedParty && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1 mr-2">
                                    <Compass size={12}/> Espectro:
                                </span>
                                {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => (
                                    <button
                                        key={ideology}
                                        onClick={() => setSelectedIdeology(ideology)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            selectedIdeology === ideology 
                                            ? ideology === 'Esquerda' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' :
                                              ideology === 'Centro' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' :
                                              ideology === 'Direita' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' :
                                              'bg-black text-white dark:bg-white dark:text-black'
                                            : 'bg-gray-100 dark:bg-gray-800 text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {ideology}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={12}/> Filtrar por Estado
                                    </span>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowMap(!showMap)} 
                                            className={`text-[10px] px-3 py-1 rounded-full font-bold transition-colors flex items-center gap-1 border ${
                                                showMap 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                                : 'bg-white dark:bg-gray-800 text-blue-600 border-blue-100 dark:border-gray-600'
                                            }`}
                                        >
                                            <Map size={12}/> {showMap ? 'Ocultar Mapa' : 'Mapa Interativo'}
                                        </button>
                                        
                                        {selectedUF && (
                                            <button onClick={() => setSelectedUF("")} className="text-[10px] bg-yellow-100 text-yellow-600 px-3 py-1 rounded-full font-bold hover:bg-yellow-200 transition-colors">
                                                Limpar Filtro ({selectedUF})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showMap && (
                                    <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 overflow-hidden h-[400px] animate-in slide-in-from-top-4 fade-in duration-500 mb-4">
                                        <BrazilMap 
                                            data={mapData} 
                                            metricName="Parlamentares" 
                                            labelFormatter={(v) => `${v} eleitos`}
                                            selectedState={selectedUF}
                                            onSelectState={(uf) => setSelectedUF(uf === selectedUF ? "" : uf)}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {ESTADOS_BRASIL.map(uf => (
                                        <button 
                                            key={uf} 
                                            onClick={() => setSelectedUF(selectedUF === uf ? "" : uf)}
                                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                selectedUF === uf 
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-blue-500 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {uf}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-full max-w-[2000px] mx-auto">
                    
                    <div className="mb-6 px-2 flex items-center gap-2">
                        <Building2 size={24} className="text-blue-500"/>
                        <h2 className="text-2xl font-black text-blue-900 dark:text-white tracking-tight">
                            {selectedParty ? `Bancada do ${formatPartyName(selectedParty)}` : `Legislativo ${selectedUF ? `• ${selectedUF}` : '• Federal'}`}
                        </h2>
                        <span className="text-xs font-bold text-blue-400 ml-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {selectedParty ? currentPartyMembers.length : partiesData.length} {selectedParty ? 'membros' : 'partidos'}
                        </span>
                    </div>

                    {!selectedParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {partiesData.map((group) => (
                                <PartyCard 
                                    key={group.name} 
                                    group={group} 
                                    getPartyColor={getPartyColor} 
                                    onSelect={setSelectedParty} 
                                />
                            ))}
                        </div>
                    )}

                    {selectedParty && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-6 animate-in slide-in-from-right-8 duration-500">
                            {currentPartyMembers.length === 0 ? (
                                <div className="col-span-full text-center py-20 opacity-50 bg-white/50 dark:bg-gray-800/50 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                                    <p className="font-bold text-gray-500">
                                        {politicians.length === 0 
                                            ? "Sistema indisponível. Não foi possível carregar a lista de membros." 
                                            : "Nenhum membro encontrado com este filtro."}
                                    </p>
                                </div>
                            ) : (
                                currentPartyMembers.map(pol => (
                                    <div key={pol.id} onClick={() => onSelectCandidate(pol)} className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden">
                                        
                                        {followingIds.includes(pol.id) && (
                                            <div className="absolute top-4 left-4 z-20">
                                                <div className="bg-yellow-500 p-1.5 rounded-full shadow-lg border-2 border-white dark:border-gray-800 animate-in zoom-in">
                                                    <Heart size={12} className="fill-white text-white"/>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden mb-4 border-4 border-white dark:border-gray-700 shadow-lg relative z-10 bg-gray-200">
                                            <img src={pol.photo} alt={pol.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                                        </div>
                                        <h3 className="font-black text-blue-900 dark:text-white text-sm line-clamp-1 relative z-10">{pol.name}</h3>
                                        <div className="mt-3 flex flex-wrap justify-center gap-2 relative z-10">
                                            <span className="text-[10px] font-bold bg-white dark:bg-gray-700 px-3 py-1 rounded-full text-blue-600 dark:text-blue-300 shadow-sm border border-gray-100 dark:border-gray-600">{pol.state}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ExploreView;
