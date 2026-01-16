
import React, { useEffect, useState } from 'react';
import { X, Lightbulb, Banknote, ScrollText, ArrowRight, ArrowLeft, Share2, Clock, CheckCircle2, Bookmark, Megaphone, Globe } from 'lucide-react';

interface EducationModalProps {
  items: any[];
  selectedId: number;
  onClose: () => void;
  onSelect: (id: number) => void;
}

const EducationModal: React.FC<EducationModalProps> = ({ items, selectedId, onClose, onSelect }) => {
  const currentIndex = items.findIndex(i => i.id === selectedId);
  const item = items[currentIndex];
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
      // Animação de entrada
      requestAnimationFrame(() => setIsVisible(true));
  }, []);

  const handleClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Espera animação de saída
  };

  const handleNext = () => {
      const nextIndex = (currentIndex + 1) % items.length;
      onSelect(items[nextIndex].id);
  };

  const handlePrev = () => {
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      onSelect(items[prevIndex].id);
  };

  if (!item) return null;

  // Helper para renderizar o ícone correto
  const renderIcon = (iconName: string, size: number, className: string) => {
      const icons: any = { Banknote, ScrollText, Megaphone, Globe, Lightbulb };
      const IconComp = icons[iconName] || Lightbulb;
      return <IconComp size={size} className={className}/>;
  };

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none pointer-events-none'}`} onClick={handleClose}>
        
        {/* CARD CONTAINER */}
        <div 
            className={`bg-white dark:bg-[#0f1115] w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300 transform ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'}`} 
            onClick={e => e.stopPropagation()}
        >
            
            {/* HERO HEADER */}
            <div className={`relative h-48 md:h-64 shrink-0 bg-gradient-to-br ${item.colorFrom} ${item.colorTo} p-6 flex flex-col justify-end`}>
                
                {/* Background FX */}
                <div className="absolute top-0 right-0 p-8 opacity-20 transform rotate-12 scale-150 pointer-events-none">
                    {renderIcon(item.icon, 140, "text-white")}
                </div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay pointer-events-none"></div>

                {/* Top Controls */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
                    <div className="bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-white/90 text-[10px] font-black uppercase tracking-widest border border-white/10">
                        Guia Cidadão
                    </div>
                    <button onClick={handleClose} className="w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors border border-white/10">
                        <X size={20}/>
                    </button>
                </div>

                {/* Title */}
                <div className="relative z-10">
                    <h2 className="text-3xl md:text-4xl font-black text-white leading-[0.95] tracking-tight drop-shadow-md mb-2">
                        {item.title}
                    </h2>
                    <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
                        <Clock size={12}/> Leitura rápida • Gerado por IA
                    </div>
                </div>
            </div>

            {/* CONTENT BODY */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* Main Text */}
                <div className="prose dark:prose-invert prose-lg max-w-none">
                    <p className="text-lg text-gray-700 dark:text-gray-300 font-medium leading-relaxed whitespace-pre-line">
                        {item.text}
                    </p>
                </div>

                {/* Key Takeaways (Simulado para estrutura) */}
                <div className="mt-8 bg-gray-50 dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/5">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <CheckCircle2 size={16} className="text-green-500"/> Resumo Prático
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                            Isso impacta diretamente o orçamento público e serviços.
                        </li>
                        <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 shrink-0"></div>
                            Fique atento às próximas votações sobre este tema no Feed.
                        </li>
                    </ul>
                </div>

            </div>

            {/* FOOTER NAVIGATION */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#0f1115]/50 flex justify-between items-center shrink-0">
                <button 
                    onClick={handlePrev}
                    className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors px-4 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10"
                >
                    <ArrowLeft size={16}/> Anterior
                </button>

                <div className="flex gap-1">
                    {items.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                    ))}
                </div>

                <button 
                    onClick={handleNext}
                    className="flex items-center gap-2 text-xs font-bold text-white bg-black dark:bg-white dark:text-black px-6 py-3 rounded-xl hover:opacity-80 transition-opacity shadow-lg"
                >
                    Próximo <ArrowRight size={16}/>
                </button>
            </div>

        </div>
    </div>
  );
};

export default EducationModal;
