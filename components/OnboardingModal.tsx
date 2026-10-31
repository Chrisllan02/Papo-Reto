
import React, { useState, useEffect, useLayoutEffect } from 'react';
import Modal from './Modal';
import { ChevronRight, X, Check, ChevronLeft } from 'lucide-react';

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
    desc: 'Acompanhe votos e gastos com dados oficiais atualizados diariamente. Cada centavo e cada decisão, direto da fonte oficial.',
    color: 'text-green-700 dark:text-green-300'
  },
  {
    id: 'explore',
    targetId: 'explore',
    title: 'Raio-X Completo',
    desc: 'Pesquise qualquer parlamentar e veja histórico e desempenho.',
    color: 'text-orange-700 dark:text-orange-300'
  },
  {
    id: 'finish',
    targetId: null,
    title: 'Você está no comando',
    desc: 'A informação é sua melhor arma. Explore, fiscalize e compartilhe.',
    icon: Check,
    color: 'text-green-700 dark:text-green-300'
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

        const elements = document.querySelectorAll(`[data-tour="${step.targetId}"]`);
        let foundRect: DOMRect | null = null;

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

  const hasTarget = targetRect !== null;
  useEffect(() => {
      document.getElementById('onboarding-next')?.focus({ preventScroll: true });
  }, [currentStepIndex, hasTarget]);

  if (!targetRect) {
      return (
        <Modal onClose={handleSkip} labelledBy="onboarding-titulo" closeOnBackdrop={false} className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 animate-in fade-in duration-500">
            <div className="glass-panel w-full max-w-sm rounded-3xl p-6 md:p-8 text-center relative overflow-hidden">
                <button 
                    type="button"
                    onClick={handleSkip}
                    className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center text-subtle hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors z-20 focus-visible:ring-4 focus-visible:ring-blue-500/40"
                    aria-label="Fechar tour"
                    title="Fechar tour"
                >
                    <X size={20} aria-hidden="true" />
                </button>

                {step.icon && (
                    <div className="mb-6 flex justify-center">
                        <div className={`p-4 rounded-full bg-slate-100 dark:bg-white/10 ${step.color}`}>
                            <step.icon size={48} aria-hidden="true" />
                        </div>
                    </div>
                )}
                <h2 id="onboarding-titulo" className="text-2xl font-black text-midnight dark:text-white mb-4">{step.title}</h2>
                <p className="text-muted-strong font-medium mb-8 leading-relaxed">{step.desc}</p>
                
                <div className="flex gap-3">
                    {currentStepIndex > 0 && (
                        <button type="button" onClick={handlePrev} aria-label="Passo anterior" className="min-w-11 min-h-11 p-4 rounded-xl bg-slate-100 dark:bg-white/10 text-muted-strong hover:bg-slate-200 dark:hover:bg-white/20 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40">
                            <ChevronLeft size={20} aria-hidden="true" />
                        </button>
                    )}
                    <button 
                        id="onboarding-next"
                        type="button"
                        onClick={handleNext}
                        className="flex-1 min-h-11 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-blue-500/40"
                    >
                        {isLast ? "Começar" : "Continuar"} <ChevronRight size={18} aria-hidden="true" />
                    </button>
                </div>

                {currentStepIndex === 0 && (
                    <button 
                        type="button"
                        onClick={handleSkip}
                        className="mt-4 min-h-11 px-3 focus-visible:ring-4 focus-visible:ring-blue-500/40 rounded-md text-sm font-semibold text-subtle hover:text-midnight dark:hover:text-white transition-colors"
                    >
                        Pular introdução
                    </button>
                )}
            </div>
        </Modal>
      );
  }

  const isMobile = window.innerWidth < 768;

  const tooltipStyle: React.CSSProperties = isMobile
      ? {
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: window.innerHeight - targetRect.top + 20,
          width: '90%',
          maxWidth: '350px'
      }
      : {
          position: 'fixed',
          left: targetRect.right + 24,
          top: targetRect.top + (targetRect.height / 2),
          transform: 'translateY(-50%)',
          width: '320px'
      };

  return (
    <Modal onClose={handleSkip} labelledBy="onboarding-titulo" closeOnBackdrop={false} className="fixed inset-0 z-[100] animate-in fade-in duration-300">
        <div 
            className="absolute transition-all duration-300 ease-out rounded-xl pointer-events-none"
            style={{
                top: targetRect.top - 8,
                left: targetRect.left - 8,
                width: targetRect.width + 16,
                height: targetRect.height + 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
                border: '2px solid rgba(255,255,255,0.2)'
            }}
        >
            <span className="absolute -top-1 -right-1 inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
        </div>

        <div className="absolute inset-0 z-10" onClick={(e) => e.stopPropagation()}></div>

        <div style={tooltipStyle} className="glass-panel p-6 rounded-2xl z-20 flex flex-col relative animate-in zoom-in-95 duration-300">
            {isMobile && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-gray-900 rotate-45 border-b border-r border-white/20"></div>
            )}
            {!isMobile && (
                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-white/90 dark:bg-gray-900 rotate-45 border-b border-l border-white/20"></div>
            )}

            <div className="flex justify-between items-start mb-2">
                <h3 id="onboarding-titulo" className={`text-lg font-black ${step.color || 'text-midnight dark:text-white'}`}>{step.title}</h3>
                <span className="text-xs font-medium text-subtle">
                    {currentStepIndex + 1}/{STEPS.length}
                </span>
            </div>
            <p className="text-sm font-medium text-muted-strong mb-6 leading-relaxed">
                {step.desc}
            </p>

            <div className="flex gap-3 justify-end">
                <button 
                    type="button"
                    onClick={handleSkip}
                    className="min-h-11 text-sm font-semibold text-subtle hover:text-midnight dark:hover:text-white px-3 transition-colors rounded-md focus-visible:ring-4 focus-visible:ring-blue-500/40"
                >
                    Pular
                </button>
                <div className="flex gap-2">
                    {currentStepIndex > 0 && (
                        <button 
                            type="button"
                            onClick={handlePrev}
                            aria-label="Passo anterior"
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-muted-strong transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40"
                        >
                            <ChevronLeft size={18} aria-hidden="true" />
                        </button>
                    )}
                    <button 
                        id="onboarding-next"
                        type="button"
                        onClick={handleNext}
                        className="px-5 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm transition-colors active:scale-[0.98] flex items-center gap-1 focus-visible:ring-4 focus-visible:ring-blue-500/40"
                    >
                        {isLast ? "Concluir" : "Próximo"} <ChevronRight size={14} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>

    </Modal>
  );
};

export default OnboardingModal;
