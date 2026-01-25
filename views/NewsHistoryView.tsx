
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Search, Tag } from 'lucide-react';
import { getNewsHistory } from '../services/ai';
import { NewsArticle } from '../types';

interface NewsHistoryViewProps {
    onBack: () => void;
}

const NewsHistoryView: React.FC<NewsHistoryViewProps> = ({ onBack }) => {
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            const data = await getNewsHistory();
            setHistory(data);
        };
        load();
    }, []);

    const filtered = history.filter(h => 
        h.title.toLowerCase().includes(search.toLowerCase()) || 
        h.source.toLowerCase().includes(search.toLowerCase())
    );

    const getCategoryColor = (cat?: string) => {
        switch (cat) {
            case 'economia': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'justica': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400';
            case 'social': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    return (
        <div className="w-full h-full bg-gray-50 dark:bg-black font-sans overflow-y-auto pb-32 animate-in slide-in-from-right duration-300">
            
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ChevronLeft className="text-gray-700 dark:text-white" size={24}/>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-gray-900 dark:text-white leading-none flex items-center gap-2">
                            <Newspaper size={20} className="text-blue-600"/> Galeria de Notícias
                        </h1>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Acervo do Mês ({history.length})</p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                
                {/* Search Bar */}
                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                    <input 
                        type="text"
                        placeholder="Buscar no histórico..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Newspaper className="mx-auto h-16 w-16 text-gray-300 mb-4"/>
                        <p className="font-bold text-gray-500">Nenhuma notícia encontrada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((item, index) => (
                            <div key={index} className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl transition-all flex flex-col h-full">
                                
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getCategoryColor(item.category)}`}>
                                        {item.category || 'Política'}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-400">{item.time}</span>
                                </div>

                                <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-3 line-clamp-3 group-hover:text-blue-600 transition-colors">
                                    {item.title}
                                </h3>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-4 flex-1">
                                    {item.summary || "Sem resumo disponível."}
                                </p>
                                
                                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center mt-auto">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[100px]">
                                        {item.source}
                                    </span>
                                    <a 
                                        href={item.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1 hover:underline"
                                    >
                                        Ler <ExternalLink size={12}/>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsHistoryView;
