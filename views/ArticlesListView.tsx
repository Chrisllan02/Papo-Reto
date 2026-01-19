
import React from 'react';
import { BookOpen, ArrowRight, Lightbulb, Banknote, ScrollText } from 'lucide-react';

interface ArticlesListViewProps {
  onSelectArticle: (id: number) => void;
  articles: any[];
}

const ArticlesListView: React.FC<ArticlesListViewProps> = ({ onSelectArticle, articles }) => {
  
  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  // Helper para classes de grid assimétrico
  // Padrão inspirado no Mantine:
  // Row 1: 4 + 8 = 12
  // Row 2: 8 + 4 = 12
  // Row 3: 3 + 3 + 6 = 12
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
    <div className="w-full h-full bg-[#F5F7FA] dark:bg-black font-sans overflow-y-auto pb-32 animate-in fade-in duration-500">
        
        {/* Header */}
        <div className="pt-8 px-6 md:px-12 mb-8">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl text-yellow-600">
                    <BookOpen size={24} />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                    Guia Cidadão
                </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-2xl leading-relaxed">
                Descomplique a política. Artigos rápidos gerados por IA para entender como Brasília funciona e como isso afeta o seu bolso.
            </p>
        </div>

        {/* Grid de Artigos Assimétrico */}
        <div className="px-4 md:px-12 max-w-[2000px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {articles.map((item, index) => (
                    <button 
                        key={item.id}
                        onClick={() => onSelectArticle(item.id)}
                        className={`group relative text-left h-full outline-none col-span-12 ${getGridSpanClass(index)}`}
                    >
                        {/* Background Container with Full Color */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} rounded-[2.5rem] shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 overflow-hidden`}>
                             {/* Decorative Shine Effect on Hover */}
                             <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300"></div>
                        </div>
                        
                        <div className="relative z-10 p-8 flex flex-col h-full text-white">
                            {/* Icon Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform duration-300 border border-white/20`}>
                                    {renderIcon(item.icon, 24, "drop-shadow-md")}
                                </div>
                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white/90 border border-white/10">
                                    Dica #{item.id}
                                </div>
                            </div>

                            {/* Content */}
                            <h3 className="text-2xl font-black text-white mb-3 leading-tight drop-shadow-md">
                                {item.title}
                            </h3>
                            <p className="text-white/90 text-sm font-medium leading-relaxed line-clamp-3 mb-6">
                                {item.text}
                            </p>

                            {/* Footer */}
                            <div className="mt-auto pt-6 border-t border-white/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/90 group-hover:gap-3 transition-all">
                                Ler Agora <ArrowRight size={14} className="text-white"/>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default ArticlesListView;
