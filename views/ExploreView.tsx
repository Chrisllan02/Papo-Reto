
import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Search, Users, ChevronLeft, MapPin, LayoutGrid, ChevronDown, X, Contact, Heart, Filter } from 'lucide-react';
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
    const previewMembers = group.members.slice(0, 3);

    return (
        <button 
            onClick={() => onSelect(group.name)}
            className="group relative glass rounded-[2rem] p-5 md:p-6 text-left hover:shadow-2xl transition-all active:scale-[0.98] overflow-hidden flex flex-col justify-between min-h-[180px] md:min-h-[220px]"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

            <div>
                <div className="flex justify-between items-start mb-4 md:mb-6 relative z-10">
                    {group.logo && !imgError ? (
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/80 rounded-2xl md:rounded-3xl p-1 shadow-md border border-white/50 flex items-center justify-center backdrop-blur-md">
                            <img 
                                src={group.logo} 
                                alt={group.name} 
                                className="max-w-full max-h-full object-contain" 
                                onError={() => setImgError(true)}
                            />
                        </div>
                    ) : (
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-lg ${badgeLabel.length > 4 ? 'text-[8px] md:text-xs tracking-tighter' : 'text-sm md:text-lg'}`}>
                            {badgeLabel.substring(0, 4)}
                        </div>
                    )}
                    
                    <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm ${
                        group.ideology === 'Esquerda' ? 'bg-rose-50/80 text-rose-600 border-rose-100' :
                        group.ideology === 'Direita' ? 'bg-indigo-50/80 text-indigo-600 border-indigo-100' :
                        'bg-amber-50/80 text-amber-600 border-amber-100'
                    }`}>
                        {group.ideology}
                    </span>
                </div>

                <div className="relative z-10 min-w-0">
                    <h3 className="text-lg md:text-2xl font-black text-blue-900 dark:text-white tracking-tight mb-0.5 truncate">
                        {group.name}
                    </h3>
                    <p className="text-[10px] md:text-xs font-medium text-blue-400 line-clamp-1 mb-2 md:mb-4 opacity-80">
                        {group.officialName}
                    </p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-wide">
                        {group.members.length} {group.members.length === 1 ? 'Membro' : 'Membros'}
                    </p>
                </div>
            </div>

            {/* Ajuste de margem (pl-2 mb-1) para evitar corte pelo rounded-corner */}
            <div className="mt-4 flex -space-x-2.5 relative z-10 h-8 md:h-10 pl-2 mb-1">
                {previewMembers.map((m: any) => (
                    <img 
                        key={m.id} 
                        src={m.photo} 
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border-[2px] md:border-[3px] border-white dark:border-gray-900 object-cover bg-gray-200 shadow-md" 
                        alt=""
                    />
                ))}
                {group.members.length > 3 && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-[2px] md:border-[3px] border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[9px] md:text-[10px] font-bold text-blue-500 shadow-md">
                        +{group.members.length - 3}
                    </div>
                )}
            </div>
        </button>
    );
};

const PoliticianCard = ({ pol, onSelect, isFollowing }: { pol: Politician, onSelect: (p: Politician) => void, isFollowing: boolean }) => (
    <div onClick={() => onSelect(pol)} className="glass hover:shadow-xl transition-all active:scale-95 group flex flex-col items-center text-center relative rounded-[2.5rem] p-4 md:p-6 h-full border border-white/40 dark:border-white/5">
        {isFollowing && (
            <div className="absolute top-3 left-3 z-20">
                <div className="bg-orange-500 p-1.5 rounded-full shadow-md border-2 border-white dark:border-gray-800">
                    <Heart size={10} className="fill-white text-white"/>
                </div>
            </div>
        )}
        <div className="w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-full overflow-hidden mb-3 md:mb-4 border-[3px] border-white/80 dark:border-gray-700 shadow-lg relative z-10 bg-gray-200">
            <img src={pol.photo} alt={pol.name} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"/>
        </div>
        <h3 className="font-black text-blue-900 dark:text-white text-xs md:text-sm line-clamp-2 w-full leading-tight h-8 md:h-10 flex items-center justify-center">{pol.name}</h3>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
            <span className="text-[8px] md:text-[9px] font-black bg-gray-100/50 dark:bg-white/5 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 uppercase tracking-tighter backdrop-blur-md border border-gray-200/50 dark:border-white/10">{pol.party}</span>
            <span className="text-[8px] md:text-[9px] font-black bg-blue-50/50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-300 uppercase tracking-tighter backdrop-blur-md border border-blue-100/50 dark:border-blue-900/50">{pol.state}</span>
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
            <div style={style} className="flex gap-4 md:gap-6 px-1 pb-6">
                {rowItems.map((pol: Politician) => (
                    <div key={pol.id} className="flex-1 min-w-0">
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
            
            {/* Header Redesigned for Better Mobile UX */}
            <div className="sticky top-0 z-30 pt-2 px-2 md:pt-4 md:px-6 pb-2">
                <div className="w-full glass rounded-[2rem] md:rounded-[3rem] p-3 md:p-6 shadow-lg space-y-3 md:space-y-4 max-w-[2000px] mx-auto bg-white/80 dark:bg-midnight/80 backdrop-blur-xl">
                    
                    {/* Row 1: Title & Main Actions */}
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-between items-start md:items-center">
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl md:rounded-3xl font-bold transition-all active:scale-95 text-xs shrink-0 shadow-lg hover:shadow-xl w-full md:w-auto"
                             >
                                 <ChevronLeft size={16} /> Voltar aos Partidos
                             </button>
                         ) : (
                             <div className="flex items-center justify-between w-full md:w-auto gap-3 text-lg font-black text-blue-900 dark:text-white pt-safe pl-1 md:pl-2">
                                 <div className="flex items-center gap-2 md:gap-3">
                                     <div className="p-2 md:p-3 bg-white/50 dark:bg-gray-800 rounded-xl md:rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 backdrop-blur-md">
                                         {viewMode === 'parties' ? <LayoutGrid size={18} className="md:w-[22px] md:h-[22px] text-blue-600"/> : <Users size={18} className="md:w-[22px] md:h-[22px] text-blue-600"/>}
                                     </div>
                                     <span className="tracking-tight text-base md:text-lg">Explorar</span>
                                 </div>
                                 
                                 {/* Mobile: View Toggles tucked here */}
                                 <div className="flex bg-gray-100/50 dark:bg-gray-800/50 rounded-xl p-1 ml-auto md:ml-2 border border-white/30 dark:border-gray-700 backdrop-blur-sm">
                                     <button 
                                        onClick={() => setViewMode('parties')}
                                        className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'parties' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Ver Partidos"
                                    >
                                         <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                                     </button>
                                     <button 
                                        onClick={() => setViewMode('candidates')}
                                        className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Ver Candidatos"
                                    >
                                         <Contact size={16} className="md:w-[18px] md:h-[18px]" />
                                     </button>
                                 </div>
                             </div>
                         )}

                         {/* Search Bar - Compact on Mobile */}
                         <div className="relative group w-full md:flex-1 md:max-w-xl">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                                <Search className="h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400 group-focus-within:scale-110 transition-transform" strokeWidth={3} />
                            </div>
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={selectedParty ? `Buscar em ${selectedParty}...` : viewMode === 'candidates' ? "Nome, partido, estado..." : "Buscar partido..."}
                                className="block w-full pl-10 md:pl-14 pr-10 md:pr-12 py-3 md:py-4 bg-gray-50/50 dark:bg-black/20 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-2xl md:rounded-3xl text-blue-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/80 dark:focus:bg-gray-800/80 transition-all text-sm font-bold shadow-inner"
                            />
                            {search && (
                              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <X size={12} strokeWidth={3} />
                              </button>
                            )}
                         </div>
                    </div>

                    {/* Row 2: Filters (Mobile Optimized with Scroll Hint) */}
                    {!selectedParty && (
                        <div className="relative group/filters">
                            {/* Gradient Scroll Hint (Right side) */}
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 dark:from-black/50 to-transparent pointer-events-none z-20 md:hidden rounded-r-2xl"></div>
                            
                            <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide pb-1 pr-8 md:pr-0 snap-x snap-mandatory">
                                {/* Ideology Chips */}
                                <div className="flex items-center gap-1.5 bg-gray-100/50 dark:bg-white/5 p-1 rounded-2xl border border-gray-200/50 dark:border-white/10 backdrop-blur-md shrink-0 snap-start">
                                    {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => (
                                        <button
                                            key={ideology}
                                            onClick={() => setSelectedIdeology(ideology)}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${
                                                selectedIdeology === ideology 
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-gray-500 hover:bg-white/60 dark:hover:bg-gray-700/60 font-bold'
                                            }`}
                                        >
                                            {ideology}
                                        </button>
                                    ))}
                                </div>

                                {/* State Filter */}
                                <div className="relative shrink-0 snap-start h-full">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <MapPin size={12} strokeWidth={2.5}/>
                                    </div>
                                    <select 
                                        value={selectedUF} 
                                        onChange={(e) => setSelectedUF(e.target.value)}
                                        className="h-full appearance-none bg-gray-100/50 dark:bg-white/10 text-gray-800 dark:text-gray-200 pl-8 pr-8 py-2 rounded-2xl font-bold text-[10px] uppercase focus:outline-none border border-gray-200/50 dark:border-white/10 cursor-pointer backdrop-blur-md shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors min-w-[90px]"
                                    >
                                        <option value="">Brasil</option>
                                        {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>

                                {/* Map Toggle */}
                                <button 
                                    onClick={() => setShowMap(!showMap)} 
                                    className={`shrink-0 h-full px-4 py-2 rounded-2xl border font-bold text-[10px] uppercase flex items-center gap-2 transition-all active:scale-95 shadow-sm snap-start ${
                                        showMap 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-gray-100/50 dark:bg-white/10 backdrop-blur-md text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-white/10 hover:bg-white/80'
                                    }`}
                                >
                                    Mapa
                                </button>
                            </div>

                            {/* Floating Map Panel */}
                            {showMap && (
                                <div className="fixed inset-x-3 bottom-24 md:static z-40 bg-blue-50/95 dark:bg-midnight/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none rounded-[2rem] border border-blue-100 dark:border-blue-900/30 overflow-hidden h-[280px] md:h-[350px] animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 fade-in duration-500 mt-2">
                                    <BrazilMap 
                                        data={mapData} 
                                        selectedState={selectedUF}
                                        onSelectState={(uf) => { setSelectedUF(uf === selectedUF ? "" : uf); if(window.innerWidth < 768) setShowMap(false); }}
                                    />
                                    <button onClick={() => setShowMap(false)} className="md:hidden absolute top-4 right-4 p-2 bg-white/20 rounded-full text-blue-600">
                                      <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 p-4 md:p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe overflow-hidden">
                <div className="w-full max-w-[2000px] mx-auto h-full flex flex-col">
                    
                    {viewMode === 'parties' && !selectedParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6 overflow-y-auto pb-32">
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
                                <div className="mb-4 flex items-center gap-2 shrink-0">
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">
                                        {selectedUF ? `Bancada de ${selectedUF}` : 'Todos os Parlamentares'}
                                    </h3>
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {itemsToRender.length}
                                    </span>
                                </div>
                            )}

                            {itemsToRender.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <p className="font-bold text-gray-500">Nenhum parlamentar encontrado.</p>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <AutoSizer>
                                        {({ height, width }: { height: number, width: number }) => {
                                            const numColumns = getColumnCount(width);
                                            const rowCount = Math.ceil(itemsToRender.length / numColumns);
                                            const itemHeight = 310; // Increased height to prevent clipping

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
