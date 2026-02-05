import React, { useState, useMemo } from 'react';
import { BookOpen, ArrowRight, Lightbulb, Banknote, ScrollText, History, CheckCircle2, Search, X, ChevronDown } from 'lucide-react';
import { EducationalArticle } from '../types';

interface ArticlesListViewProps {
  onSelectArticle: (id: number) => void;
  onOpenNewsHistory?: () => void;
  articles: EducationalArticle[];
  readArticleIds?: number[];
}

const PAGE_SIZE = 12;

const ArticlesListView: React.FC<ArticlesListViewProps> = ({ onSelectArticle, onOpenNewsHistory, articles, readArticleIds = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Geração Dinâmica de Categorias
  const categories = useMemo(() => {
      const topics = new Set<string>();
      topics.add('Todos');
      articles.forEach(article => {
          if (article.topic) {
              topics.add(article.topic);
          }
      });
      return Array.from(topics);
  }, [articles]);

  // Lógica de Filtro Atualizada (Categoria + Busca)
  const filteredArticles = useMemo(() => {
      const term = search.toLowerCase().trim();
      
      return articles.filter(a => {
          // 1. Filtro de Categoria
          const topic = a.topic || '';
          const matchesCategory = selectedCategory === 'Todos' || topic === selectedCategory || topic.includes(selectedCategory);

          // 2. Filtro de Texto
          if (!matchesCategory) return false;
          if (!term) return true;

          return (
              a.title.toLowerCase().includes(term) ||
              a.text.toLowerCase().includes(term) ||
              topic.toLowerCase().includes(term)
          );
      });
  }, [articles, selectedCategory, search]);

  const displayedArticles = useMemo(() => {
      return filteredArticles.slice(0, visibleCount);
  }, [filteredArticles, visibleCount]);

  const handleLoadMore = () => {
      setVisibleCount(prev => prev + PAGE_SIZE);
  };

  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  // Helper para classes de grid assimétrico
  const getGridSpanClass = (index: number) => {
      const pattern = index % 7;
      switch (pattern) {
          case 0: return "md:col-span-4"; // 33%
          case 1: return "md:col-span-8"; // 66%
          case 2: return "md:col-span-8"; // 66%
          case 3: return "md:col-span-4"; // 33%
          case 4: return "md:col-span-3"; // 25%
          case 5: return "md:col-span-3"; // 25%
          case 6: return "md:col-span-6"; // 50%
          default: return "md:col-span-4";
      }
  };

  return (
    <div className="w-full h-full bg-transparent font-sans overflow-y-auto pb-32 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="pt-8 px-6 md:px-12 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400">
                            Guia Cidadão
                        </span>
                    </h1>
                    <p className="text-lg font-medium text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                        Descomplique a política. Artigos rápidos e acervo histórico.
                    </p>
                </div>

                {onOpenNewsHistory && (
                    <button 
                        onClick={onOpenNewsHistory}
                        className="group flex items-center gap-3 bg-white/60 dark:bg-gray-900/60 border border-white/60 dark:border-white/10 p-3 md:p-4 rounded-[2rem] shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all text-left backdrop-blur-md"
                    >
                        <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                            <History size={20} />
                        </div>
                        <div className="hidden md:block">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Acervo</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Galeria de Notícias</p>
                        </div>
                        <div className="pl-2 hidden md:block">
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors"/>
                        </div>
                        <span className="md:hidden font-bold text-gray-900 dark:text-white text-sm pr-2">Histórico</span>
                    </button>
                )}
            </div>

            {/* Search Bar */}
            <div className="relative w-full max-w-md mb-6 group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por tema, título..."
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

            {/* Category Filter Dinâmico */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border backdrop-blur-sm whitespace-nowrap ${
                            selectedCategory === cat 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' 
                            : 'bg-white/40 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 border-white/60 dark:border-white/10 hover:bg-white/70 dark:hover:bg-gray-700/60'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid de Artigos */}
        <div className="px-4 md:px-12 max-w-[2000px] mx-auto">
            {filteredArticles.length === 0 ? (
                <div className="text-center py-20 opacity-50 flex flex-col items-center">
                    <Search size={48} className="text-gray-300 mb-4" />
                    <p className="font-bold text-gray-500">Nenhum artigo encontrado.</p>
                    <p className="text-xs text-gray-400 mt-2">Tente outro termo ou categoria.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {displayedArticles.map((item, index) => {
                            const isRead = readArticleIds.includes(item.id);
                            return (
                                <button 
                                    key={item.id}
                                    onClick={() => onSelectArticle(item.id)}
                                    className={`group relative text-left h-full min-h-[320px] outline-none col-span-12 ${getGridSpanClass(index)} transition-transform hover:scale-[1.01] active:scale-[0.99]`}
                                >
                                    {/* Background Container with Refined Glassmorphism */}
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} rounded-[2.5rem] shadow-sm group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden border border-white/20 dark:border-white/5`}>
                                        {/* Texture Overlay */}
                                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                    </div>
                                    
                                    <div className="relative z-10 p-8 flex flex-col h-full text-white">
                                        {/* Icon Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/30 ${isRead ? 'opacity-60' : ''}`}>
                                                {renderIcon(item.icon, 24, "drop-shadow-sm")}
                                            </div>
                                            <div className="flex gap-2">
                                                {isRead && (
                                                    <div className="bg-green-500/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-green-100 border border-green-400/30 flex items-center gap-1 shadow-sm">
                                                        <CheckCircle2 size={10} /> Lido
                                                    </div>
                                                )}
                                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/90 border border-white/20">
                                                    {item.topic || 'Geral'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <h3 className={`text-2xl font-black mb-3 leading-tight drop-shadow-md transition-colors text-white`}>
                                            {item.title}
                                        </h3>
                                        <p className={`text-sm font-medium leading-relaxed line-clamp-3 mb-6 transition-colors text-white/90 drop-shadow-md`}>
                                            {item.text}
                                        </p>

                                        {/* Footer */}
                                        <div className="mt-auto pt-6 border-t border-white/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80 group-hover:text-white group-hover:gap-3 transition-all drop-shadow-md">
                                            {isRead ? 'Ler Novamente' : 'Ler Agora'} <ArrowRight size={14} className="text-white"/>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    
                    {/* Load More Button (Pagination) */}
                    {visibleCount < filteredArticles.length && (
                        <div className="flex justify-center mt-10">
                            <button 
                                onClick={handleLoadMore}
                                className="flex items-center gap-2 px-8 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-blue-100 dark:border-blue-900/30"
                            >
                                <ChevronDown size={16} /> Carregar Mais Artigos
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    </div>
  );
};

export default ArticlesListView;