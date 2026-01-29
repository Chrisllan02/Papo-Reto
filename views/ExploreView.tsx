
import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Search, Users, ChevronLeft, MapPin, LayoutGrid, ChevronDown, X, Contact, Heart, Filter, User } from 'lucide-react';
import { Politician, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { PARTY_METADATA } from '../services/camaraApi';
import BrazilMap from '../components/BrazilMap';
import { FixedSizeList as List } from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

// Fix for "module does not provide an export named 'default'" error in some ESM environments
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;

interface ExploreViewProps {
  politicians: Politician[];
  parties?: Party[]; 
  onSelectCandidate: (pol: Politician) => void;
  followingIds?: number[]; 
  preselectedState?: string; // NOVO: Permite vir do Feed já filtrado
}

const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type IdeologyFilter = 'Todos' | 'Esquerda' | 'Centro' | 'Direita';
type ViewMode = 'parties' | 'candidates';

// Helper de Normalização para Busca (Remove acentos e lowercase)
const normalizeString = (str: string | undefined | null) => {
    if (!str) return "";
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
};

interface PartyCardProps {
  group: any;
  getPartyColor: (i: string) => string;
  onSelect: (name: string) => void;
}

const PartyCard: React.FC<PartyCardProps> = ({ group, getPartyColor, onSelect }) => {
    const [imgError, setImgError] = useState(false);
    const gradient = getPartyColor(group.ideology || 'Centro');
    const badgeLabel = formatPartyName(group.name);
    // Mostra até 4 membros no preview mobile agora que temos mais espaço
    const previewMembers = group.members.slice(0, 4);

    return (
        <button 
            onClick={() => onSelect(group.name)}
            className="group relative glass rounded-[2rem] p-5 text-left hover:shadow-2xl transition-all active:scale-[0.98] flex flex-col justify-between min-h-[240px] md:min-h-[340px] border border-white/40 dark:border-white/5 overflow-hidden"
        >
            {/* Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-500`}></div>

            <div className="w-full relative z-10">
                <div className="flex justify-between items-start mb-4">
                    {group.logo && !imgError ? (
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/90 rounded-2xl p-1 shadow-sm border border-white/50 flex items-center justify-center backdrop-blur-md">
                            <img 
                                src={group.logo} 
                                alt={group.name} 
                                className="max-w-full max-h-full object-contain" 
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg text-xs md:text-lg`}>
                            {badgeLabel.substring(0, 4)}
                        </div>
                    )}
                    
                    <span className={`text-[10px] md:text-xs font-black uppercase px-2 py-1 rounded-lg border backdrop-blur-md shadow-sm ${
                        group.ideology === 'Esquerda' ? 'bg-rose-50/90 text-rose-600 border-rose-100' :
                        group.ideology === 'Direita' ? 'bg-indigo-50/90 text-indigo-600 border-indigo-100' :
                        'bg-amber-50/90 text-amber-600 border-amber-100'
                    }`}>
                        {group.ideology?.substring(0, 3)}
                    </span>
                </div>

                <div className="min-w-0">
                    <h3 className="text-lg md:text-2xl font-black text-blue-900 dark:text-white tracking-tight mb-1 truncate">
                        {group.name}
                    </h3>
                    <p className="text-[10px] md:text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wide opacity-80">
                        {group.members.length} Parlamentares
                    </p>
                </div>
            </div>

            {/* Avatar Container - Adjusted to prevent clipping */}
            <div className="mt-auto pt-4 relative z-20 w-full">
                <div className="flex -space-x-2 md:-space-x-3 items-center">
                    {previewMembers.map((m: any) => (
                        <div key={m.id} className="relative transition-transform duration-200 hover:scale-110 hover:z-30">
                            <img 
                                src={m.photo} 
                                className="w-8 h-8 md:w-12 md:h-12 rounded-full border-[2px] border-white dark:border-gray-800 object-cover bg-gray-200 shadow-md" 
                                alt=""
                            />
                        </div>
                    ))}
                    {group.members.length > 4 && (
                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full border-[2px] border-white dark:border-gray-800 bg-blue-50 dark:bg-gray-700 flex items-center justify-center text-[9px] md:text-xs font-black text-blue-600 dark:text-blue-300 shadow-md relative z-0">
                            +{group.members.length - 4}
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
};

const PoliticianCard = ({ pol, onSelect, isFollowing }: { pol: Politician, onSelect: (p: Politician) => void, isFollowing: boolean }) => (
    <div onClick={() => onSelect(pol)} className="glass hover:shadow-xl transition-all active:scale-95 group flex flex-col items-center text-center relative rounded-[2rem] p-4 h-full border border-white/40 dark:border-white/5 cursor-pointer bg-white/40 dark:bg-white/5">
        {isFollowing && (
            <div className="absolute top-3 left-3 z-20">
                <div className="bg-orange-500 p-1.5 rounded-full shadow-md border-2 border-white dark:border-gray-800">
                    <Heart size={10} className="fill-white text-white"/>
                </div>
            </div>
        )}
        <div className="w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-full overflow-hidden mb-3 border-[3px] border-white/80 dark:border-gray-700 shadow-lg relative z-10 bg-gray-200">
            <img src={pol.photo} alt={pol.name} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"/>
        </div>
        <h3 className="font-black text-blue-900 dark:text-white text-xs md:text-base line-clamp-2 w-full leading-tight h-8 md:h-12 flex items-center justify-center mb-1">{pol.name}</h3>
        <div className="mt-auto flex flex-wrap justify-center gap-1 w-full">
            <span className="text-[9px] md:text-xs font-black bg-gray-100/80 dark:bg-white/10 px-2 py-1 rounded-md text-gray-700 dark:text-gray-300 uppercase tracking-tighter border border-gray-200/50 dark:border-white/10">{pol.party}</span>
            <span className="text-[9px] md:text-xs font-black bg-blue-50/80 dark:bg-blue-900/30 px-2 py-1 rounded-md text-blue-600 dark:text-blue-300 uppercase tracking-tighter border border-blue-100/50 dark:border-blue-900/50">{pol.state}</span>
        </div>
    </div>
);

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, parties = [], onSelectCandidate, followingIds = [], preselectedState }) => {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    
    const [selectedUF, setSelectedUF] = useState(preselectedState || "");
    const [selectedIdeology, setSelectedIdeology] = useState<IdeologyFilter>('Todos');
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(false);
    
    const [viewMode, setViewMode] = useState<ViewMode>('parties');

    useEffect(() => {
        if (preselectedState) {
            setSelectedUF(preselectedState);
            setViewMode('candidates');
        }
    }, [preselectedState]);

    const mapData = useMemo(() => {
        const counts: Record<string, number> = {};
        politicians.forEach(p => {
            if (p.state) counts[p.state] = (counts[p.state] || 0) + 1;
        });
        return counts;
    }, [politicians]);

    const filteredPoliticians = useMemo(() => {
        const normalizedQuery = normalizeString(deferredSearch);
        const searchTokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        
        return politicians.filter(p => {
            if (selectedUF && p.state !== selectedUF) return false;
            
            if (searchTokens.length > 0) {
                const searchableContent = normalizeString(`
                    ${p.name} 
                    ${p.civilName || ''} 
                    ${p.party} 
                    ${p.partyShort || ''} 
                    ${p.state} 
                    ${p.role}
                `);
                const matches = searchTokens.every(token => searchableContent.includes(token));
                if (!matches) return false;
            }

            if (selectedIdeology !== 'Todos') {
                const pIdeology = getIdeology(p.party);
                if (pIdeology !== selectedIdeology) return false;
            }

            return true;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [politicians, selectedUF, deferredSearch, selectedIdeology]);

    const partiesData = useMemo(() => {
        const groups: Record<string, { members: Politician[], officialData?: any, name: string }> = {};
        
        parties.forEach(p => {
            const sigla = p.sigla.trim().toUpperCase();
            groups[sigla] = { name: sigla, officialData: p, members: [] };
        });

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

        filteredPoliticians.forEach(p => {
            const sigla = p.party ? p.party.trim().toUpperCase() : 'OUTROS';
            if (!groups[sigla]) groups[sigla] = { name: sigla, members: [] };
            groups[sigla].members.push(p);
        });

        return Object.values(groups)
            .map(group => {
                const officialName = group.officialData?.nome || group.name;
                const ideology = group.officialData?.ideology || getIdeology(group.name);
                const logo = group.officialData?.urlLogo || group.officialData?.logo;
                const matchesIdeology = selectedIdeology === 'Todos' || ideology === selectedIdeology;
                const visible = matchesIdeology && group.members.length > 0;
                
                return { name: group.name, officialName, members: group.members, logo, ideology, visible };
            })
            .filter(g => g.visible)
            .sort((a, b) => (b.members.length - a.members.length) || a.name.localeCompare(b.name));
    }, [filteredPoliticians, parties, selectedIdeology]);

    const currentPartyMembers = useMemo(() => {
        if (!selectedParty) return [];
        const partyGroup = partiesData.find(p => p.name === selectedParty);
        if (!partyGroup) return [];
        return partyGroup.members.sort((a, b) => a.name.localeCompare(b.name));
    }, [partiesData, selectedParty]);

    const getPartyColor = (ideology: string) => {
        if (ideology === 'Esquerda') return 'from-rose-500 to-rose-700';
        if (ideology === 'Direita') return 'from-indigo-600 to-indigo-800';
        return 'from-amber-400 to-amber-600'; 
    };

    const VirtualRow = ({ index, style, data }: any) => {
        const { items, numColumns } = data;
        const startIndex = index * numColumns;
        const rowItems = items.slice(startIndex, startIndex + numColumns);

        return (
            <div style={style} className="flex gap-3 md:gap-6 px-1 pb-4">
                {rowItems.map((pol: Politician) => (
                    <div key={pol.id} className="flex-1 min-w-0 h-full">
                        <PoliticianCard 
                            pol={pol} 
                            onSelect={onSelectCandidate} 
                            isFollowing={followingIds.includes(pol.id)}
                        />
                    </div>
                ))}
                {rowItems.length < numColumns && 
                    Array.from({ length: numColumns - rowItems.length }).map((_, i) => (
                        <div key={`spacer-${i}`} className="flex-1"></div>
                    ))
                }
            </div>
        );
    };

    const getColumnCount = (width: number) => {
        if (width >= 1536) return 7; 
        if (width >= 1280) return 6; 
        if (width >= 1024) return 4; 
        if (width >= 768) return 3; 
        return 2; 
    };

    const itemsToRender = selectedParty ? currentPartyMembers : filteredPoliticians;

    return (
        <div className="w-full h-full bg-transparent flex flex-col">
            
            {/* Header Redesigned for Mobile Clarity */}
            <div className="sticky top-0 z-30 pt-2 px-2 md:pt-4 md:px-6 pb-2">
                <div className="w-full glass rounded-[2.5rem] p-4 shadow-xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-midnight/90 backdrop-blur-xl flex flex-col gap-4">
                    
                    {/* Row 1: Header + Mode Switch + Back */}
                    <div className="flex justify-between items-center">
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                             >
                                 <ChevronLeft size={16} /> Voltar
                             </button>
                         ) : (
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                     {viewMode === 'parties' ? <LayoutGrid size={20}/> : <Users size={20}/>}
                                 </div>
                                 <span className="text-lg font-black text-blue-900 dark:text-white tracking-tight">
                                     {viewMode === 'parties' ? 'Partidos' : 'Parlamentares'}
                                 </span>
                             </div>
                         )}
                         
                         {!selectedParty && (
                             <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-white/20">
                                 <button 
                                    onClick={() => setViewMode('parties')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'parties' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-400'}`}
                                >
                                     <LayoutGrid size={18} />
                                 </button>
                                 <button 
                                    onClick={() => setViewMode('candidates')}
                                    className={`p-2 rounded-lg transition-all ${viewMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-400'}`}
                                >
                                     <Contact size={18} />
                                 </button>
                             </div>
                         )}
                    </div>

                    {/* Row 2: Search Bar - Bigger & Cleaner */}
                    <div className="relative group w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={selectedParty ? `Buscar em ${selectedParty}...` : viewMode === 'candidates' ? "Nome, estado..." : "Buscar partido..."}
                            className="block w-full pl-11 pr-10 py-3.5 bg-gray-50/80 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                        />
                        {search && (
                          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                    </div>

                    {/* Row 3: Filters - Better Scroll & Visuals */}
                    {!selectedParty && (
                        <div className="relative group/filters">
                            {/* Scroll indicators */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-midnight to-transparent pointer-events-none z-10 md:hidden rounded-r-2xl"></div>
                            
                            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pr-4">
                                
                                {/* Ideology Group */}
                                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-white/5 shrink-0 snap-start">
                                    {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => (
                                        <button
                                            key={ideology}
                                            onClick={() => setSelectedIdeology(ideology)}
                                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${
                                                selectedIdeology === ideology 
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                                            }`}
                                        >
                                            {ideology}
                                        </button>
                                    ))}
                                </div>

                                {/* State Selector - Pill Style */}
                                <div className="relative shrink-0 snap-start">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 pointer-events-none">
                                        <MapPin size={16} />
                                    </div>
                                    <select 
                                        value={selectedUF} 
                                        onChange={(e) => setSelectedUF(e.target.value)}
                                        className="appearance-none bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 pl-9 pr-8 py-3 rounded-xl font-bold text-xs uppercase focus:outline-none border border-blue-100 dark:border-blue-900/30 cursor-pointer min-w-[100px]"
                                    >
                                        <option value="">Brasil</option>
                                        {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"/>
                                </div>

                                {/* Map Toggle Button - HIDDEN ON MOBILE */}
                                <button 
                                    onClick={() => setShowMap(!showMap)} 
                                    className={`shrink-0 px-5 py-3 rounded-xl border font-bold text-xs uppercase hidden md:flex items-center gap-2 transition-all active:scale-95 shadow-sm snap-start ${
                                        showMap 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {showMap ? 'Fechar Mapa' : 'Ver Mapa'}
                                </button>
                            </div>

                            {/* Map Dropdown */}
                            {showMap && (
                                <div className="mt-3 relative w-full h-[320px] bg-blue-50/50 dark:bg-midnight/90 backdrop-blur-xl rounded-[2rem] border border-blue-100 dark:border-blue-900/30 overflow-hidden animate-in slide-in-from-top-4 fade-in z-20 shadow-inner hidden md:block">
                                    <div className="absolute top-4 right-4 z-10 md:hidden">
                                        <button onClick={() => setShowMap(false)} className="p-2 bg-white/50 rounded-full text-blue-600"><X size={20}/></button>
                                    </div>
                                    <BrazilMap 
                                        data={mapData} 
                                        selectedState={selectedUF}
                                        onSelectState={(uf) => { setSelectedUF(uf === selectedUF ? "" : uf); }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 p-3 md:p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe overflow-hidden">
                <div className="w-full max-w-[2000px] mx-auto h-full flex flex-col">
                    
                    {viewMode === 'parties' && !selectedParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-32 custom-scrollbar pr-1">
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

                    {(viewMode === 'candidates' || selectedParty) && (
                        <div className="h-full flex flex-col">
                            {viewMode === 'candidates' && !selectedParty && (
                                <div className="mb-4 flex items-center justify-between px-2">
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">
                                        {selectedUF ? `Bancada de ${selectedUF}` : 'Todos os Parlamentares'}
                                    </h3>
                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold">
                                        {itemsToRender.length} encontrados
                                    </span>
                                </div>
                            )}

                            {itemsToRender.length === 0 ? (
                                <div className="text-center py-24 opacity-50 flex flex-col items-center">
                                    <User size={64} className="text-gray-300 mb-4"/>
                                    <p className="font-bold text-gray-500 text-lg">Nenhum parlamentar encontrado.</p>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <AutoSizer>
                                        {({ height, width }: { height: number, width: number }) => {
                                            const numColumns = getColumnCount(width);
                                            const rowCount = Math.ceil(itemsToRender.length / numColumns);
                                            // Increased item height again to fit new card size
                                            const itemHeight = width < 768 ? 240 : 360; 

                                            return (
                                                <List
                                                    height={height}
                                                    itemCount={rowCount}
                                                    itemSize={itemHeight}
                                                    width={width}
                                                    itemData={{ items: itemsToRender, numColumns }}
                                                    className="scrollbar-hide"
                                                >
                                                    {VirtualRow}
                                                </List>
                                            );
                                        }}
                                    </AutoSizer>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExploreView;
