
import React from 'react';
import { ChevronLeft, Lightbulb, Banknote, ScrollText, ArrowRight, Share2, Clock, CheckCircle2, Bookmark } from 'lucide-react';

interface EducationViewProps {
  educationId: number;
  articles: any[];
  onBack: () => void;
  onSelectArticle: (id: number) => void;
}

const EducationView: React.FC<EducationViewProps> = ({ educationId, articles, onBack, onSelectArticle }) => {
  const item = articles.find(i => i.id === educationId);
  
  if (!item) return <div className="p-8 text-center text-gray-500">Conteúdo não encontrado</div>;

  // Encontra o próximo item para sugestão
  const nextItemIndex = (articles.findIndex(i => i.id === educationId) + 1) % articles.length;
  const nextItem = articles[nextItemIndex];

  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-black font-sans overflow-y-auto pb-safe animate-in slide-in-from-right duration-500 relative flex flex-col">
        
        {/* HERO SECTION / COVER BAR */}
        <div className={`relative w-full min-h-[35vh] shrink-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} overflow-hidden flex flex-col`}>
            
            {/* Background Effects */}
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-black opacity-10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

            {/* HEADER NAVIGATION */}
            <div className="relative z-50 p-4 flex justify-between items-center shrink-0">
                 <button 
                    onClick={onBack} 
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20 group"
                 >
                    <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform"/>
                </button>
                
                <div className="flex gap-2">
                    <button className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20">
                        <Bookmark size={20}/>
                    </button>
                    <button className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20">
                        <Share2 size={20}/>
                    </button>
                </div>
            </div>

            {/* TITLE CARD CONTENT (INSIDE COVER) */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-10 pt-2 relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-4 shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/30 relative">
                     <div className="absolute inset-0 bg-white/20 blur-md rounded-[1.5rem]"></div>
                     {renderIcon(item.icon, 32, "text-white relative z-10 drop-shadow-md")}
                </div>
                
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-white/90 text-[10px] font-black uppercase tracking-widest mb-3 border border-white/10">
                    <Clock size={10} /> Leitura: 1 min
                </div>
                
                <h1 className="text-2xl md:text-4xl font-black text-white leading-tight tracking-tight drop-shadow-lg max-w-3xl">
                    {item.title}
                </h1>
            </div>
        </div>

        {/* CONTENT SHEET */}
        <div className="flex-1 bg-white dark:bg-gray-900 relative z-20 -mt-8 rounded-t-[2.5rem] px-6 md:px-12 pt-10 pb-32 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] min-h-[50vh] border-t border-gray-100 dark:border-gray-800">
            
            {/* Decorative Pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full opacity-60"></div>

            {/* Main Text */}
            <div className="max-w-4xl mx-auto space-y-10">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <span className="w-6 h-px bg-gray-300 dark:bg-gray-700"></span>
                        O Que É Isso?
                    </h2>
                    <p className="text-lg md:text-2xl text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                        {item.text}
                    </p>
                </div>

                {/* Breakdown Section (Simulated based on context) */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                    <h3 className="font-black text-blue-900 dark:text-blue-300 text-lg mb-4 flex items-center gap-2">
                        <CheckCircle2 className="text-blue-600 dark:text-blue-400"/>
                        Por que se importar?
                    </h3>
                    <ul className="space-y-4">
                        <li className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0 mt-0.5">1</div>
                            <p className="text-sm text-blue-900/80 dark:text-blue-200/80 font-medium leading-tight">
                                Isso afeta diretamente como seu dinheiro é usado pelo governo.
                            </p>
                        </li>
                        <li className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0 mt-0.5">2</div>
                            <p className="text-sm text-blue-900/80 dark:text-blue-200/80 font-medium leading-tight">
                                Entender este conceito evita que você seja enganado por fake news.
                            </p>
                        </li>
                    </ul>
                </div>

                {/* Next Suggestion */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Continue Aprendendo</p>
                    <button 
                        onClick={() => onSelectArticle(nextItem.id)}
                        className={`w-full group bg-gradient-to-r ${nextItem.colorFrom} ${nextItem.colorTo} p-1 rounded-[2.5rem] hover:scale-[1.02] transition-transform cursor-pointer`}
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-[2.3rem] p-5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${nextItem.colorFrom.replace('from-', 'text-')}`}>
                                    {renderIcon(nextItem.icon, 20, "opacity-80")}
                                </div>
                                <div className="text-left">
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
