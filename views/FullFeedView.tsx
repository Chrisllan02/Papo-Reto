
import React, { useState, useMemo, useDeferredValue } from 'react';
import { ChevronLeft, Search, Calendar, Filter, X, ExternalLink, ArrowDownUp } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import DataState from '../components/DataState';
import { parseLocalDate } from '../utils/date';
import { getFeedTypeMeta } from '../utils/feedType';
import { safeHttpUrl } from '../utils/url';

interface FullFeedViewProps {
  feedItems: FeedItem[];
  politicians: Politician[];
  onBack: () => void;
  onSelectCandidate: (pol: Politician) => void;
}

type TypeFilter = 'todos' | 'voto' | 'proposicao' | 'despesa' | 'evento';

const TYPE_FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  { id: 'voto', label: 'Votações' },
  { id: 'proposicao', label: 'Proposições' },
  { id: 'despesa', label: 'Despesas' },
  { id: 'evento', label: 'Eventos' },
];

// Itens sem data válida ficam por último na ordenação e fora de qualquer filtro de período
const dateTime = (dateStr?: string) => parseLocalDate(dateStr)?.getTime() ?? null;

const FullFeedView: React.FC<FullFeedViewProps> = ({ feedItems, politicians, onBack, onSelectCandidate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<TypeFilter>('todos');
  const [sortBy, setSortBy] = useState<'relevance' | 'date_desc' | 'date_asc' | 'type'>('date_desc');

  const filteredItems = useMemo(() => {
    // 1. Filtragem
    const items = feedItems.filter(item => {
        // Filtro de Tipo
        if (activeFilter !== 'todos' && item.type !== activeFilter) return false;

        // Filtro de Busca (Texto)
        const searchLower = deferredSearchTerm.toLowerCase();
        const matchText = item.title.toLowerCase().includes(searchLower) || 
                          (item.description && item.description.toLowerCase().includes(searchLower)) ||
                          (item.tags && item.tags.some(t => t.toLowerCase().includes(searchLower)));
        if (!matchText) return false;

        // Filtro de Data
        if (startDate || endDate) {
            const itemTime = dateTime(item.date);
            if (itemTime === null) return false;
            const startTime = parseLocalDate(startDate)?.getTime();
            const endTime = parseLocalDate(endDate)?.getTime();
            if (startTime !== undefined && itemTime < startTime) return false;
            if (endTime !== undefined && itemTime > endTime) return false;
        }

        return true;
    });

    // 2. Ordenação
    return items.sort((a, b) => {
        // Tipo
        if (sortBy === 'type') {
            return a.type.localeCompare(b.type);
        }

        // Data Ascendente (Mais Antigos)
        if (sortBy === 'date_asc') {
            return (dateTime(a.date) ?? Number.MAX_SAFE_INTEGER) - (dateTime(b.date) ?? Number.MAX_SAFE_INTEGER);
        }

        // Relevância (Apenas se houver busca, senão cai no default date_desc)
        if (sortBy === 'relevance' && deferredSearchTerm) {
            const getScore = (item: FeedItem) => {
                const term = deferredSearchTerm.toLowerCase();
                const title = item.title.toLowerCase();
                const desc = item.description?.toLowerCase() || '';
                
                if (title === term) return 100; // Match exato
                if (title.startsWith(term)) return 50; // Começa com
                if (title.includes(term)) return 20; // Contém no título
                if (desc.includes(term)) return 10; // Contém na descrição
                return 1;
            };
            
            const scoreA = getScore(a);
            const scoreB = getScore(b);
            
            if (scoreA !== scoreB) {
                return scoreB - scoreA; // Maior score primeiro
            }
        }

        // Default: Data Descendente (Mais Recentes)
        return (dateTime(b.date) ?? Number.MIN_SAFE_INTEGER) - (dateTime(a.date) ?? Number.MIN_SAFE_INTEGER);
    });

  }, [feedItems, deferredSearchTerm, startDate, endDate, activeFilter, sortBy]);

  const politicianById = useMemo(() => new Map(politicians.map(pol => [pol.id, pol])), [politicians]);

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-24 md:pb-12 animate-in fade-in duration-300">
        
        {/* HEADER FIXO */}
        <div className="sticky top-0 z-30 px-4 pt-4 md:px-8 md:pt-6">
             <div className="mx-auto max-w-[1800px] glass-panel rounded-[2.5rem] border border-white/60 dark:border-white/10 p-4 md:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
                 {/* Linha Superior: Voltar e Título */}
                 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                   <div className="flex items-center gap-4">
                     <button type="button" onClick={onBack} className="focus-visible:ring-4 focus-visible:ring-blue-500/40 p-2.5 bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-full transition-colors active:scale-95 border border-blue-100/70 dark:border-white/10 shadow-sm" aria-label="Voltar para o mural">
                        <ChevronLeft className="text-gray-700 dark:text-white" size={24} aria-hidden="true" />
                     </button>
                     <div>
                         <h1 className="text-2xl md:text-3xl font-black text-midnight dark:text-white leading-none tracking-tight">Histórico Completo</h1>
                         <p className="text-xs text-slate-500 dark:text-slate-300 font-black uppercase tracking-widest mt-1">{filteredItems.length} registros encontrados</p>
                     </div>
                   </div>

                   <div className="hidden lg:flex items-center gap-2 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 px-4 py-3 text-xs font-bold text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30">
                     <Filter size={16} aria-hidden="true" />
                     Use filtros para cruzar data, tipo e termo.
                   </div>
                 </div>

                 {/* Linha de Controles */}
                 <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_auto]">
                     
                     {/* Busca */}
                     <div className="relative flex-1">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                         <input 
                            type="text" 
                            aria-label="Pesquisar no histórico" 
                            placeholder="Pesquisar por palavras-chave..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (e.target.value && sortBy === 'date_desc') setSortBy('relevance'); // Auto-switch to relevance on search
                            }}
                            className="w-full pl-11 pr-10 py-3 bg-white dark:bg-slate-950/40 rounded-2xl text-sm font-bold text-gray-900 dark:text-white border border-blue-100 dark:border-white/10 placeholder-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-4 focus:ring-blue-500/15 transition-all shadow-sm"
                         />
                         {searchTerm && (
                             <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-red-500 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                 <X size={14} aria-hidden="true" />
                             </button>
                         )}
                     </div>

                     <div className="flex flex-wrap gap-3 xl:flex-nowrap xl:justify-end">
                        {/* Datas */}
                        <div className="flex min-w-0 flex-1 gap-2 sm:flex-none">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Calendar size={14} aria-hidden="true" /></div>
                                <input 
                                    type="date" 
                                    aria-label="Data inicial"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-full w-full min-w-[145px] rounded-2xl border border-blue-100 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-3 text-xs font-black uppercase text-slate-600 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/15"
                                />
                            </div>
                            <div className="flex items-center text-slate-400 font-bold" aria-hidden="true">-</div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><Calendar size={14} aria-hidden="true" /></div>
                                <input 
                                    type="date" 
                                    aria-label="Data final"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-full w-full min-w-[145px] rounded-2xl border border-blue-100 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-3 text-xs font-black uppercase text-slate-600 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/15"
                                />
                            </div>
                        </div>

                        {/* Ordenação */}
                        <div className="relative shrink-0">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ArrowDownUp size={14} aria-hidden="true" /></div>
                            <select
                                aria-label="Ordenar registros"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="h-full min-w-[180px] appearance-none rounded-2xl border border-blue-100 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-8 text-xs font-black uppercase text-slate-700 dark:text-slate-100 cursor-pointer focus:ring-4 focus:ring-blue-500/15"
                            >
                                <option value="relevance">Relevância</option>
                                <option value="date_desc">Mais Recentes</option>
                                <option value="date_asc">Mais Antigos</option>
                                <option value="type">Agrupar por Tipo</option>
                            </select>
                        </div>

                        {/* Tabs Tipo */}
                        <div role="group" aria-label="Filtrar por tipo" className="flex shrink-0 rounded-2xl border border-blue-100 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 p-1 shadow-sm">
                            {TYPE_FILTERS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveFilter(id)}
                                    aria-pressed={activeFilter === id}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all focus-visible:ring-4 focus-visible:ring-blue-500/40 ${activeFilter === id ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-white/10 hover:text-blue-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                     </div>
                 </div>
             </div>
        </div>

        {/* GRID DE CONTEÚDO */}
        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-8 md:py-8">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => {
                    const candidate = item.politicianId ? politicianById.get(item.politicianId) ?? null : null;
                    const isExpense = item.type === 'despesa';
                    const typeMeta = getFeedTypeMeta(item.type);

                    return (
                        <div key={`${item.type}-${item.id}`} className="group flex h-full min-h-[250px] flex-col rounded-[2rem] border border-white/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.14)]">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 ${typeMeta.chipClass}`}>
                                    <typeMeta.Icon size={10} aria-hidden="true" />
                                    {typeMeta.label}
                                </span>
                                <span className="text-[10px] font-black text-slate-400">{item.date}</span>
                            </div>

                            <h3 className="font-black text-midnight dark:text-white text-lg leading-tight mb-3 line-clamp-3 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                {item.title}
                            </h3>

                             {isExpense && item.amount && (
                                <div className="mb-2">
                                    <p className="text-xl font-black text-midnight dark:text-white tracking-tighter">{item.amount}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold truncate">{item.provider}</p>
                                </div>
                            )}

                            {item.description && !isExpense && (
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-3 mb-4">
                                    {item.description}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                                {candidate ? (
                                    <button type="button" onClick={() => onSelectCandidate(candidate)} className="flex items-center gap-2 rounded-lg text-left focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                        <img src={candidate.photo} className="w-6 h-6 rounded-full bg-gray-200 object-cover" alt=""/>
                                        <span className="truncate max-w-[100px] text-[10px] font-bold text-midnight dark:text-white">{candidate.name}</span>
                                        <span className="sr-only">Ver perfil</span>
                                    </button>
                                ) : (
                                    <span className="text-[10px] font-black text-slate-400">Institucional</span>
                                )}
                                {safeHttpUrl(item.sourceUrl) && (
                                    <a href={safeHttpUrl(item.sourceUrl)} target="_blank" rel="noopener noreferrer" className="p-1 rounded-md text-slate-400 hover:text-blue-500 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40" aria-label="Abrir fonte oficial (nova aba)">
                                        <ExternalLink size={14} aria-hidden="true" />
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {filteredItems.length === 0 && (
                <div className="py-10 flex justify-center">
                    <DataState
                        title="Nenhum item encontrado"
                        description="Nenhum registro corresponde a esses filtros. Tente outro termo, outro período ou limpe os filtros."
                        actionLabel="Limpar filtros"
                        onAction={() => {
                            setSearchTerm('');
                            setStartDate('');
                            setEndDate('');
                            setActiveFilter('todos');
                        }}
                    />
                </div>
            )}
        </div>

    </div>
  );
};

export default FullFeedView;
