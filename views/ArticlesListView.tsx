
import React from 'react';
import { BookOpen, ArrowRight, Lightbulb, Banknote, ScrollText, Megaphone, Globe } from 'lucide-react';

interface ArticlesListViewProps {
  educationItems: any[]; // Dados dinâmicos
  onSelectArticle: (id: number) => void;
}

const ArticlesListView: React.FC<ArticlesListViewProps> = ({ educationItems, onSelectArticle }) => {
  
  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      const icons: any = { Banknote, ScrollText, Megaphone, Globe, Lightbulb };
      const IconComp = icons[iconName] || Lightbulb;
      return <IconComp size={size} className={className}/>;
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
                Descomplique a política. Artigos gerados automaticamente para você entender o que está acontecendo em Brasília agora.
            </p>
        </div>

        {/* Grid de Artigos */}
        <div className="px-4 md:px-12 max-w-[2000px] mx-auto">
            {educationItems.length === 0 ? (
                <div className="text-center py-20 opacity-50">
                    <p className="font-bold text-gray-500">Carregando temas atuais...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {educationItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => onSelectArticle(item.id)}
                            className="group relative text-left h-full outline-none"
                        >
                            <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm group-hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1"></div>
                            
                            <div className="relative z-10 p-8 flex flex-col h-full">
                                {/* Icon Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.colorFrom} ${item.colorTo} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {renderIcon(item.icon, 24, "")}
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                        Artigo {item.id}
                                    </div>
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {item.title}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed line-clamp-3 mb-6">
                                    {item.text}
                                </p>

                                {/* Footer */}
                                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white group-hover:gap-3 transition-all">
                                    Ler Agora <ArrowRight size={14} className="text-blue-500"/>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default ArticlesListView;
