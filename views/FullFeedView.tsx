
import React, { useState, useMemo } from 'react';
import { ChevronLeft, Search, Calendar, Filter, X, Landmark, Banknote, Info, ExternalLink, ArrowDownUp } from 'lucide-react';
import { FeedItem, Politician } from '../types';

interface FullFeedViewProps {
  feedItems: FeedItem[];
  politicians: Politician[];
  onBack: () => void;
  onSelectCandidate: (pol: Politician) => void;
}

const FullFeedView: React.FC<FullFeedViewProps> = ({ feedItems, politicians, onBack, onSelectCandidate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'voto' | 'despesa'>('todos');
  const [sortBy, setSortBy] = useState<'relevance' | 'date_desc' | 'date_asc' | 'type'>('date_desc');

  // Helper de Data: Converte "DD/MM/YYYY" (formato do feed) para Date object
  const parseFeedDate = (dateStr?: string) => {
      if (!dateStr) return new Date();
      if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          return new Date(`${year}-${month}-${day}`);
      }
      return new Date(dateStr);
  };

  const filteredItems = useMemo(() => {
    // 1. Filtragem
    let items = feedItems.filter(item => {
        // Filtro de Tipo
        if (activeFilter !== 'todos' && item.type !== activeFilter) return false;

        // Filtro de Busca (Texto)
        const searchLower = searchTerm.toLowerCase();
        const matchText = item.title.toLowerCase().includes(searchLower) || 
                          (item.description && item.description.toLowerCase().includes(searchLower)) ||
                          (item.tags && item.tags.some(t => t.toLowerCase().includes(searchLower)));
        if (!matchText) return false;

        // Filtro de Data
        const itemDate = parseFeedDate(item.date);
        
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            itemDate.setHours(0,0,0,0);
            if (itemDate < start) return false;
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23,59,59,999);
            itemDate.setHours(0,0,0,0);
            if (itemDate > end) return false;
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
            return parseFeedDate(a.date).getTime() - parseFeedDate(b.date).getTime();
        }

        // Relevância (Apenas se houver busca, senão cai no default date_desc)
        if (sortBy === 'relevance' && searchTerm) {
            const getScore = (item: FeedItem) => {
                const term = searchTerm.toLowerCase();
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
        return parseFeedDate(b.date).getTime() - parseFeedDate(a.date).getTime();
    });

  }, [feedItems, searchTerm, startDate, endDate, activeFilter, sortBy]);

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 font-sans overflow-y-auto pb-24 md:pb-12 animate-in slide-in-from-right duration-300">
        
        {/* HEADER FIXO */}
        <div className="sticky top-0 z-30 glass-surface p-4 shadow-sm">
             <div className="max-w-7xl mx-auto">
                 {/* Linha Superior: Voltar e Título */}
                 <div className="flex items-center gap-4 mb-4">
                     <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors active:scale-95">
                        <ChevronLeft className="text-gray-700 dark:text-white" size={24}/>
                     </button>
                     <div>
                         <h1 className="text-xl font-black text-gray-900 dark:text-white leading-none">Histórico Completo</h1>
                         <p className="text-xs text-gray-500 font-bold uppercase mt-1">{filteredItems.length} registros encontrados</p>
                     </div>
                 </div>

                 {/* Linha de Controles */}
                 <div className="flex flex-col xl:flex-row gap-3">
                     
                     {/* Busca */}
                     <div className="relative flex-1">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                         <input 
                            type="text" 
                            placeholder="Pesquisar por palavras-chave..." 
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if (e.target.value && sortBy === 'date_desc') setSortBy('relevance'); // Auto-switch to relevance on search
                            }}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-900 focus:ring-0 transition-all"
                         />
                         {searchTerm && (
                             <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                 <X size={14}/>
                             </button>
                         )}
                     </div>

                     <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                        {/* Datas */}
                        <div className="flex gap-2 shrink-0">
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14}/></div>
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 uppercase h-full border-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div className="flex items-center text-gray-400 font-bold">-</div>
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><Calendar size={14}/></div>
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 uppercase h-full border-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>

                        {/* Ordenação */}
                        <div className="relative shrink-0">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><ArrowDownUp size={14}/></div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="pl-9 pr-8 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 uppercase h-full appearance-none cursor-pointer border-none focus:ring-2 focus:ring-blue-500/50"
                            >
                                <option value="relevance">Relevância</option>
                                <option value="date_desc">Mais Recentes</option>
                                <option value="date_asc">Mais Antigos</option>
                                <option value="type">Agrupar por Tipo</option>
                            </select>
                        </div>

                        {/* Tabs Tipo */}
                        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
                            {(['todos', 'voto', 'despesa'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setActiveFilter(type)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${activeFilter === type ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                     </div>
                 </div>
             </div>
        </div>

        {/* GRID DE CONTEÚDO */}
        <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map((item, idx) => {
                    const candidate = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
                    const isVote = item.type === 'voto';
                    const isExpense = item.type === 'despesa';

                    return (
                        <div key={idx} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 ${
                                    isVote ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                    isExpense ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {isVote ? <Landmark size={10}/> : isExpense ? <Banknote size={10}/> : <Info size={10}/>}
                                    {item.type}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">{item.date}</span>
                            </div>

                            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-2 line-clamp-3 group-hover:text-blue-600 transition-colors">
                                {item.title}
                            </h3>

                             {isExpense && item.amount && (
                                <div className="mb-2">
                                    <p className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{item.amount}</p>
                                    <p className="text-[10px] text-gray-400 uppercase font-bold truncate">{item.provider}</p>
                                </div>
                            )}

                            {item.description && !isExpense && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-3 mb-4">
                                    {item.description}
                                </p>
                            )}

                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => candidate && onSelectCandidate(candidate)}>
                                    {candidate ? (
                                        <>
                                            <img src={candidate.photo} className="w-6 h-6 rounded-full bg-gray-200 object-cover" alt=""/>
                                            <div className="truncate max-w-[100px]">
                                                <p className="text-[10px] font-bold text-gray-900 dark:text-white truncate">{candidate.name}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-400">Institucional</span>
                                    )}
                                </div>
                                {item.sourceUrl && (
                                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                                        <ExternalLink size={14}/>
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {filteredItems.length === 0 && (
                <div className="text-center py-20 opacity-50">
                    <Filter className="mx-auto h-12 w-12 text-gray-300 mb-4"/>
                    <p className="font-bold text-gray-500">Nenhum item encontrado com esses filtros.</p>
                </div>
            )}
        </div>

    </div>
  );
};

export default FullFeedView;
