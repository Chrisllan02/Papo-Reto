
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, BrainCircuit, Check, X, SkipForward, Flame, Compass, Loader2, Info, AlertTriangle, HelpCircle, ArrowRight, ArrowLeft, RotateCcw, Sparkles, ExternalLink, BookOpen, FileText } from 'lucide-react';
import { Politician, QuizQuestion } from '../types';
import { QUIZ_QUESTIONS } from '../constants';
import { enrichPoliticianData, fetchDynamicQuizQuestions } from '../services/camaraApi';
import { Glossary } from '../components/Glossary';

interface MatchViewProps {
  politicians: Politician[];
  onFinish: (results: Politician[]) => void;
  onCancel: () => void;
}

const MatchView: React.FC<MatchViewProps> = ({ politicians, onFinish, onCancel }) => {
  const [mode, setMode] = useState<'menu' | 'quiz'>('menu');
  const [questions, setQuestions] = useState<QuizQuestion[]>(QUIZ_QUESTIONS);
  const [dynamicVoteMap, setDynamicVoteMap] = useState<Record<string, Record<number, string>>>({});
  
  const [step, setStep] = useState(0);
  const [userVotes, setUserVotes] = useState<Record<number, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcProgress, setCalcProgress] = useState(0);
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false);

  // Swipe Logic State
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [decisionFeedback, setDecisionFeedback] = useState<'neutral' | 'sim' | 'nao'>('neutral');
  const cardRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 100;

  // Haptic Feedback Helper
  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
      if (mode !== 'quiz' || isCalculating) return;

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight') handleVote('SIM');
          if (e.key === 'ArrowLeft') handleVote('NAO');
          if (e.key === 'ArrowDown' || e.key === ' ') handleVote('SKIP');
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isCalculating, step]);

  // --- LOGIC ---
  const startGame = async (gameMode: 'dynamic' | 'static') => {
      if (gameMode === 'static') {
          setQuestions(QUIZ_QUESTIONS);
          setDynamicVoteMap({});
          setMode('quiz');
      } else {
          setIsLoadingDynamic(true);
          try {
              const { questions: dynQuestions, voteMap } = await fetchDynamicQuizQuestions();
              if (dynQuestions.length === 0) {
                  alert("Não foi possível carregar votações recentes. Tente o modo Clássico.");
                  setIsLoadingDynamic(false);
                  return;
              }
              setQuestions(dynQuestions);
              setDynamicVoteMap(voteMap);
              setMode('quiz');
          } catch (e) {
              console.error(e);
              alert("Erro ao conectar com a Câmara.");
          } finally {
              setIsLoadingDynamic(false);
          }
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      setIsDragging(true);
      (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging) return;
      const newDragX = dragX + e.movementX;
      setDragX(newDragX);

      // Feedback visual e háptico baseado no threshold
      if (newDragX > SWIPE_THRESHOLD && decisionFeedback !== 'sim') {
          setDecisionFeedback('sim');
          triggerHaptic();
      } else if (newDragX < -SWIPE_THRESHOLD && decisionFeedback !== 'nao') {
          setDecisionFeedback('nao');
          triggerHaptic();
      } else if (Math.abs(newDragX) < SWIPE_THRESHOLD && decisionFeedback !== 'neutral') {
          setDecisionFeedback('neutral');
      }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      setIsDragging(false);
      setDecisionFeedback('neutral');
      (e.target as Element).releasePointerCapture(e.pointerId);

      if (dragX > SWIPE_THRESHOLD) handleVote('SIM');
      else if (dragX < -SWIPE_THRESHOLD) handleVote('NAO');
      else setDragX(0); 
  };

  const handleVote = (voto: string) => {
    // Animate card out
    if (voto === 'SIM') setDragX(window.innerWidth);
    else if (voto === 'NAO') setDragX(-window.innerWidth);
    else setDragX(0); 

    if (navigator.vibrate) navigator.vibrate(30);

    // Logic delay to allow animation to complete visually
    setTimeout(() => {
        const currentQ = questions[step];
        let newVotes = userVotes;
        
        if (voto !== 'SKIP') {
            newVotes = { ...userVotes, [currentQ.id]: voto };
            setUserVotes(newVotes);
        }
        
        finalizeStep(newVotes);
        setDragX(0);
    }, 250);
  };

  const finalizeStep = (currentVotes: Record<number, string>) => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      calculateFinalMatch(currentVotes);
    }
  };

  // --- OTIMIZAÇÃO: Cálculo Não-Bloqueante (Chunking) ---
  const calculateFinalMatch = async (finalUserVotes: Record<number, string>) => {
    setIsCalculating(true);
    setCalcProgress(0);
    
    const shuffled = [...politicians]; 
    const enrichedResults: Politician[] = [];
    const CHUNK_SIZE = 20; 
    let index = 0;

    const processChunk = async () => {
        const end = Math.min(index + CHUNK_SIZE, shuffled.length);
        
        for (let i = index; i < end; i++) {
            const pol = shuffled[i];
            let targetPol = pol;
            let score = 0;
            let maxScore = 0;
            
            questions.forEach(q => {
                let politicoVote = 'N/A';
                if (q.realVoteId) {
                    const voteIdStr = String(q.realVoteId);
                    if (dynamicVoteMap[voteIdStr] && dynamicVoteMap[voteIdStr][pol.id]) {
                        politicoVote = dynamicVoteMap[voteIdStr][pol.id];
                    }
                } else {
                    politicoVote = targetPol.votes ? targetPol.votes[q.id] : 'N/A';
                }
                
                const userVote = finalUserVotes[q.id];
                if (userVote && politicoVote && politicoVote !== 'N/A' && politicoVote !== 'ABST') {
                    maxScore += q.peso;
                    if (politicoVote === userVote) {
                        score += q.peso;
                    }
                }
            });

            const matchScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
            enrichedResults.push({ ...targetPol, matchScore });
        }

        index = end;
        setCalcProgress(Math.round((index / shuffled.length) * 100));

        if (index < shuffled.length) {
            setTimeout(processChunk, 0);
        } else {
            const topMatches = enrichedResults.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
            setTimeout(() => {
                setIsCalculating(false);
                onFinish(topMatches);
            }, 500);
        }
    };

    setTimeout(processChunk, 100);
  };

  // --- VISUALS ---

  if (isLoadingDynamic) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 relative overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-500 animate-spin opacity-50 blur-lg"></div>
                  <Loader2 size={40} className="text-blue-600 dark:text-white relative z-10 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Conectando ao Plenário...</h2>
              <p className="text-blue-500 dark:text-blue-400 font-bold text-sm">Baixando e traduzindo votações.</p>
          </div>
      );
  }

  if (isCalculating) {
      return (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in relative z-20">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                  <BrainCircuit size={80} className="text-blue-500 relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">Calculando Match...</h2>
              <div className="w-full max-w-xs h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 relative">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                    style={{ width: `${calcProgress}%` }}
                  ></div>
              </div>
              <p className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{calcProgress}% Processado</p>
          </div>
      );
  }

  // --- MENU SCREEN ---
  if (mode === 'menu') {
      return (
        <div className="w-full h-full font-sans overflow-y-auto pb-32 animate-in fade-in duration-300">
            <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6 space-y-8">
                
                {/* Standard Header */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 shadow-sm">
                                <BrainCircuit size={20} />
                            </div>
                            <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Teste de Afinidade</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                            Descubra sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-500">Bancada Ideal</span>
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 font-medium text-lg mt-2 max-w-2xl leading-relaxed">
                            Responda a questões reais do Congresso e veja quem vota como você.
                        </p>
                    </div>
                </div>

                {/* Selection Cards - Bento Grid Style */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CARD 1: HOT */}
                    <button 
                        onClick={() => startGame('dynamic')} 
                        className="group relative text-left h-[300px] w-full transition-all hover:-translate-y-1 outline-none overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:border-orange-200 dark:hover:border-orange-900/50 flex flex-col justify-between p-8"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Flame size={180} className="text-orange-500"/>
                        </div>
                        
                        <div className="relative z-10">
                             <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-900/30 group-hover:scale-110 transition-transform shadow-sm mb-6">
                                 <Flame size={28} className="fill-current" />
                             </div>

                             <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Em Alta <span className="text-orange-500 text-lg align-top">🔥</span></h3>
                             <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-[90%]">
                                 Baseado nas polêmicas que <strong>acabaram de acontecer</strong> no Plenário. Votos reais e quentes.
                             </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-3 text-orange-600 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all mt-4">
                             Começar Agora <ArrowRight size={16}/>
                        </div>
                    </button>

                    {/* CARD 2: CLASSIC */}
                     <button 
                        onClick={() => startGame('static')} 
                        className="group relative text-left h-[300px] w-full transition-all hover:-translate-y-1 outline-none overflow-hidden rounded-[2.5rem] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-2xl hover:border-blue-200 dark:hover:border-blue-900/50 flex flex-col justify-between p-8"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Compass size={180} className="text-blue-500"/>
                        </div>
                        
                        <div className="relative z-10">
                             <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform shadow-sm mb-6">
                                 <Compass size={28} className="fill-current" />
                             </div>

                             <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Clássico</h3>
                             <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed max-w-[90%]">
                                 Perguntas atemporais sobre Economia, Social e Costumes para definir seu perfil ideológico.
                             </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-3 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest group-hover:gap-5 transition-all mt-4">
                             Começar Agora <ArrowRight size={16}/>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- GAME MODE (QUIZ) ---
  
  // Swipe Visual Calculations
  const currentQ = questions[step];
  const progress = ((step) / questions.length) * 100;
  
  const dragPercentage = Math.min(Math.max(dragX / 200, -1), 1); 
  const opacityYes = Math.max(0, dragPercentage);
  const opacityNo = Math.max(0, -dragPercentage);
  const rotate = dragX * 0.05;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden relative font-sans">
        
        {/* Background Texture (Subtle) */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* SIDE INDICATORS (Visual Feedback Zones) */}
        <div 
            className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-red-500/10 to-transparent flex items-center justify-start pl-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityNo }}
        >
            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-red-100 dark:border-red-900/30 scale-110">
                <X size={32} className="text-red-500" strokeWidth={3}/>
            </div>
        </div>

        <div 
            className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-green-500/10 to-transparent flex items-center justify-end pr-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityYes }}
        >
             <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-green-100 dark:border-green-900/30 scale-110">
                <Check size={32} className="text-green-500" strokeWidth={3}/>
            </div>
        </div>

        {/* GAME HEADER */}
        <div className="w-full max-w-[1800px] mx-auto px-4 md:px-6 pt-6 pb-2 z-20 shrink-0">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setMode('menu')} className="p-3 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95 text-gray-500 hover:text-blue-600 dark:hover:text-white">
                    <ChevronLeft size={20} />
                </button>
                
                <div className="flex flex-col items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Progresso</span>
                     <div className="flex items-center gap-2">
                         <div className="w-32 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                         </div>
                         <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{step + 1}/{questions.length}</span>
                     </div>
                </div>

                <div className="p-3 opacity-0 pointer-events-none">
                     <ChevronLeft size={20} />
                </div>
            </div>
        </div>

        {/* CARD STACK AREA */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-4 z-20">
            
            {/* NEXT CARD PREVIEW (Stacked Effect) */}
            {step < questions.length - 1 && (
                <div 
                    className="absolute w-full max-w-md aspect-[3/4.2] bg-gray-200 dark:bg-gray-800 rounded-[2.5rem] border border-gray-300 dark:border-gray-700 shadow-sm pointer-events-none transition-transform duration-300 ease-out top-1/2 -translate-y-1/2"
                    style={{ 
                        transform: `translate(-50%, -50%) scale(${0.92 + (Math.abs(dragPercentage) * 0.04)}) translateY(${30 - (Math.abs(dragPercentage) * 15)}px)`,
                        left: '50%'
                    }}
                ></div>
            )}

            {/* ACTIVE CARD */}
            <div 
                ref={cardRef}
                className="w-full max-w-md bg-white dark:bg-gray-900 text-blue-900 dark:text-white rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 flex flex-col relative cursor-grab active:cursor-grabbing touch-none select-none will-change-transform"
                style={{ 
                    transform: `translateX(${dragX}px) rotate(${rotate}deg)`, 
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    aspectRatio: '3/4.5' // Slightly taller
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* Stamp Overlays */}
                <div 
                    className="absolute top-8 left-8 z-30 pointer-events-none border-[3px] border-green-500 rounded-xl px-4 py-1 opacity-0 transition-opacity"
                    style={{ opacity: opacityYes }}
                >
                     <span className="text-green-500 font-black text-3xl uppercase tracking-tighter -rotate-12 block drop-shadow-sm">SIM</span>
                </div>

                <div 
                    className="absolute top-8 right-8 z-30 pointer-events-none border-[3px] border-red-500 rounded-xl px-4 py-1 opacity-0 transition-opacity"
                    style={{ opacity: opacityNo }}
                >
                     <span className="text-red-500 font-black text-3xl uppercase tracking-tighter rotate-12 block drop-shadow-sm">NÃO</span>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full pointer-events-none select-none">
                    
                    {/* Header: Tag + AI Badge */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/30">
                            <Compass size={12}/> {currentQ.tema}
                        </div>
                        {currentQ.realVoteId && (
                            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full border border-purple-100 dark:border-purple-900/30">
                                <Sparkles size={10} />
                                <span className="text-[8px] font-bold uppercase tracking-wide">Traduzido por IA</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {/* 1. Contexto */}
                        {currentQ.context && (
                            <div className="mb-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2 mb-1.5 text-gray-400 dark:text-gray-500">
                                    <BookOpen size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">O Cenário</span>
                                </div>
                                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed italic">
                                    "{currentQ.context}"
                                </p>
                            </div>
                        )}

                        {/* 2. Proposta */}
                        {currentQ.proposal && (
                            <div className="mb-6 animate-in fade-in slide-in-from-bottom-3 delay-100">
                                <div className="flex items-center gap-2 mb-1.5 text-blue-400 dark:text-blue-500">
                                    <FileText size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">A Proposta</span>
                                </div>
                                <p className="text-base md:text-lg font-black text-blue-900 dark:text-white leading-tight">
                                    {currentQ.proposal}
                                </p>
                            </div>
                        )}

                        {/* 3. Pergunta Final */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in duration-300 delay-200">
                            <div className="flex justify-center mb-2 text-blue-500">
                                <HelpCircle size={24} />
                            </div>
                            <h2 className="text-center text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 leading-tight">
                                <Glossary term={currentQ.tema}>{currentQ.description}</Glossary>
                            </h2>
                        </div>
                    </div>
                    
                    {/* Footer Links */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                        {currentQ.sourceUrl && (
                            <a 
                                href={currentQ.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="pointer-events-auto inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-blue-500 transition-colors"
                                onPointerDown={(e) => e.stopPropagation()} 
                            >
                                <ExternalLink size={10} /> Fonte Oficial
                            </a>
                        )}
                        <div className="text-[9px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                            PapoReto &copy;
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="px-6 pb-24 md:pb-8 pt-6 flex items-center justify-center gap-6 md:gap-10 z-20 shrink-0">
            <button 
                onClick={() => handleVote('NAO')}
                className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900/30 text-red-500 flex items-center justify-center hover:scale-110 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-lg group active:scale-95"
                aria-label="Discordo"
            >
                <X size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform"/>
            </button>

            <button 
                onClick={() => handleVote('SKIP')}
                className="px-6 py-3 rounded-full bg-white dark:bg-gray-800 text-blue-400 dark:text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-md active:scale-95 transition-all flex flex-col items-center gap-1"
            >
                <SkipForward size={20}/>
                Pular
            </button>

            <button 
                onClick={() => handleVote('SIM')}
                className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-900/30 text-green-500 flex items-center justify-center hover:scale-110 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all shadow-lg group active:scale-95"
                aria-label="Concordo"
            >
                <Check size={32} strokeWidth={3} className="group-hover:scale-125 transition-transform"/>
            </button>
        </div>
    </div>
  );
};

export default MatchView;
