
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Search, X } from 'lucide-react';
import { getNewsHistory } from '../services/ai';
import { NewsArticle } from '../types';

interface NewsHistoryViewProps {
    onBack: () => void;
}

const NewsHistoryView: React.FC<NewsHistoryViewProps> = ({ onBack }) => {
    const [history, setHistory] = useState<NewsArticle[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        setHistory(getNewsHistory());
    }, []);

    const filtered = history.filter(h => 
        h.title.toLowerCase().includes(search.toLowerCase()) || 
        h.source.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-full h-full bg-transparent font-sans flex flex-col">
            
            {/* Header / Controls Area */}
            <div className="sticky top-0 z-30 pt-4 px-3 md:px-6 pb-2">
                <div className="w-full glass rounded-[3rem] p-4 md:p-6 shadow-lg max-w-[2000px] mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 justify-between">
                    
                    {/* Title & Back */}
                    <div className="flex items-center gap-4 w-full md:w-auto self-start md:self-center">
                        <button 
                            onClick={onBack} 
                            className="p-3 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-white/10 rounded-full transition-all active:scale-95 shadow-sm border border-white/40 dark:border-white/5"
                        >
                            <ChevronLeft className="text-gray-700 dark:text-white" size={24}/>
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none flex items-center gap-2">
                                <Newspaper size={24} className="text-blue-600"/> Galeria de Notícias
                            </h1>
                            <p className="text-xs font-bold text-gray-500 uppercase mt-1 tracking-wider">Histórico do Plantão ({history.length})</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            placeholder="Buscar manchetes, fontes..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full pl-11 pr-10 py-3.5 bg-white/50 dark:bg-black/20 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="p-1 bg-gray-200 dark:bg-white/10 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                                    <X size={14} />
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-safe">
                <div className="max-w-[2000px] mx-auto">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Newspaper className="mx-auto h-16 w-16 text-gray-300 mb-4"/>
                            <p className="font-bold text-gray-500">Nenhuma notícia encontrada.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map((item, index) => (
                                <div key={index} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden shadow-sm border border-white/40 dark:border-white/5 group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 flex flex-col h-full">
                                    <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
                                        {item.imageUrl ? (
                                            <img 
                                                src={item.imageUrl} 
                                                alt={item.title}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1541872703-74c5e4436bb7?q=80&w=800&auto=format&fit=crop";
                                                }}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <Newspaper size={40}/>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                            <span className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shadow-lg border border-white/20">
                                                {item.source}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-4 line-clamp-3 group-hover:text-blue-600 transition-colors">
                                            {item.title}
                                        </h3>
                                        
                                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                                                <Calendar size={12}/> Arquivado
                                            </span>
                                            <a 
                                                href={item.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30 transition-colors"
                                            >
                                                Ler Matéria <ExternalLink size={10}/>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsHistoryView;
