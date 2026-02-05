
import React, { useState, useMemo, useDeferredValue, useEffect } from 'react';
import { Search, Users, ChevronLeft, MapPin, LayoutGrid, ChevronDown, X, Contact, Heart, Filter, User } from 'lucide-react';
import { Politician, Party } from '../types';
import { formatPartyName, getIdeology } from '../services/camaraApi';
import { PARTY_METADATA } from '../services/camaraApi';
import * as ReactWindow from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';

// Fix for "module does not provide an export named 'default'" error in some ESM environments
const AutoSizer = (AutoSizerModule as any).default || AutoSizerModule;
const List = (ReactWindow as any).FixedSizeList;

interface ExploreViewProps {
  politicians: Politician[];
  parties?: Party[]; 
  onSelectCandidate: (pol: Politician) => void;
  followingIds?: number[]; 
  preselectedState?: string;
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
  onSelect: (name: string) => void;
}

const PartyCard: React.FC<PartyCardProps> = ({ group, onSelect }) => {
    const ideology = group.ideology || 'Centro';
    
    // Cores Semânticas Definidas
    const getTheme = (ideo: string) => {
        if (ideo === 'Esquerda') return {
            bg: 'bg-rose-50/80 dark:bg-rose-900/10',
            border: 'border-rose-100 dark:border-rose-900/30',
            iconBg: 'bg-[#C41E3A]',
            text: 'text-rose-900 dark:text-rose-100',
            badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
            badgeText: 'text-[#C41E3A] dark:text-rose-300',
            label: 'ESQ'
        };
        if (ideo === 'Direita') return {
            bg: 'bg-indigo-50/80 dark:bg-indigo-900/10',
            border: 'border-indigo-100 dark:border-indigo-900/30',
            iconBg: 'bg-[#2E3192]',
            text: 'text-indigo-900 dark:text-indigo-100',
            badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40',
            badgeText: 'text-[#2E3192] dark:text-indigo-300',
            label: 'DIR'
        };
        // Centro
        return {
            bg: 'bg-amber-50/80 dark:bg-amber-900/10',
            border: 'border-amber-100 dark:border-amber-900/30',
            iconBg: 'bg-[#E69138]',
            text: 'text-amber-900 dark:text-amber-100',
            badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
            badgeText: 'text-[#E69138] dark:text-amber-300',
            label: 'CEN'
        };
    };

    const theme = getTheme(ideology);
    const badgeLabel = group.name;
    const previewMembers = group.members.slice(0, 4);

    return (
        <button 
            onClick={() => onSelect(group.name)}
            className={`group relative rounded-[2rem] p-4 text-left shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] flex flex-col min-h-[140px] border ${theme.bg} ${theme.border} hover:bg-white dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-white/10`}
        >
            <div className="w-full relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-[10px] shadow-md ${theme.iconBg}`}>
                        {badgeLabel.substring(0, 4)}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${theme.badgeBg} ${theme.badgeText}`}>
                        {theme.label}
                    </span>
                </div>

                <div className="mt-auto">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter mb-0.5 truncate leading-none">
                        {group.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                        {group.members.length} Parlamentares
                    </p>

                    <div className="flex -space-x-2 items-center">
                        {previewMembers.map((m: any) => (
                            <div key={m.id} className="relative transition-transform duration-200 hover:scale-110 hover:z-30">
                                <div className="w-8 h-8 rounded-full border-[2px] border-white dark:border-gray-900 bg-gray-200 overflow-hidden shadow-sm">
                                    <img src={m.photo} className="w-full h-full object-cover" alt="" loading="lazy" />
                                </div>
                            </div>
                        ))}
                        {group.members.length > 4 && (
                            <div className="w-8 h-8 rounded-full border-[2px] border-white dark:border-gray-900 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[8px] font-black text-gray-500 shadow-sm relative z-0">
                                +{group.members.length - 4}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
};

const PoliticianCard = ({ pol, onSelect, isFollowing }: { pol: Politician, onSelect: (p: Politician) => void, isFollowing: boolean }) => (
    <div onClick={() => onSelect(pol)} className="glass shadow-lg hover:shadow-2xl transition-all active:scale-95 group flex flex-col items-center text-center relative rounded-[1.5rem] p-2 h-full border border-white/40 dark:border-white/5 cursor-pointer bg-white/40 dark:bg-white/5 min-h-[150px]">
        {isFollowing && (
            <div className="absolute top-2 left-2 z-20">
                <div className="bg-orange-500 p-1.5 rounded-full shadow-md border-2 border-white dark:border-gray-800">
                    <Heart size={8} className="fill-white text-white"/>
                </div>
            </div>
        )}
        <div className="w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-full overflow-hidden mb-2 border-[2px] border-white/80 dark:border-gray-700 shadow-md relative z-10 bg-gray-200">
            <img src={pol.photo} alt={pol.name} loading="lazy" className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"/>
        </div>
        <h3 className="font-black text-blue-900 dark:text-white text-[10px] md:text-xs line-clamp-2 w-full leading-tight min-h-[2.5em] flex items-center justify-center mb-1">{pol.name}</h3>
        <div className="mt-auto flex flex-wrap justify-center gap-1 w-full">
            <span className="text-[8px] font-black bg-gray-100/80 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-gray-700 dark:text-gray-300 uppercase tracking-tighter border border-blue-200/50 dark:border-white/10">{pol.party}</span>
            <span className="text-[8px] font-black bg-blue-50/80 dark:bg-blue-900/30 px-1.5 py-0.5 rounded-md text-blue-600 dark:text-blue-300 uppercase tracking-tighter border border-blue-100/50 dark:border-blue-900/50">{pol.state}</span>
        </div>
    </div>
);

const ExploreView: React.FC<ExploreViewProps> = ({ politicians, parties = [], onSelectCandidate, followingIds = [], preselectedState }) => {
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    
    const [selectedUF, setSelectedUF] = useState(preselectedState || "");
    const [selectedIdeology, setSelectedIdeology] = useState<IdeologyFilter>('Todos');
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('parties');
    const [showStateSelector, setShowStateSelector] = useState(false);

    useEffect(() => {
        if (preselectedState) {
            setSelectedUF(preselectedState);
            setViewMode('candidates');
        }
    }, [preselectedState]);

    // Lógica de Busca Inteligente (Mista)
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearch(query);

        // Se estiver em Partidos e digitar algo >= 3 letras
        if (viewMode === 'parties' && query.length >= 3) {
            const normQuery = normalizeString(query);
            
            // 1. Verifica se parece um partido (Sigla ou Nome)
            const isPartyMatch = Object.keys(PARTY_METADATA).some(sigla => 
                normalizeString(sigla).startsWith(normQuery) || 
                normalizeString(PARTY_METADATA[sigla].nome).includes(normQuery)
            );

            // 2. Se NÃO for partido, verifica se é nome de político
            if (!isPartyMatch) {
                const hasCandidateMatch = politicians.some(p => 
                    normalizeString(p.name).includes(normQuery) || 
                    (p.civilName && normalizeString(p.civilName).includes(normQuery))
                );

                // 3. Auto-Switch
                if (hasCandidateMatch) {
                    setViewMode('candidates');
                }
            }
        }
    };

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

    const VirtualRow = ({ index, style, data }: any) => {
        const { items, numColumns } = data;
        const startIndex = index * numColumns;
        const rowItems = items.slice(startIndex, startIndex + numColumns);

        return (
            <div style={style} className="flex gap-3 md:gap-4 px-1 pb-4">
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
        if (width >= 1536) return 8; 
        if (width >= 1280) return 6; 
        if (width >= 1024) return 5; 
        if (width >= 768) return 4; 
        return 3; 
    };

    const itemsToRender = selectedParty ? currentPartyMembers : filteredPoliticians;

    return (
        <div className="w-full h-full bg-transparent flex flex-col">
            
            <div className="sticky top-0 z-30 pt-2 px-2 md:pt-4 md:px-6 pb-2">
                <div className="w-full glass rounded-[2.5rem] p-4 shadow-xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-midnight/90 backdrop-blur-xl flex flex-col gap-4">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                         {selectedParty ? (
                             <button 
                                onClick={() => setSelectedParty(null)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all"
                             >
                                 <ChevronLeft size={16} /> Voltar
                             </button>
                         ) : (
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-900 dark:text-blue-400">
                                     {viewMode === 'parties' ? <LayoutGrid size={20}/> : <Users size={20}/>}
                                 </div>
                                 <span className="text-lg font-black text-midnight dark:text-white tracking-tight">
                                     {viewMode === 'parties' ? 'Partidos' : 'Parlamentares'}
                                 </span>
                             </div>
                         )}
                         
                         {/* Segmented Control Toggle */}
                         {!selectedParty && (
                             <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-white/20 self-end sm:self-auto">
                                 <button 
                                    onClick={() => setViewMode('parties')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wide ${viewMode === 'parties' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'}`}
                                >
                                     <LayoutGrid size={16} />
                                     <span>Partidos</span>
                                 </button>
                                 <button 
                                    onClick={() => setViewMode('candidates')}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wide ${viewMode === 'candidates' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50'}`}
                                >
                                     <Contact size={16} />
                                     <span>Candidatos</span>
                                 </button>
                             </div>
                         )}
                    </div>

                    {/* Search Bar - Com Handler Misto */}
                    <div className="relative group w-full">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            value={search}
                            onChange={handleSearch}
                            placeholder={selectedParty ? `Buscar em ${selectedParty}...` : viewMode === 'candidates' ? "Nome, estado..." : "Buscar partido ou político..."}
                            className="block w-full pl-11 pr-10 py-3.5 bg-gray-50/80 dark:bg-black/20 border border-blue-200 dark:border-white/10 rounded-2xl text-base font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                        />
                        {search && (
                          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-blue-100 dark:bg-gray-700 rounded-full text-blue-500 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                    </div>

                    {/* Filters Row */}
                    {!selectedParty && (
                        <div className="relative group/filters">
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-midnight to-transparent pointer-events-none z-10 md:hidden rounded-r-2xl"></div>
                            
                            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory pr-4">
                                
                                {/* Ideology Group (Cores Semânticas) */}
                                <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-blue-200 dark:border-white/5 shrink-0 snap-start">
                                    {(['Todos', 'Esquerda', 'Centro', 'Direita'] as IdeologyFilter[]).map((ideology) => {
                                        const isActive = selectedIdeology === ideology;
                                        let activeClass = 'bg-blue-600 text-white shadow-md shadow-blue-600/20'; // Default
                                        if (ideology === 'Esquerda') activeClass = 'bg-rose-600 text-white shadow-md shadow-rose-600/20';
                                        if (ideology === 'Direita') activeClass = 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20';
                                        if (ideology === 'Centro') activeClass = 'bg-amber-500 text-white shadow-md shadow-amber-500/20';

                                        return (
                                            <button
                                                key={ideology}
                                                onClick={() => setSelectedIdeology(ideology)}
                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${
                                                    isActive 
                                                    ? activeClass
                                                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-white/5'
                                                }`}
                                            >
                                                {ideology}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Bottom Sheet Trigger */}
                                <div className="relative shrink-0 snap-start">
                                    <button
                                        onClick={() => setShowStateSelector(true)}
                                        className="relative flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 pl-3 pr-4 py-2 rounded-xl font-bold text-xs uppercase border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shrink-0 h-full"
                                    >
                                        <MapPin size={16} />
                                        <span>{selectedUF || 'Brasil'}</span>
                                        <ChevronDown size={14} className="ml-1 opacity-50" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 p-3 md:p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe overflow-hidden">
                <div className="w-full max-w-[2000px] mx-auto h-full flex flex-col">
                    
                    {viewMode === 'parties' && !selectedParty && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 overflow-y-auto pb-32 custom-scrollbar pr-1">
                            {partiesData.map((group) => (
                                <PartyCard 
                                    key={group.name} 
                                    group={group} 
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
                                <div className="text-center py-20 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 px-4">
                                    <div className="bg-gray-100 dark:bg-white/5 p-6 rounded-full mb-4 shadow-inner">
                                        <User size={48} className="text-gray-400 dark:text-gray-500" strokeWidth={1.5}/>
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">Nenhum resultado encontrado</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto mb-6 font-medium leading-relaxed">
                                        Não encontramos parlamentares com os filtros atuais.
                                    </p>
                                    <button 
                                        onClick={() => {
                                            setSearch("");
                                            setSelectedUF("");
                                            setSelectedIdeology('Todos');
                                        }}
                                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                    >
                                        <Filter size={14} /> Limpar Filtros
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1">
                                    <AutoSizer>
                                        {({ height, width }: { height: number, width: number }) => {
                                            const numColumns = getColumnCount(width);
                                            const rowCount = Math.ceil(itemsToRender.length / numColumns);
                                            const itemHeight = width < 768 ? 165 : 180; 

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

            {/* Bottom Sheet Modal */}
            {showStateSelector && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowStateSelector(false)}>
                    <div 
                        className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 duration-300 border border-white/20" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <MapPin size={16} className="text-blue-600"/> Filtrar por Estado
                            </span>
                            <button onClick={() => setShowStateSelector(false)} className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors"><X size={16}/></button>
                        </div>
                        
                        <div className="p-4 overflow-y-auto grid grid-cols-4 gap-2 custom-scrollbar">
                            <button
                                onClick={() => { setSelectedUF(""); setShowStateSelector(false); }}
                                className={`col-span-4 p-3 rounded-xl font-bold text-sm mb-2 transition-all flex items-center justify-center gap-2 ${selectedUF === "" ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                            >
                               <MapPin size={16} /> Todo o Brasil
                            </button>
                            {ESTADOS_BRASIL.map(uf => (
                                <button
                                    key={uf}
                                    onClick={() => { setSelectedUF(uf); setShowStateSelector(false); }}
                                    className={`p-3 rounded-xl font-black text-xs transition-all ${selectedUF === uf ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-100 dark:border-gray-700'}`}
                                >
                                    {uf}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExploreView;
