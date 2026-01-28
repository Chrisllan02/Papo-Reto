
import React, { useEffect, useState } from 'react';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Search } from 'lucide-react';
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
        <div className="w-full h-full bg-gray-50 dark:bg-gray-900 font-sans overflow-y-auto pb-32 animate-in slide-in-from-right duration-300">
            
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
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Histórico do Plantão ({history.length})</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((item, index) => (
                            <div key={index} className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 group hover:shadow-xl transition-all">
                                <div className="relative h-48 overflow-hidden bg-gray-200 dark:bg-gray-800">
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                        <span className="bg-blue-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg shadow-sm">
                                            {item.source}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-3 line-clamp-3 group-hover:text-blue-600 transition-colors">
                                        {item.title}
                                    </h3>
                                    
                                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                            <Calendar size={12}/> Arquivado
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
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsHistoryView;
