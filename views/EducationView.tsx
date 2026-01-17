import React from 'react';
import { ChevronLeft, Lightbulb, Banknote, ScrollText, ArrowRight, Share2, Clock, CheckCircle2, Bookmark } from 'lucide-react';
import { EDUCATION_CAROUSEL } from '../constants';

interface EducationViewProps {
  educationId: number;
  onBack: () => void;
}

const EducationView: React.FC<EducationViewProps> = ({ educationId, onBack }) => {
  const item = EDUCATION_CAROUSEL.find(i => i.id === educationId);
  
  if (!item) return <div>Conteúdo não encontrado</div>;

  // Encontra o próximo item para sugestão
  const nextItemIndex = (EDUCATION_CAROUSEL.findIndex(i => i.id === educationId) + 1) % EDUCATION_CAROUSEL.length;
  const nextItem = EDUCATION_CAROUSEL[nextItemIndex];

  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      switch(iconName) {
          case 'Banknote': return <Banknote size={size} className={className}/>;
          case 'ScrollText': return <ScrollText size={size} className={className}/>;
          default: return <Lightbulb size={size} className={className}/>;
      }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-black font-sans overflow-y-auto pb-safe animate-in slide-in-from-right duration-500 relative">
        
        {/* HERO SECTION BACKGROUND */}
        <div className={`fixed top-0 left-0 right-0 h-[45vh] bg-gradient-to-br ${item.colorFrom} ${item.colorTo} z-0`}>
            {/* Abstract Shapes */}
            <div className="absolute top-10 right-10 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px] animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-black opacity-10 rounded-full blur-[60px]"></div>
            
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        </div>

        {/* HEADER NAVIGATION */}
        <div className="fixed top-0 left-0 right-0 z-50 p-4 flex justify-between items-center">
             <button 
                onClick={onBack} 
                className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20 group"
             >
                <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform"/>
            </button>
            
            <div className="flex gap-2">
                <button className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20">
                    <Bookmark size={20}/>
                </button>
                <button className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90 shadow-lg border border-white/20">
                    <Share2 size={20}/>
                </button>
            </div>
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div className="relative z-10 pt-[15vh] px-4 md:px-8 pb-32 max-w-4xl mx-auto">
            
            {/* TITLE CARD */}
            <div className="flex flex-col items-center text-center mb-8">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)] border border-white/30 relative">
                     <div className="absolute inset-0 bg-white/20 blur-xl rounded-[2rem]"></div>
                     {renderIcon(item.icon, 48, "text-white relative z-10 drop-shadow-md")}
                </div>
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-white/90 text-xs font-black uppercase tracking-widest mb-4 border border-white/10">
                    <Clock size={12} /> Leitura: 1 min
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white leading-[0.9] tracking-tighter drop-shadow-lg mb-2">
                    {item.title}
                </h1>
            </div>

            {/* CONTENT SHEET */}
            <div className="bg-white dark:bg-[#09090b] rounded-[3rem] p-8 md:p-12 shadow-[0_-20px_60px_rgba(0,0,0,0.2)] min-h-[60vh] relative border border-gray-100 dark:border-gray-800">
                
                {/* Decorative Pill */}
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-8 opacity-50"></div>

                {/* Main Text */}
                <div className="space-y-10">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                            <span className="w-8 h-px bg-gray-300 dark:bg-gray-700"></span>
                            O Que É Isso?
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
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
                                <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0 mt-0.5">1</div>
                                <p className="text-sm text-blue-900/80 dark:text-blue-200/80 font-medium leading-tight">
                                    Isso afeta diretamente como seu dinheiro é usado pelo governo.
                                </p>
                            </li>
                            <li className="flex gap-4 items-start">
                                <div className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs shrink-0 mt-0.5">2</div>
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
                            onClick={() => {
                                // Simple trick to reload component with new ID without full remount issues if handled by parent
                                window.location.hash = `educacao/${nextItem.id}`;
                            }}
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
    </div>
  );
};

export default EducationView;