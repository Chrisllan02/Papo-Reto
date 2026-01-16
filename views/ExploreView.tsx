
import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, Users, ChevronLeft, MapPin, Building2, Crown, Heart, ChevronRight, LayoutGrid } from 'lucide-react';
import { Politician } from '../types';
import { getGenderedRole } from '../services/camaraApi';

interface ExploreViewProps {
  politicians: Politician[];
  onSelectCandidate: (pol: Politician) => void;
  initialViewMode?: 'grid' | 'parties';
  followingIds?: number[]; 
}

const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, onSelectCandidate, followingIds = [] }) => {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    
    const [selectedUF, setSelectedUF] = useState("");
    
    // Novo Estado: Partido Selecionado (Drill-down)
    const [selectedParty, setSelectedParty] = useState<string | null>(null);

    // 1. Filtragem Global (Base)
    const baseFilteredList = useMemo(() => {
        return politicians.filter(p => {
            const matchesUF = selectedUF ? p.state === selectedUF : true;
            return matchesUF;
        });
    }, [politicians, selectedUF]);

    // 2. Agrupamento por Partidos
    const partiesData = useMemo(() => {
        const groups: Record<string, Politician[]> = {};
        
        baseFilteredList.forEach(p => {
            if (!groups[p.party]) groups[p.party] = [];
            groups[p.party].push(p);
        });

        // Transforma em array e filtra pela busca (Search)
        return Object.entries(groups)
            .map(([name, members]) => {
                // Se houver busca, verifica se o partido tem membros que dão match OU se o nome do partido dá match
                const searchLower = deferredSearch.toLowerCase();
                const matchesSearch = !searchLower 
                    ? true 
                    : name.toLowerCase().includes(searchLower) || 
                      members.some(m => m.name.toLowerCase().includes(searchLower));
                
                return { name, members, visible: matchesSearch };
            })
            .filter(g => g.visible)
            .sort((a, b) => b.members.length - a.members.length); // Maiores bancadas primeiro

    }, [baseFilteredList, deferredSearch]);

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
    const getPartyColor = (party: string) => {
        const p = party.toUpperCase();
        if (['PT', 'PCdoB', 'PSOL', 'PSB'].includes(p)) return 'from-red-500 to-red-700';
        if (['PL', 'PP', 'REPUBLICANOS'].includes(p)) return 'from-blue-600 to-blue-800';
        if (['MDB', 'PSD', 'PSDB', 'UNIÃO'].includes(p)) return 'from-yellow-500 to-orange-600';
        if (['NOVO'].includes(p)) return 'from-orange-500 to-orange-700';
        return 'from-gray-500 to-gray-700'; // Default
    };

    // Helper para abreviação do partido no Badge
    const getPartyBadgeLabel = (party: string) => {
        const map: Record<string, string> = {
            'REPUBLICANOS': 'REP',
            'SOLIDARIEDADE': 'SD',
            'CIDADANIA': 'CID',
            'PODEMOS': 'PODE',
            'PATRIOTA': 'PATRI',
            'AVANTE': 'AVANT',
            'UNIÃO': 'UNIÃO'
        };
        const p = party.toUpperCase();
        if (map[p]) return map[p];
        // Se maior que 5 caracteres, trunca
        return p.length > 5 ? p.substring(0, 3) : p;
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

                    {/* STATE GRID SELECTOR (Oculto se estiver dentro de um partido para limpar a tela) */}
                    {!selectedParty && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-2">
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
                            {selectedParty ? `Bancada do ${selectedParty}` : `Legislativo ${selectedUF ? `• ${selectedUF}` : '• Federal'}`}
                        </h2>
                        <span className="text-xs font-bold text-gray-400 ml-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {selectedParty ? currentPartyMembers.length : partiesData.length} {selectedParty ? 'membros' : 'partidos'} encontrados
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
                                    const gradient = getPartyColor(group.name);
                                    // Pega fotos dos primeiros 3 membros para preview
                                    const previewMembers = group.members.slice(0, 3);
                                    const badgeLabel = getPartyBadgeLabel(group.name);

                                    return (
                                        <button 
                                            key={group.name} 
                                            onClick={() => setSelectedParty(group.name)}
                                            className="group relative bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 text-left border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                                        >
                                            {/* Background Gradient on Hover */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>

                                            <div className="flex justify-between items-start mb-6 relative z-10">
                                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform ${badgeLabel.length > 4 ? 'text-xs tracking-tighter' : 'text-lg'}`}>
                                                    {badgeLabel}
                                                </div>
                                                <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-full text-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700 group-hover:text-black dark:group-hover:text-white transition-colors">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>

                                            <div className="relative z-10">
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1 truncate" title={group.name}>
                                                    {group.name}
                                                </h3>
                                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                                                    {group.members.length} {group.members.length === 1 ? 'Membro' : 'Membros'}
                                                </p>
                                            </div>

                                            {/* Avatar Preview */}
                                            <div className="mt-6 flex -space-x-3 relative z-10">
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
