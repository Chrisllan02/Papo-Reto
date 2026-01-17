

import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Users, ChevronLeft, MapPin, Building2, Crown, Heart, ChevronRight, LayoutGrid, Compass, Filter } from 'lucide-react';
import { Politician, Party } from '../types';
import { getGenderedRole, formatPartyName, getIdeology } from '../services/camaraApi';

interface ExploreViewProps {
  politicians: Politician[];
  parties?: Party[]; // Agora opcional/obrigatório dependendo do carregamento
  onSelectCandidate: (pol: Politician) => void;
  followingIds?: number[]; 
}

const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type IdeologyFilter = 'Todos' | 'Esquerda' | 'Centro' | 'Direita';

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, parties = [], onSelectCandidate, followingIds = [] }) => {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    
    const [selectedUF, setSelectedUF] = useState("");
    const [selectedIdeology, setSelectedIdeology] = useState<IdeologyFilter>('Todos');
    
    // Novo Estado: Partido Selecionado (Drill-down)
    const [selectedParty, setSelectedParty] = useState<string | null>(null);

    // 1. Filtragem Global (Base)
    const baseFilteredList = useMemo(() => {
        return politicians.filter(p => {
            const matchesUF = selectedUF ? p.state === selectedUF : true;
            return matchesUF;
        });
    }, [politicians, selectedUF]);

    // 2. Agrupamento por Partidos (Combinando dados da API oficial de Partidos com a contagem de Políticos)
    const partiesData = useMemo(() => {
        // Mapa base com membros
        const groups: Record<string, { members: Politician[], officialData?: Party }> = {};
        
        baseFilteredList.forEach(p => {
            if (!groups[p.party]) groups[p.party] = { members: [] };
            groups[p.party].members.push(p);
        });

        // Enriquecer com dados oficiais da API de Partidos (Logos, Nomes, etc)
        // Se a API de Partidos não retornou nada, usamos o fallback do grupo.
        Object.keys(groups).forEach(partySigla => {
            const official = parties.find(p => p.sigla === partySigla);
            if (official) {
                groups[partySigla].officialData = official;
            }
        });

        // Transforma em array e filtra pela busca (Search) e Ideologia
        return Object.entries(groups)
            .map(([name, data]) => {
                const officialName = data.officialData?.nome || name;
                const ideology = data.officialData?.ideology || getIdeology(name); // Use helper fallback
                
                const searchLower = deferredSearch.toLowerCase();
                const matchesSearch = !searchLower 
                    ? true 
                    : name.toLowerCase().includes(searchLower) || 
                      officialName.toLowerCase().includes(searchLower) ||
                      data.members.some(m => m.name.toLowerCase().includes(searchLower));
                
                const matchesIdeology = selectedIdeology === 'Todos' || ideology === selectedIdeology;

                return { 
                    name, 
                    officialName,
                    members: data.members, 
                    logo: data.officialData?.urlLogo,
                    ideology,
                    visible: matchesSearch && matchesIdeology
                };
            })
            .filter(g => g.visible)
            .sort((a, b) => b.members.length - a.members.length); // Maiores bancadas primeiro

    }, [baseFilteredList, deferredSearch, parties, selectedIdeology]);

    // 3. Lista de Políticos do Partido Selecionado (Filtrada pela busca interna também)
    const currentPartyMembers = useMemo(() => {
        if (!selectedParty) return [];
        const partyGroup = partiesData.find(p => p.name === selectedParty);
        if (!partyGroup) return [];

        if (!deferredSearch) return partyGroup.members;

        return partyGroup.members.filter(m => 
            m.name.toLowerCase().includes(deferredSearch.toLowerCase())
        );
    }, [partiesData, selectedParty, deferredSearch]);

    // Helper para cor do partido (Visual)
    const getPartyColor = (ideology: string) => {
        if (ideology === 'Esquerda') return 'from-red-500 to-red-700';
        if (ideology === 'Direita') return 'from-blue-600 to-blue-800';
        if (ideology === 'Centro') return 'from-yellow-500 to-orange-600';
        return 'from-gray-500 to-gray-700'; // Default
    };

    return (
        <div className="w-full h-full bg-transparent flex flex-col">
            
            {/* Header Area */}
            <div className="sticky top-0 z-30 pt-4 px-4 pb-2">
                <div className="w-full bg-white/80 dark:bg-black/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-[2.5rem] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.08)] space-y-6 max-w-[2000px] mx-auto">
                    
                    {/* Top Controls */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                         
                         {/* Botão Voltar (Se estiver dentro de um partido) */}
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold transition-transform hover:scale-105 shadow-lg active:scale-95"
                             >
                                 <ChevronLeft size={20} /> Voltar para Bancadas
                             </button>
                         ) : (
                             <div className="flex items-center gap-3 text-xl font-black text-gray-900 dark:text-white">
                                 <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full">
                                     <LayoutGrid size={24} className="text-gray-500"/>
                                 </div>
                                 <span className="hidden md:inline">Bancadas & Partidos</span>
                             </div>
                         )}

                         {/* Search Bar */}
                         <div className="w-full md:max-w-xl relative group flex-1">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-green-600 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={selectedParty ? `Buscar em ${selectedParty}...` : "Buscar partido ou político..."}
                                className="block w-full pl-12 pr-4 py-3.5 bg-gray-100/50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-full text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:bg-white dark:focus:bg-gray-900 focus:border-green-500 transition-all text-sm font-bold shadow-inner"
                            />
                         </div>
                    </div>

                    {/* FILTROS (Oculto se estiver dentro de um partido) */}
                    {!selectedParty && (
                        <div className="space-y-4">
                            
                            {/* Filtro de Espectro Político */}
                            <div className="flex flex-wrap gap-2 items-center justify-center md:justify-start">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mr-2">
                                    <Compass size={12}/> Espectro:
                                </span>
                                {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => (
                                    <button
                                        key={ideology}
                                        onClick={() => setSelectedIdeology(ideology)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            selectedIdeology === ideology 
                                            ? ideology === 'Esquerda' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' :
                                              ideology === 'Centro' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' :
                                              ideology === 'Direita' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' :
                                              'bg-black text-white dark:bg-white dark:text-black'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        {ideology}
                                    </button>
                                ))}
                            </div>

                            {/* Filtro de Estado (UF) */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={12}/> Filtrar por Estado
                                    </span>
                                    {selectedUF && (
                                        <button onClick={() => setSelectedUF("")} className="text-[10px] bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 transition-colors">
                                            Limpar Filtro ({selectedUF})
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {ESTADOS_BRASIL.map(uf => (
                                        <button 
                                            key={uf} 
                                            onClick={() => setSelectedUF(selectedUF === uf ? "" : uf)}
                                            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                selectedUF === uf 
                                                ? 'bg-green-600 text-white shadow-lg shadow-green-500/40 scale-110' 
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    
                    {/* BREADCRUMB / TITLE */}
                    <div className="mb-6 px-2 flex items-center gap-2">
                        <Building2 size={24} className="text-blue-500"/>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {selectedParty ? `Bancada do ${formatPartyName(selectedParty)}` : `Legislativo ${selectedUF ? `• ${selectedUF}` : '• Federal'}`}
                        </h2>
                        <span className="text-xs font-bold text-gray-400 ml-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {selectedParty ? currentPartyMembers.length : partiesData.length} {selectedParty ? 'membros' : 'partidos'}
                        </span>
                    </div>

                    {/* --- VIEW MODE: PARTY LIST (ROOT) --- */}
                    {!selectedParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                            {partiesData.length === 0 ? (
                                <div className="col-span-full text-center py-20 opacity-50">
                                    <div className="bg-gray-100 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Users size={48} className="text-gray-400"/>
                                    </div>
                                    <p className="text-2xl font-black text-gray-500">Nenhum partido encontrado.</p>
                                </div>
                            ) : (
                                partiesData.map((group) => {
                                    const gradient = getPartyColor(group.ideology || 'Centro');
                                    // Pega fotos dos primeiros 3 membros para preview
                                    const previewMembers = group.members.slice(0, 3);
                                    const badgeLabel = formatPartyName(group.name);

                                    return (
                                        <button 
                                            key={group.name} 
                                            onClick={() => setSelectedParty(group.name)}
                                            className="group relative bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 text-left border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden flex flex-col justify-between min-h-[220px]"
                                        >
                                            {/* Background Gradient on Hover */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                                            <div>
                                                <div className="flex justify-between items-start mb-6 relative z-10">
                                                    {group.logo ? (
                                                        <div className="w-14 h-14 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                                            <img src={group.logo} alt={group.name} className="w-full h-full object-contain" />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform ${badgeLabel.length > 4 ? 'text-xs tracking-tighter' : 'text-lg'}`}>
                                                            {badgeLabel}
                                                        </div>
                                                    )}
                                                    
                                                    {/* Ideology Tag */}
                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full border ${
                                                        group.ideology === 'Esquerda' ? 'bg-red-50 text-red-600 border-red-100' :
                                                        group.ideology === 'Direita' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-yellow-50 text-yellow-600 border-yellow-100'
                                                    }`}>
                                                        {group.ideology}
                                                    </span>
                                                </div>

                                                <div className="relative z-10">
                                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1 truncate" title={group.officialName}>
                                                        {group.name}
                                                    </h3>
                                                    <p className="text-xs font-medium text-gray-400 line-clamp-1 mb-4">
                                                        {group.officialName}
                                                    </p>
                                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                                        {group.members.length} {group.members.length === 1 ? 'Membro' : 'Membros'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Avatar Preview */}
                                            <div className="mt-4 flex -space-x-3 relative z-10">
                                                {previewMembers.map((m) => (
                                                    <img 
                                                        key={m.id} 
                                                        src={m.photo} 
                                                        className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 object-cover bg-gray-200" 
                                                        alt=""
                                                    />
                                                ))}
                                                {group.members.length > 3 && (
                                                    <div className="w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                        +{group.members.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* --- VIEW MODE: MEMBERS GRID (INSIDE PARTY) --- */}
                    {selectedParty && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-6 animate-in slide-in-from-right-8 duration-500">
                            {currentPartyMembers.length === 0 ? (
                                <div className="col-span-full text-center py-20 opacity-50">
                                    <p className="font-bold text-gray-500">Nenhum membro encontrado com este filtro.</p>
                                </div>
                            ) : (
                                currentPartyMembers.map(pol => (
                                    <div key={pol.id} onClick={() => onSelectCandidate(pol)} className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/50 dark:border-white/5 hover:border-green-300 dark:hover:border-green-700 transition-all duration-500 cursor-pointer group hover:shadow-2xl hover:-translate-y-2 flex flex-col items-center text-center relative overflow-hidden">
                                        
                                        {/* Favorito Badge */}
                                        {followingIds.includes(pol.id) && (
                                            <div className="absolute top-4 left-4 z-20">
                                                <div className="bg-red-500 p-1.5 rounded-full shadow-lg border-2 border-white dark:border-gray-800 animate-in zoom-in">
                                                    <Heart size={12} className="fill-white text-white"/>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden mb-4 border-4 border-white dark:border-gray-700 shadow-lg relative z-10 bg-gray-200">
                                            <img src={pol.photo} alt={pol.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                                        </div>
                                        <h3 className="font-black text-gray-900 dark:text-white text-sm line-clamp-1 relative z-10">{pol.name}</h3>
                                        <div className="mt-3 flex flex-wrap justify-center gap-2 relative z-10">
                                            <span className="text-[10px] font-bold bg-white dark:bg-gray-700 px-3 py-1 rounded-full text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-600">{pol.state}</span>
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