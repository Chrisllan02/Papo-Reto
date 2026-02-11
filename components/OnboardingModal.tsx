
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { ChevronRight, X, Sparkles, ScrollText, BrainCircuit, Check, ChevronLeft } from 'lucide-react';

interface OnboardingModalProps {
  onFinish: () => void;
}

interface TourStep {
  id: string;
  targetId: string | null;
  title: string;
  desc: string;
  icon?: any;
  color?: string;
}

const STEPS: TourStep[] = [
  {
    id: 'feed',
    targetId: 'feed',
    title: 'Mural de Fiscalização',
    desc: 'Acompanhe votos e gastos em tempo real. Cada centavo e cada decisão, direto da fonte oficial.',
    color: 'text-green-600'
  },
  {
    id: 'explore',
    targetId: 'explore',
    title: 'Raio-X Completo',
    desc: 'Pesquise qualquer parlamentar e veja histórico, processos e desempenho.',
    color: 'text-orange-500'
  },
  {
    id: 'finish',
    targetId: null,
    title: 'Você está no comando',
    desc: 'A informação é sua melhor arma. Explore, fiscalize e compartilhe.',
    icon: Check,
    color: 'text-green-600'
  }
];

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onFinish }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  const step = STEPS[currentStepIndex];
  const isLast = currentStepIndex === STEPS.length - 1;

  useLayoutEffect(() => {
    const updateTarget = () => {
        if (!step.targetId) {
            setTargetRect(null);
            return;
        }

        // Tenta encontrar o elemento pelo atributo data-tour
        const elements = document.querySelectorAll(`[data-tour="${step.targetId}"]`);
        let foundRect: DOMRect | null = null;

        // Procura o primeiro elemento visível
        for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                foundRect = rect;
                break;
            }
        }
        setTargetRect(foundRect);
    };

    updateTarget();
    window.addEventListener('resize', updateTarget);
    return () => window.removeEventListener('resize', updateTarget);
  }, [step.targetId, currentStepIndex]);

  const handleNext = () => {
    if (isLast) {
      onFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
      if (currentStepIndex > 0) {
          setCurrentStepIndex(prev => prev - 1);
      }
  };

  const handleSkip = () => {
      onFinish();
  };

  // Renderização do Modal Central (Fallback ou Passos Iniciais/Finais)
  if (!targetRect) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 text-center relative overflow-hidden">
                
                {/* Botão de Fechar no topo */}
                <button 
                    onClick={handleSkip}
                    className="absolute top-5 right-5 p-2 text-subtle hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors z-20"
                    title="Fechar Tour"
                >
                    <X size={20} />
                </button>

                {step.icon && (
                    <div className="mb-6 flex justify-center">
                        <div className={`p-4 rounded-full bg-gray-50 dark:bg-gray-800 ${step.color}`}>
                            <step.icon size={48} />
                        </div>
                    </div>
                )}
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">{step.title}</h2>
                <p className="text-muted font-medium mb-8 leading-relaxed">{step.desc}</p>
                
                <div className="flex gap-3">
                    {currentStepIndex > 0 && (
                        <button onClick={handlePrev} className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800 text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <ChevronLeft size={20}/>
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
                    >
                        {isLast ? "Começar" : "Continuar"} <ChevronRight size={18}/>
                    </button>
                </div>

                {/* Link Pular explícito na primeira tela */}
                {currentStepIndex === 0 && (
                    <button 
                        onClick={handleSkip}
                        className="mt-4 text-xs font-bold text-subtle hover:text-gray-600 dark:hover:text-white transition-colors uppercase tracking-wider"
                    >
                        Pular Introdução
                    </button>
                )}
            </div>
        </div>
      );
  }

  // Renderização do Spotlight (Tour Guiada)
  const isMobile = window.innerWidth < 768;

  let tooltipStyle: React.CSSProperties = {};
  
  if (isMobile) {
      // Mobile: Tooltip sempre acima do alvo (que é a navbar inferior)
      tooltipStyle = {
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: window.innerHeight - targetRect.top + 20,
          width: '90%',
          maxWidth: '350px'
      };
  } else {
      // Desktop: Sidebar na esquerda
      tooltipStyle = {
          position: 'fixed',
          left: targetRect.right + 24,
          top: targetRect.top + (targetRect.height / 2),
          transform: 'translateY(-50%)',
          width: '320px'
      };
  }

  return (
    <div className="fixed inset-0 z-[100] animate-in fade-in duration-300">
        
        {/* Spotlight Overlay: Usando box-shadow massivo para criar o "buraco" */}
        <div 
            className="absolute transition-all duration-300 ease-out rounded-xl pointer-events-none"
            style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 30px rgba(0,0,0,0.5)',
                border: '2px solid rgba(255,255,255,0.2)'
            }}
        >
            {/* Ping Animation no alvo */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
            </span>
        </div>

        {/* Click trap para evitar interações durante a tour */}
        <div className="absolute inset-0 z-10" onClick={(e) => e.stopPropagation()}></div>

        {/* Tooltip Card */}
        <div style={tooltipStyle} className="glass-panel p-6 rounded-[2rem] z-20 flex flex-col relative animate-in zoom-in-95 duration-300">
            {/* Arrow (Visual only, simplified) */}
            {isMobile && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-gray-900 rotate-45 border-b border-r border-white/20"></div>
            )}
            {!isMobile && (
                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-white/90 dark:bg-gray-900 rotate-45 border-b border-l border-white/20"></div>
            )}

            <div className="flex justify-between items-start mb-2">
                <h3 className={`text-lg font-black ${step.color || 'text-gray-900 dark:text-white'}`}>{step.title}</h3>
                <span className="text-[10px] font-bold text-subtle bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {currentStepIndex + 1}/{STEPS.length}
                </span>
            </div>
            
            <p className="text-sm font-medium text-muted-strong mb-6 leading-relaxed">
                {step.desc}
            </p>

            <div className="flex gap-3 justify-end">
                <button 
                    onClick={handleSkip}
                    className="text-xs font-bold text-subtle hover:text-gray-600 dark:hover:text-gray-200 px-3 py-2 transition-colors"
                >
                    Pular
                </button>
                <div className="flex gap-2">
                    {currentStepIndex > 0 && (
                        <button 
                            onClick={handlePrev}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-strong transition-colors"
                        >
                            <ChevronLeft size={18}/>
                        </button>
                    )}
                    <button 
                        onClick={handleNext}
                        className="px-5 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-1"
                    >
                        {isLast ? "Concluir" : "Próximo"} <ChevronRight size={14}/>
                    </button>
                </div>
            </div>
        </div>

    </div>
  );
};

export default OnboardingModal;
