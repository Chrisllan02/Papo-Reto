
import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Search, Users, ChevronLeft, MapPin, LayoutGrid, Map, ChevronDown, X, Contact } from 'lucide-react';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

// Robust fallback for CJS/ESM interop
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;
const Grid = (ReactWindow as any).FixedSizeGrid || (ReactWindow as any).default?.FixedSizeGrid || ReactWindow;
const areEqual = (ReactWindow as any).areEqual || (ReactWindow as any).default?.areEqual;

import { Politician } from '../types';
import { useAppStore } from '../store/useAppStore';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { PARTY_METADATA } from '../services/camaraApi';
import BrazilMap from '../components/BrazilMap';
import OptimizedImage from '../components/OptimizedImage';

const ESTADOS_BRASIL = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

type IdeologyFilter = 'Todos' | 'Esquerda' | 'Centro' | 'Direita';
type ViewMode = 'parties' | 'candidates';

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
            className="w-full group relative bg-white/90 dark:bg-midnight/95 backdrop-blur-2xl rounded-[2.5rem] p-5 md:p-6 text-left border border-white/40 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:shadow-2xl transition-all active:scale-[0.98] overflow-hidden flex flex-col justify-between min-h-[180px] md:min-h-[220px]"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}></div>

            <div>
                <div className="flex justify-between items-start mb-4 md:mb-6 relative z-10">
                    {group.logo && !imgError ? (
                        <div className="w-10 h-10 md:w-14 md:h-14 bg-white/80 rounded-2xl md:rounded-3xl p-1 shadow-md border border-white/50 flex items-center justify-center backdrop-blur-md">
                            <OptimizedImage 
                                src={group.logo} 
                                alt={group.name} 
                                widthParam={100}
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

            <div className="mt-4 flex -space-x-2.5 relative z-10 h-8 md:h-10">
                {previewMembers.map((m: any) => (
                    <div key={m.id} className="w-8 h-8 md:w-10 md:h-10 rounded-full border-[2px] md:border-[3px] border-white dark:border-gray-900 bg-gray-200 shadow-md overflow-hidden">
                        <OptimizedImage 
                            src={m.photo} 
                            widthParam={80}
                            className="w-full h-full object-cover" 
                            alt=""
                        />
                    </div>
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

// --- COMPONENTE DE CÉLULA DO GRID VIRTUAL ---
// Memoizado automaticamente pelo React.memo (implicit no areEqual)
const CandidateCell = React.memo(({ columnIndex, rowIndex, style, data }: any) => {
    const { items, columnCount, onSelect } = data;
    const index = rowIndex * columnCount + columnIndex;
    
    // Se o índice calculado exceder o número de itens, renderiza vazio (para preencher última linha)
    if (index >= items.length) {
        return <div style={style} />;
    }

    const pol = items[index];

    return (
        <div style={style} className="p-2 md:p-3">
            <div 
                onClick={() => onSelect(pol)} 
                className="h-full w-full bg-white/90 dark:bg-midnight/90 backdrop-blur-xl rounded-[2rem] p-4 border border-white/20 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_10px_40px_rgba(0,0,0,0.8)] transition-all active:scale-95 group flex flex-col items-center text-center relative overflow-hidden cursor-pointer"
            >
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-[4px] border-white/80 dark:border-gray-700 shadow-lg bg-gray-200 shrink-0">
                    <OptimizedImage 
                        src={pol.photo} 
                        alt={pol.name} 
                        widthParam={150}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                </div>
                <h3 className="font-black text-blue-900 dark:text-white text-xs md:text-sm line-clamp-1 w-full">{pol.name}</h3>
                <div className="mt-2 flex flex-wrap justify-center gap-1 w-full">
                    <span className="text-[8px] font-black bg-gray-100/50 dark:bg-white/5 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 uppercase tracking-tighter backdrop-blur-md border border-gray-200/50 dark:border-white/10">{pol.party}</span>
                    <span className="text-[8px] font-black bg-blue-50/50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full text-blue-600 dark:text-blue-300 uppercase tracking-tighter backdrop-blur-md border border-blue-100/50 dark:border-blue-900/50">{pol.state}</span>
                </div>
            </div>
        </div>
    );
}, areEqual);

const ExploreView: React.FC = () => {
    // Connect to Store
    const politicians = useAppStore((state) => state.politicians);
    const parties = useAppStore((state) => state.parties);
    const setSelectedCandidate = useAppStore((state) => state.setSelectedCandidate);
    const preselectedState = useAppStore((state) => state.exploreFilterState);
    
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
        const searchLower = deferredSearch.toLowerCase();
        
        return politicians.filter(p => {
            if (selectedUF && p.state !== selectedUF) return false;
            
            if (searchLower) {
                const matchesName = p.name.toLowerCase().includes(searchLower);
                const matchesParty = p.party.toLowerCase().includes(searchLower);
                if (!matchesName && !matchesParty) return false;
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

    // Dados a serem exibidos na grid (Partidários ou Gerais)
    const gridItems = selectedParty ? currentPartyMembers : filteredPoliticians;

    return (
        <div className="w-full h-full bg-transparent flex flex-col">
            <div className="sticky top-0 z-30 pt-4 px-3 md:px-6 pb-2">
                <div className="w-full bg-white/90 dark:bg-midnight/90 backdrop-blur-3xl border border-white/30 dark:border-white/10 rounded-[3rem] p-4 md:p-6 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-5 max-w-[2000px] mx-auto">
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-bold transition-all active:scale-95 text-xs shrink-0 shadow-lg hover:shadow-xl"
                             >
                                 <ChevronLeft size={16} /> Voltar aos Partidos
                             </button>
                         ) : (
                             <div className="flex items-center gap-3 text-lg font-black text-blue-900 dark:text-white shrink-0 pt-safe pl-2">
                                 <div className="p-3 bg-white/80 dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 backdrop-blur-md">
                                     {viewMode === 'parties' ? <LayoutGrid size={22} className="text-blue-600"/> : <Users size={22} className="text-blue-600"/>}
                                 </div>
                                 <span className="hidden sm:inline tracking-tight">Explorar</span>
                                 
                                 <div className="flex bg-white/30 dark:bg-gray-800/30 rounded-2xl p-1 ml-2 border border-white/30 dark:border-gray-700 backdrop-blur-sm">
                                     <button 
                                        onClick={() => setViewMode('parties')}
                                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'parties' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Ver Partidos"
                                    >
                                         <LayoutGrid size={18} />
                                     </button>
                                     <button 
                                        onClick={() => setViewMode('candidates')}
                                        className={`p-2.5 rounded-xl transition-all ${viewMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
                                        title="Ver Candidatos"
                                     >
                                         <Contact size={18} />
                                     </button>
                                 </div>
                             </div>
                         )}

                         <div className="flex-1 relative group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 group-focus-within:scale-110 transition-transform" strokeWidth={3} />
                            </div>
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={selectedParty ? `Buscar em ${selectedParty}...` : viewMode === 'candidates' ? "Buscar nome ou estado..." : "Buscar partido..."}
                                className="block w-full pl-14 pr-12 py-4 bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-3xl text-blue-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white/80 dark:focus:bg-gray-800/80 transition-all text-sm font-bold shadow-inner"
                            />
                            {search && (
                              <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <X size={14} strokeWidth={3} />
                              </button>
                            )}
                         </div>
                    </div>

                    {!selectedParty && (
                        <div className="flex flex-row items-center gap-4 overflow-x-auto overflow-y-hidden pb-1">
                            <div className="flex-1 flex flex-row items-center gap-2 bg-white/20 dark:bg-white/5 p-1.5 rounded-3xl border border-white/20 dark:border-white/10 overflow-x-auto scrollbar-hide backdrop-blur-md shadow-inner min-w-[200px] whitespace-nowrap">
                                {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => (
                                    <button
                                        key={ideology}
                                        onClick={() => setSelectedIdeology(ideology)}
                                        className={`px-4 md:px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap shrink-0 ${
                                            selectedIdeology === ideology 
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'text-gray-500 hover:bg-white/40 dark:hover:bg-gray-700/40 font-bold'
                                        }`}
                                    >
                                        {ideology}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-row gap-2 shrink-0">
                                <div className="relative shrink-0 min-w-[120px] md:min-w-[140px]">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <MapPin size={16} strokeWidth={2.5}/>
                                    </div>
                                    <select 
                                        value={selectedUF} 
                                        onChange={(e) => setSelectedUF(e.target.value)}
                                        className="w-full h-full appearance-none bg-white/50 dark:bg-white/10 text-gray-800 dark:text-gray-200 pl-11 pr-10 py-3 rounded-2xl font-bold text-[10px] uppercase focus:outline-none border border-white/30 dark:border-white/10 cursor-pointer backdrop-blur-md shadow-sm hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                                    >
                                        <option value="">Todos UF</option>
                                        {ESTADOS_BRASIL.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>

                                <button 
                                    onClick={() => setShowMap(!showMap)} 
                                    className={`shrink-0 px-4 md:px-6 py-3 rounded-2xl border font-bold text-[10px] uppercase flex items-center gap-2 transition-all active:scale-95 shadow-sm ${
                                        showMap 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white/50 dark:bg-white/10 backdrop-blur-md text-gray-600 dark:text-gray-300 border-white/30 dark:border-white/10 hover:bg-white/80'
                                    }`}
                                    aria-label="Alternar visualização do mapa"
                                    aria-pressed={showMap}
                                >
                                    <Map size={16}/> <span className="hidden sm:inline">Mapa</span>
                                </button>
                            </div>

                            {showMap && (
                                <div className="fixed inset-x-3 bottom-24 md:static z-40 bg-blue-50/95 dark:bg-midnight/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none rounded-[2rem] border border-blue-100 dark:border-blue-900/30 overflow-hidden h-[280px] md:h-[350px] animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 fade-in duration-500">
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

            <div className="flex-1 overflow-hidden px-4 md:px-8 pb-0 pt-2 px-safe">
                <div className="w-full h-full max-w-[2000px] mx-auto">
                    
                    {viewMode === 'parties' && !selectedParty ? (
                        /* Modo Partidos */
                        <div className="h-full overflow-y-auto pb-32 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
                                {partiesData.map((group) => (
                                    <PartyCard 
                                        key={group.name} 
                                        group={group} 
                                        getPartyColor={getPartyColor} 
                                        onSelect={setSelectedParty} 
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Modo Candidatos - VIRTUALIZADO */
                        <div className="h-full w-full">
                            {/* Header de Contagem */}
                            {viewMode === 'candidates' && !selectedParty && (
                                <div className="mb-4 flex items-center gap-2">
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">
                                        {selectedUF ? `Bancada de ${selectedUF}` : 'Todos os Parlamentares'}
                                    </h3>
                                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {gridItems.length}
                                    </span>
                                </div>
                            )}

                            {gridItems.length === 0 ? (
                                <div className="text-center py-20 opacity-50">
                                    <p className="font-bold text-gray-500">Nenhum parlamentar encontrado.</p>
                                </div>
                            ) : (
                                <div style={{ height: 'calc(100% - 100px)' }}> 
                                    <AutoSizer>
                                        {({ height, width }: { height: number, width: number }) => {
                                            let columnCount = 2;
                                            if (width >= 768) columnCount = 3;
                                            if (width >= 1024) columnCount = 4;
                                            if (width >= 1280) columnCount = 6;
                                            if (width >= 1536) columnCount = 7;

                                            const columnWidth = width / columnCount;
                                            const rowHeight = 220; 

                                            return (
                                                <Grid
                                                    columnCount={columnCount}
                                                    columnWidth={columnWidth}
                                                    height={height}
                                                    rowCount={Math.ceil(gridItems.length / columnCount)}
                                                    rowHeight={rowHeight}
                                                    width={width}
                                                    itemData={{ items: gridItems, columnCount, onSelect: setSelectedCandidate }}
                                                    className="custom-scrollbar"
                                                >
                                                    {CandidateCell}
                                                </Grid>
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
