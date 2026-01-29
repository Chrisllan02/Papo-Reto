
import React, { useMemo } from 'react';
import { ArrowRight, ChevronLeft, BookOpen, Scale, AlertCircle, CheckCircle2, Lightbulb, Banknote, ScrollText } from 'lucide-react';

interface EducationViewProps {
  educationId: number;
  articles: any[];
  onBack: () => void;
  onSelectArticle: (id: number) => void;
}

const EducationView: React.FC<EducationViewProps> = ({ educationId, articles, onBack, onSelectArticle }) => {
  const article = useMemo(() => articles.find(a => a.id === educationId), [articles, educationId]);
  const nextItem = useMemo(() => {
      const currentIndex = articles.findIndex(a => a.id === educationId);
      return articles[(currentIndex + 1) % articles.length];
  }, [articles, educationId]);

  if (!article) return null;

  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 font-sans overflow-y-auto animate-in slide-in-from-right duration-300">
        
        <div className="px-4 md:px-8 pt-4 md:pt-6">
            {/* Hero Header */}
            <div className={`relative min-h-[300px] rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl p-6 md:p-12 flex flex-col justify-between bg-gradient-to-br ${article.colorFrom} ${article.colorTo}`}>
                {/* Texture */}
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                
                {/* Nav */}
                <div className="relative z-10 flex justify-between items-start">
                    <button 
                        onClick={onBack}
                        className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-colors"
                    >
                        <ChevronLeft size={24}/>
                    </button>
                    <div className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-black uppercase tracking-widest border border-white/20">
                        {article.topic}
                    </div>
                </div>

                {/* Title */}
                <div className="relative z-10 mt-8">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-6 border border-white/30 shadow-lg">
                        {renderIcon(article.icon, 32, "drop-shadow-md")}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white leading-tight drop-shadow-md mb-2">
                        {article.title}
                    </h1>
                </div>
            </div>
        </div>

        {/* Content Body */}
        <div className="px-4 md:px-12 py-10 max-w-4xl mx-auto -mt-12 relative z-20">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-gray-100 dark:border-gray-800">
                
                <div className="prose dark:prose-invert prose-lg max-w-none mb-10">
                    <p className="text-gray-700 dark:text-gray-300 font-medium leading-loose text-lg md:text-xl">
                        {article.text}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {article.legislation && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400 font-black uppercase text-xs tracking-widest">
                                <Scale size={16}/> Legislação
                            </div>
                            <p className="text-blue-900 dark:text-blue-200 font-bold text-sm leading-relaxed">
                                {article.legislation}
                            </p>
                        </div>
                    )}
                    
                    {article.impact && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/30">
                            <div className="flex items-center gap-2 mb-3 text-orange-600 dark:text-orange-400 font-black uppercase text-xs tracking-widest">
                                <AlertCircle size={16}/> Impacto na sua vida
                            </div>
                            <p className="text-orange-900 dark:text-orange-200 font-bold text-sm leading-relaxed">
                                {article.impact}
                            </p>
                        </div>
                    )}
                </div>

                {/* Next Suggestion - INCREASED PADDING BOTTOM FOR MOBILE */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 pb-48 md:pb-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Continue Aprendendo</p>
                    <button 
                        type="button"
                        onClick={() => onSelectArticle(nextItem.id)}
                        className={`w-full group bg-gradient-to-r ${nextItem.colorFrom} ${nextItem.colorTo} p-1 rounded-[2.5rem] active:scale-[0.98] transition-transform cursor-pointer shadow-sm text-left`}
                    >
                        <div className="bg-white/90 dark:bg-gray-900 rounded-[2.3rem] p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${nextItem.colorFrom.replace('from-', 'text-')}`}>
                                    {renderIcon(nextItem.icon, 20, "opacity-80")}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Próximo</p>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg line-clamp-1">{nextItem.title}</h4>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                                <ArrowRight size={18}/>
                            </div>
                        </div>
                    </button>
                </div>

            </div>
        </div>
    </div>
  );
};

export default EducationView;
    