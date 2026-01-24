import React, { useState, useMemo } from 'react';
import { BookOpen, ArrowRight, Lightbulb, Banknote, ScrollText, History, CheckCircle2 } from 'lucide-react';

interface ArticlesListViewProps {
  onSelectArticle: (id: number) => void;
  onOpenNewsHistory?: () => void;
  articles: any[];
  readArticleIds?: number[];
}

const CATEGORIES = ['Todos', 'Direitos', 'Poderes', 'Orçamento', 'Cidadania'];

const ArticlesListView: React.FC<ArticlesListViewProps> = ({ onSelectArticle, onOpenNewsHistory, articles, readArticleIds = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  // Filter Logic
  const filteredArticles = useMemo(() => {
      if (selectedCategory === 'Todos') return articles;
      return articles.filter(a => {
          // Normalize topic check
          const topic = a.topic || '';
          return topic.includes(selectedCategory) || (a.title && a.title.includes(selectedCategory));
      });
  }, [articles, selectedCategory]);

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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-yellow-100/80 dark:bg-yellow-900/50 backdrop-blur-md rounded-2xl text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                            <BookOpen size={24} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                            Guia Cidadão
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-2xl leading-relaxed">
                        Descomplique a política. Artigos rápidos e acervo histórico.
                    </p>
                </div>

                {onOpenNewsHistory && (
                    <button 
                        onClick={onOpenNewsHistory}
                        className="group flex items-center gap-3 bg-white/60 dark:bg-gray-900/60 border border-white/60 dark:border-white/10 p-4 rounded-[2rem] shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-800 transition-all text-left backdrop-blur-md"
                    >
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full group-hover:scale-110 transition-transform">
                            <History size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Acervo</p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Galeria de Notícias</p>
                        </div>
                        <div className="pl-2">
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors"/>
                        </div>
                    </button>
                )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border backdrop-blur-sm ${
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
                <div className="text-center py-20 opacity-50">
                    <p className="font-bold text-gray-500">Nenhum artigo encontrado nesta categoria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {filteredArticles.map((item, index) => {
                        const isRead = readArticleIds.includes(item.id);
                        return (
                            <button 
                                key={item.id}
                                onClick={() => onSelectArticle(item.id)}
                                className={`group relative text-left h-full outline-none col-span-12 ${getGridSpanClass(index)} transition-transform hover:scale-[1.01] active:scale-[0.99]`}
                            >
                                {/* Background Container with Refined Glassmorphism */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} rounded-[2.5rem] shadow-sm group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-500 overflow-hidden border border-white/20 dark:border-white/5`}>
                                    {/* Texture Overlay */}
                                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                                    {/* Read Overlay (Darkens if read) */}
                                    {isRead && <div className="absolute inset-0 bg-black/30 transition-colors duration-500 backdrop-grayscale-[50%]"></div>}
                                </div>
                                
                                <div className="relative z-10 p-8 flex flex-col h-full text-white">
                                    {/* Icon Header */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 border border-white/30 ${isRead ? 'opacity-80' : ''}`}>
                                            {renderIcon(item.icon, 24, "drop-shadow-sm")}
                                        </div>
                                        <div className="flex gap-2">
                                            {isRead && (
                                                <div className="bg-green-500/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-green-100 border border-green-400/30 flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Lido
                                                </div>
                                            )}
                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/90 border border-white/20">
                                                {item.topic || 'Geral'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <h3 className={`text-2xl font-black mb-3 leading-tight drop-shadow-md transition-colors ${isRead ? 'text-gray-300' : 'text-white'}`}>
                                        {item.title}
                                    </h3>
                                    <p className={`text-sm font-medium leading-relaxed line-clamp-3 mb-6 transition-colors ${isRead ? 'text-gray-400' : 'text-white/90'}`}>
                                        {item.text}
                                    </p>

                                    {/* Footer */}
                                    <div className="mt-auto pt-6 border-t border-white/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/80 group-hover:text-white group-hover:gap-3 transition-all">
                                        {isRead ? 'Ler Novamente' : 'Ler Agora'} <ArrowRight size={14} className="text-white"/>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    </div>
  );
};

export default ArticlesListView;