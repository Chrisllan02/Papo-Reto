
import React from 'react';
import { ChevronLeft, Lightbulb, Banknote, ScrollText, ArrowRight, Clock, CheckCircle2, Scale, Target } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const EducationView: React.FC = () => {
  const { selectedEducationId, articles, setSelectedEducationId } = useAppStore();
  const onBack = () => setSelectedEducationId(null);
  const onSelectArticle = (id: number) => setSelectedEducationId(id);

  const item = articles.find(i => i.id === selectedEducationId);
  
  if (!item) return <div className="p-8 text-center text-gray-500 font-bold mt-10">Conteúdo não encontrado ou carregando...</div>;

  // Encontra o próximo item para sugestão
  const nextItemIndex = (articles.findIndex(i => i.id === selectedEducationId) + 1) % articles.length;
  const nextItem = articles[nextItemIndex];

  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  // Helper to calculate reading time based on word count
  const readingTime = Math.max(1, Math.ceil((item.text || "").split(' ').length / 200));

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-black font-sans overflow-y-auto pb-safe animate-in slide-in-from-right duration-500 relative flex flex-col">
        
        {/* HERO SECTION / COVER BAR */}
        <div className={`relative w-full min-h-[35vh] md:min-h-[40vh] shrink-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} overflow-hidden flex flex-col transition-all duration-500`}>
            
            {/* Background Effects */}
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-black opacity-10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

            {/* HEADER NAVIGATION */}
            <div className="relative z-50 p-6 flex justify-between items-center shrink-0">
                 <button 
                    onClick={onBack} 
                    className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20 group"
                 >
                    <ChevronLeft size={26} className="group-hover:-translate-x-1 transition-transform"/>
                </button>
            </div>

            {/* TITLE CARD CONTENT (INSIDE COVER) */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 pb-16 pt-2 relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-[1.5rem] flex items-center justify-center mb-4 shadow-[0_10px_20px_rgba(0,0,0,0.2)] border border-white/30 relative">
                     <div className="absolute inset-0 bg-white/20 blur-md rounded-[1.5rem]"></div>
                     {renderIcon(item.icon, 28, "text-white relative z-10 drop-shadow-md md:scale-110")}
                </div>
                
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-white/90 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 border border-white/10 shadow-sm">
                    <Clock size={12} /> Leitura: {readingTime} min
                </div>
                
                <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-xl max-w-4xl px-2">
                    {item.title}
                </h1>
            </div>
        </div>

        {/* CONTENT SHEET */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 relative z-20 -mt-10 rounded-t-[2.5rem] px-6 md:px-12 pt-10 pb-12 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] min-h-[60vh] border-t border-gray-100 dark:border-gray-800 transition-all duration-500">
            
            {/* Decorative Pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200/80 dark:bg-gray-700/80 rounded-full"></div>

            {/* Main Content Area - Grid Layout for Desktop Horizontal Space */}
            <div className="max-w-7xl mx-auto">
                
                <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 lg:gap-16 items-start">
                    
                    {/* LEFT COLUMN: Main Text */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-3">
                                <span className="w-8 h-0.5 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                                Entenda o Assunto
                            </h2>
                            <p className="text-lg md:text-xl lg:text-2xl text-gray-800 dark:text-gray-200 font-medium leading-relaxed whitespace-pre-line text-left selection:bg-yellow-200 dark:selection:bg-yellow-900 selection:text-black dark:selection:text-white">
                                {item.text}
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Info Cards (Stacked on Mobile, Side on Desktop) */}
                    <div className="flex flex-col gap-5 lg:sticky lg:top-8">
                        {/* Legislation Section */}
                        {item.legislation ? (
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                                <h3 className="font-black text-purple-900 dark:text-purple-300 text-base mb-3 flex items-center gap-2">
                                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-xl"><Scale className="text-purple-600 dark:text-purple-400" size={18}/></div>
                                    Na Lei
                                </h3>
                                <p className="text-sm text-purple-900/80 dark:text-purple-200/80 font-bold leading-relaxed italic">
                                    "{item.legislation}"
                                </p>
                            </div>
                        ) : (
                            <div className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-200 dark:border-gray-700">
                                <h3 className="font-black text-gray-500 text-base mb-3 flex items-center gap-2">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl"><Scale className="text-gray-400" size={18}/></div> Base Legal
                                </h3>
                                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                    Baseado na Constituição Federal de 1988 e Regimentos Internos.
                                </p>
                            </div>
                        )}

                        {/* Impact Section */}
                        {item.impact ? (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                                <h3 className="font-black text-blue-900 dark:text-blue-300 text-base mb-3 flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl"><Target className="text-blue-600 dark:text-blue-400" size={18}/></div>
                                    Impacto Cidadão
                                </h3>
                                <p className="text-sm text-blue-900/80 dark:text-blue-200/80 font-medium leading-relaxed">
                                    {item.impact}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
                                <h3 className="font-black text-blue-900 dark:text-blue-300 text-base mb-3 flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl"><CheckCircle2 className="text-blue-600 dark:text-blue-400" size={18}/></div>
                                    Por que importa?
                                </h3>
                                <p className="text-sm text-blue-900/80 dark:text-blue-200/80 font-medium leading-tight">
                                    Afeta diretamente como seu dinheiro é usado e as leis do país.
                                </p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Next Suggestion - Full Width Bottom */}
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 relative z-30">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 pl-2">Continue Aprendendo</p>
                    <button 
                        onClick={() => onSelectArticle(nextItem.id)}
                        className={`w-full group bg-gradient-to-r ${nextItem.colorFrom} ${nextItem.colorTo} p-1 rounded-[2.5rem] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer text-left shadow-lg relative z-30`}
                    >
                        <div className="bg-white/95 dark:bg-gray-900 rounded-[2.3rem] p-5 md:p-6 flex items-center justify-between backdrop-blur-sm">
                            <div className="flex items-center gap-5 min-w-0">
                                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 ${nextItem.colorFrom.replace('from-', 'text-')} shadow-sm group-hover:scale-110 transition-transform`}>
                                    {renderIcon(nextItem.icon, 22, "opacity-90")}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Próximo</p>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-base md:text-lg line-clamp-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{nextItem.title}</h4>
                                </div>
                            </div>
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all shrink-0 ml-4 border border-gray-100 dark:border-gray-700">
                                <ArrowRight size={20} className="md:w-[22px] md:h-[22px]"/>
                            </div>
                        </div>
                    </button>
                </div>

                {/* CRITICAL SPACER FOR MOBILE NAVIGATION */}
                <div className="h-[200px] md:h-0 w-full shrink-0"></div>

            </div>
        </div>
    </div>
  );
};

export default EducationView;
