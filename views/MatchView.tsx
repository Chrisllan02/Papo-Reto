import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, BrainCircuit, Check, X, SkipForward, Flame, Compass, Loader2, Info, AlertTriangle, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
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
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-gray-900 text-center animate-in fade-in">
              <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-yellow-500 animate-spin opacity-50 blur-lg"></div>
                  <Loader2 size={40} className="text-white relative z-10 animate-spin" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Conectando...</h2>
              <p className="text-gray-400 font-medium">Baixando votações em tempo real.</p>
          </div>
      );
  }

  if (isCalculating) {
      return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black text-center animate-in fade-in">
              <div className="relative mb-8">
                  <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse"></div>
                  <BrainCircuit size={80} className="text-green-500 relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Calculando...</h2>
              <div className="w-full max-w-xs h-12 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative">
                  <div className="absolute inset-0 flex items-center justify-center z-10 text-xs font-bold text-white uppercase tracking-widest">
                      {calcProgress}% Concluído
                  </div>
                  <div 
                    className="h-full bg-green-600 transition-all duration-100 ease-linear" 
                    style={{ width: `${calcProgress}%` }}
                  ></div>
              </div>
          </div>
      );
  }

  if (mode === 'menu') {
      return (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] dark:bg-[#09090b] overflow-y-auto pb-safe">
            <div className="relative z-10 max-w-4xl mx-auto p-6 flex flex-col min-h-full">
                {/* Header Nav */}
                <div className="flex justify-between items-center mb-8 md:mb-12">
                    <button onClick={onCancel} className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:scale-105 transition-transform shadow-sm text-gray-900 dark:text-white">
                        <ChevronLeft size={24}/>
                    </button>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                        <BrainCircuit size={18} className="text-green-600 dark:text-green-400"/>
                        <span className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Afinidade</span>
                    </div>
                    <div className="w-12"></div>
                </div>

                {/* Hero Text */}
                <div className="text-center mb-10 md:mb-16">
                    <div className="inline-block mb-4 animate-bounce">
                        <span className="text-4xl">🔮</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 tracking-tighter leading-[0.9]">
                        Descubra sua <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-500">Afinidade</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-lg md:text-xl max-w-xl mx-auto leading-relaxed">
                        Responda a questões reais e descubra quem realmente representa seus interesses no Congresso.
                    </p>
                </div>

                {/* Clean Cards Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full flex-1 pb-8">
                    {/* CARD 1: HOT */}
                    <button onClick={() => startGame('dynamic')} className="group relative text-left h-auto min-h-[300px] w-full transition-all hover:-translate-y-1 outline-none">
                        <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm group-hover:shadow-xl transition-all group-hover:border-orange-500/30"></div>
                        
                        <div className="absolute inset-0 p-8 flex flex-col">
                             <div className="flex justify-between items-start mb-auto">
                                 <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-500 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-900/20 group-hover:scale-110 transition-transform">
                                     <Flame size={32} />
                                 </div>
                                 <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                     Em Alta
                                 </span>
                             </div>

                             <div className="mt-8">
                                 <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors">Votações<br/>Recentes</h3>
                                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                                     Baseado nas decisões que <strong>acabaram de acontecer</strong> no Plenário.
                                 </p>
                             </div>

                             <div className="mt-auto pt-6 flex items-center gap-2 text-gray-900 dark:text-white font-black text-sm uppercase tracking-wider group-hover:gap-4 transition-all">
                                 Começar <ArrowRight size={16} className="text-orange-500"/>
                             </div>
                        </div>
                    </button>

                    {/* CARD 2: CLASSIC */}
                     <button onClick={() => startGame('static')} className="group relative text-left h-auto min-h-[300px] w-full transition-all hover:-translate-y-1 outline-none">
                        <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 shadow-sm group-hover:shadow-xl transition-all group-hover:border-blue-500/30"></div>
                        
                        <div className="absolute inset-0 p-8 flex flex-col">
                             <div className="flex justify-between items-start mb-auto">
                                 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-500 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/20 group-hover:scale-110 transition-transform">
                                     <Compass size={32} />
                                 </div>
                             </div>

                             <div className="mt-8">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-500 transition-colors">Quiz<br/>Ideológico</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                                    Perguntas atemporais sobre Economia, Social e Costumes para definir perfil.
                                </p>
                             </div>

                             <div className="mt-auto pt-6 flex items-center gap-2 text-gray-900 dark:text-white font-black text-sm uppercase tracking-wider group-hover:gap-4 transition-all">
                                 Começar <ArrowRight size={16} className="text-blue-500"/>
                             </div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  // --- SWIPE VISUAL CALCS ---
  const currentQ = questions[step];
  const progress = ((step) / questions.length) * 100;
  
  const dragPercentage = Math.min(Math.max(dragX / 200, -1), 1); 
  const opacityYes = Math.max(0, dragPercentage);
  const opacityNo = Math.max(0, -dragPercentage);
  const rotate = dragX * 0.05;

  return (
    <div className="fixed inset-0 z-[200] bg-gray-100 dark:bg-black flex flex-col overflow-hidden touch-none select-none">
        
        {/* Background Texture (Subtle) */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #888 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

        {/* SIDE INDICATORS */}
        <div 
            className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-red-500/20 to-transparent flex items-center justify-start pl-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityNo }}
        >
            <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-red-100 dark:border-red-900/30">
                <X size={32} className="text-red-500"/>
            </div>
        </div>

        <div 
            className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-green-500/20 to-transparent flex items-center justify-end pr-6 transition-opacity duration-200 pointer-events-none z-10"
            style={{ opacity: opacityYes }}
        >
             <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-green-100 dark:border-green-900/30">
                <Check size={32} className="text-green-500"/>
            </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 absolute top-0 z-50">
            <div 
                className="h-full bg-green-500 transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>

        {/* HEADER */}
        <div className="p-6 flex justify-between items-center z-50 relative">
            <button onClick={() => setMode('menu')} className="p-3 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm transition-all active:scale-95 text-gray-600 dark:text-gray-300">
                <ChevronLeft />
            </button>
            <div className="flex flex-col items-center">
                 <div className="bg-white dark:bg-gray-800 px-4 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-2">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Questão {step + 1}</span>
                 </div>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
                 <HelpCircle size={24} className="text-gray-300 dark:text-gray-700" />
            </div>
        </div>

        {/* CARD STACK AREA */}
        <div className="flex-1 flex items-center justify-center relative px-4 perspective-[1200px] mb-8 z-30">
            
            {/* NEXT CARD PREVIEW */}
            {step < questions.length - 1 && (
                <div 
                    className="absolute w-full max-w-sm md:max-w-md aspect-[3/4.2] bg-gray-200 dark:bg-gray-800 rounded-[2.5rem] border border-gray-300 dark:border-gray-700 shadow-sm pointer-events-none transition-transform duration-300 ease-out"
                    style={{ 
                        transform: `scale(${0.92 + (Math.abs(dragPercentage) * 0.04)}) translateY(${25 - (Math.abs(dragPercentage) * 10)}px)`,
                    }}
                ></div>
            )}

            {/* ACTIVE CARD */}
            <div 
                ref={cardRef}
                className="w-full max-w-sm md:max-w-md aspect-[3/4.2] bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-[2.5rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.4)] p-8 md:p-10 flex flex-col relative cursor-grab active:cursor-grabbing border border-gray-200 dark:border-gray-700 overflow-hidden will-change-transform"
                style={{ 
                    transform: `translateX(${dragX}px) rotate(${rotate}deg)`, 
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    touchAction: 'none' 
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* Stamp Overlays */}
                <div 
                    className="absolute top-8 left-8 z-30 pointer-events-none border-4 border-green-500 rounded-xl px-4 py-2 opacity-0 transition-opacity"
                    style={{ opacity: opacityYes }}
                >
                     <span className="text-green-500 font-black text-4xl uppercase tracking-tighter -rotate-12 block">SIM</span>
                </div>

                <div 
                    className="absolute top-8 right-8 z-30 pointer-events-none border-4 border-red-500 rounded-xl px-4 py-2 opacity-0 transition-opacity"
                    style={{ opacity: opacityNo }}
                >
                     <span className="text-red-500 font-black text-4xl uppercase tracking-tighter rotate-12 block">NÃO</span>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full pointer-events-none">
                    <div className="flex justify-between items-start mb-auto">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Compass size={12}/> {currentQ.tema}
                        </div>
                    </div>

                    <div className="my-auto py-4">
                        <h2 className="text-3xl md:text-4xl font-black leading-[1.05] tracking-tight mb-6 text-gray-900 dark:text-white">
                            <Glossary term={currentQ.tema}>{currentQ.description}</Glossary>
                        </h2>
                        
                        <div className="flex items-center justify-center gap-8 opacity-20">
                             <div className="flex flex-col items-center gap-1">
                                 <ArrowLeft size={20} className="text-gray-500"/>
                                 <span className="text-[10px] font-bold uppercase text-gray-500">Não</span>
                             </div>
                             <div className="w-px h-8 bg-gray-400"></div>
                             <div className="flex flex-col items-center gap-1">
                                 <ArrowRight size={20} className="text-gray-500"/>
                                 <span className="text-[10px] font-bold uppercase text-gray-500">Sim</span>
                             </div>
                        </div>
                    </div>

                    <div className="mt-auto flex justify-center pb-2">
                        <div className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">
                            PapoReto &copy;
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="px-6 pb-12 pt-4 flex items-center justify-center gap-8 z-50">
            <button 
                onClick={() => handleVote('NAO')}
                className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-red-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg group"
                aria-label="Discordo"
            >
                <X size={32} strokeWidth={3}/>
            </button>

            <button 
                onClick={() => handleVote('SKIP')}
                className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-black uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
            >
                Pular
            </button>

            <button 
                onClick={() => handleVote('SIM')}
                className="w-16 h-16 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-green-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg group"
                aria-label="Concordo"
            >
                <Check size={32} strokeWidth={3}/>
            </button>
        </div>
    </div>
  );
};

export default MatchView;