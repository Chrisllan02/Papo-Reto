
import React, { useState, useMemo, useDeferredValue } from 'react';
import { ChevronLeft, Search, Calendar, Filter, X, ExternalLink, ArrowDownUp } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import DataState from '../components/DataState';
import { parseLocalDate } from '../utils/date';
import { getFeedTypeMeta } from '../utils/feedType';
import { safeHttpUrl } from '../utils/url';
import { feedCode, isRedundantText, resolveFeedTitle } from '../utils/feedText';

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
        <div className="sticky top-0 z-30 px-4 pt-4 md:px-8 md:pt-6">
             <div className="mx-auto max-w-[1800px] glass-panel rounded-2xl p-4 md:p-6">
                 <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                   <div className="flex items-center gap-4">
                     <button type="button" onClick={onBack} className="focus-visible:ring-4 focus-visible:ring-blue-500/40 w-11 h-11 flex items-center justify-center bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-full transition-colors active:scale-[0.98] border border-slate-200/70 dark:border-white/10" aria-label="Voltar para o mural">
                        <ChevronLeft className="text-muted-strong" size={24} aria-hidden="true" />
                     </button>
                     <div>
                         <h1 className="text-2xl md:text-3xl font-black text-midnight dark:text-white leading-tight">Histórico completo</h1>
                         <p className="text-xs text-subtle font-medium mt-1">{filteredItems.length} registros encontrados</p>
                     </div>
                   </div>

                   <div className="hidden lg:flex items-center gap-2 rounded-2xl bg-blue-50/70 dark:bg-blue-900/20 px-4 py-3 text-xs font-medium text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30">
                     <Filter size={16} aria-hidden="true" />
                     Use filtros para cruzar data, tipo e termo.
                   </div>
                 </div>

                 <div className="mt-6 grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(260px,1fr)_auto]">
                     <div className="relative flex-1">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-subtle" size={18} aria-hidden="true" />
                         <input
                            type="text"
                            aria-label="Pesquisar no histórico"
                            placeholder="Pesquisar por palavras-chave..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (e.target.value && sortBy === 'date_desc') setSortBy('relevance');
                            }}
                            className="w-full min-h-11 pl-11 pr-12 py-3 bg-white dark:bg-slate-950/40 rounded-2xl text-sm font-semibold text-midnight dark:text-white border border-slate-200 dark:border-white/10 placeholder:text-subtle focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-colors"
                         />
                         {searchTerm && (
                             <button type="button" onClick={() => setSearchTerm('')} aria-label="Limpar busca" className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full text-subtle hover:text-red-700 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                 <X size={16} aria-hidden="true" />
                             </button>
                         )}
                     </div>

                     <div className="flex flex-wrap gap-4 2xl:flex-nowrap 2xl:justify-end">
                        <div className="flex min-w-0 flex-1 gap-2 sm:flex-none">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"><Calendar size={14} aria-hidden="true" /></div>
                                <input
                                    type="date"
                                    aria-label="Data inicial"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-full min-h-11 w-full min-w-[145px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-3 text-xs font-semibold text-muted-strong focus:ring-4 focus:ring-blue-500/15"
                                />
                            </div>
                            <div className="flex items-center text-subtle font-bold" aria-hidden="true">-</div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"><Calendar size={14} aria-hidden="true" /></div>
                                <input
                                    type="date"
                                    aria-label="Data final"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-full min-h-11 w-full min-w-[145px] rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-3 text-xs font-semibold text-muted-strong focus:ring-4 focus:ring-blue-500/15"
                                />
                            </div>
                        </div>

                        <div className="relative shrink-0">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"><ArrowDownUp size={14} aria-hidden="true" /></div>
                            <select
                                aria-label="Ordenar registros"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                                className="h-full min-h-11 min-w-[180px] appearance-none rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950/40 py-3 pl-9 pr-8 text-xs font-semibold text-muted-strong cursor-pointer focus:ring-4 focus:ring-blue-500/15"
                            >
                                <option value="relevance">Relevância</option>
                                <option value="date_desc">Mais recentes</option>
                                <option value="date_asc">Mais antigos</option>
                                <option value="type">Agrupar por tipo</option>
                            </select>
                        </div>

                        <div role="group" aria-label="Filtrar por tipo" className="flex shrink-0 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/40 p-1">
                            {TYPE_FILTERS.map(({ id, label }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveFilter(id)}
                                    aria-pressed={activeFilter === id}
                                    className={`min-h-11 px-4 py-2 rounded-xl text-xs font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40 ${activeFilter === id ? 'bg-blue-600 text-white' : 'text-muted-strong hover:bg-blue-50 dark:hover:bg-white/10 hover:text-blue-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                     </div>
                 </div>
             </div>
        </div>

        <div className="mx-auto w-full max-w-[1800px] px-4 py-6 md:px-8 md:py-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredItems.map((item) => {
                    const candidate = item.politicianId ? politicianById.get(item.politicianId) ?? null : null;
                    const isExpense = item.type === 'despesa';
                    const typeMeta = getFeedTypeMeta(item.type);
                    const title = resolveFeedTitle(item.title, item.description);
                    const code = feedCode(item.title, item.description);
                    const description = item.description && !isRedundantText(title, item.description) ? item.description : undefined;
                    const sourceUrl = safeHttpUrl(item.sourceUrl);

                    return (
                        <article key={`${item.type}-${item.id}`} className="flex h-full min-h-[250px] flex-col rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.05] p-4 md:p-6 shadow-sm">
                            <div className="flex justify-between items-start gap-2 mb-4">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1.5 ${typeMeta.chipClass}`}>
                                    <typeMeta.Icon size={14} aria-hidden="true" />
                                    {typeMeta.label}
                                </span>
                                <span className="text-xs font-medium text-subtle">{item.date}</span>
                            </div>

                            <h3 className="font-black text-midnight dark:text-white text-lg leading-snug mb-2 line-clamp-3 break-words">
                                {title}
                            </h3>
                            {code && <p className="text-xs font-medium text-subtle mb-2">{code}</p>}

                            {isExpense && item.amount && (
                                <div className="mb-2">
                                    <p className="text-xl font-black text-midnight dark:text-white tracking-tight">{item.amount}</p>
                                    <p className="text-xs text-subtle font-medium truncate">{item.provider}</p>
                                </div>
                            )}

                            {description && !isExpense && (
                                <p className="text-sm text-muted-strong font-medium leading-relaxed line-clamp-3 mb-4">
                                    {description}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2">
                                {candidate ? (
                                    <button type="button" onClick={() => onSelectCandidate(candidate)} className="flex items-center gap-2 min-h-11 rounded-lg text-left focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                        <img src={candidate.photo} className="w-6 h-6 rounded-full bg-slate-200 object-cover" alt=""/>
                                        <span className="truncate max-w-[140px] text-xs font-semibold text-midnight dark:text-white">{candidate.name}</span>
                                        <span className="sr-only">Ver perfil</span>
                                    </button>
                                ) : (
                                    <span className="text-xs font-medium text-subtle">Institucional</span>
                                )}
                                {sourceUrl && (
                                    <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-11 rounded text-xs font-medium text-blue-700 dark:text-blue-300 underline-offset-2 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40">
                                        Fonte oficial
                                        <ExternalLink size={12} aria-hidden="true" />
                                        <span className="sr-only">(abre em nova aba)</span>
                                    </a>
                                )}
                            </div>
                        </article>
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
