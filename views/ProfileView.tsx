import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, Clock, Building2, Banknote, Mic2, Loader2, Globe, Phone, Mail, Instagram, Twitter, Facebook, Youtube, ExternalLink, GraduationCap, Users, Info, MapPin, Wallet, Vote, PlayCircle, FolderOpen, Contact, CalendarDays, Linkedin } from 'lucide-react';
import { Politician, FeedItem, YearStats } from '../types';
import { enrichPoliticianData, enrichPoliticianFast } from '../services/camaraApi';
import { Skeleton, SkeletonFeedItem } from '../components/Skeleton';

export interface ProfileViewProps {
  candidate: Politician;
  onBack: () => void;
  onShare: () => void;
  feedItems: FeedItem[];
  onUpdate?: (pol: Politician) => void;
  allPoliticians?: Politician[];
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('aprovado')) return 'bg-blue-100/50 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200'; 
    if (s.includes('tramitação')) return 'bg-yellow-100/50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100/50 text-gray-600 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300';
};

const SocialIcon: React.FC<{ url: string }> = ({ url }) => {
    let Icon = Globe;
    let label = 'Site';
    let colorClass = 'text-gray-500 hover:text-blue-600';

    if (url.includes('instagram.com')) { Icon = Instagram; label = 'Instagram'; colorClass = 'text-pink-600 hover:text-pink-700'; }
    else if (url.includes('twitter.com') || url.includes('x.com')) { Icon = Twitter; label = 'Twitter'; colorClass = 'text-blue-400 hover:text-blue-500'; }
    else if (url.includes('facebook.com')) { Icon = Facebook; label = 'Facebook'; colorClass = 'text-blue-700 hover:text-blue-800'; }
    else if (url.includes('youtube.com')) { Icon = Youtube; label = 'YouTube'; colorClass = 'text-red-600 hover:text-red-700'; }
    else if (url.includes('linkedin.com')) { Icon = Linkedin; label = 'LinkedIn'; colorClass = 'text-blue-800 hover:text-blue-900'; }

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors ${colorClass}`} title={label}>
            <Icon size={20} />
        </a>
    );
};

const ActivityCard: React.FC<{ item: any }> = ({ item }) => {
    const type = item._type;
    
    if (type === 'bill') {
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-3 group hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-default">
                <div className="flex justify-between items-start">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full backdrop-blur-md ${getStatusColor(item.status)}`}>{item.status}</span>
                    <span className="text-[10px] font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Proposta de Lei</span>
                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-2">{item.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{item.description}</p>
                </div>
                {item.externalLink && (
                    <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="mt-auto text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline p-2 -ml-2 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 w-fit transition-colors">
                        Ver Íntegra <ExternalLink size={10} />
                    </a>
                )}
            </article>
        );
    }

    if (type === 'vote') {
        const isSim = item.vote.toLowerCase().includes('sim');
        const isNao = item.vote.toLowerCase().includes('não') || item.vote.toLowerCase().includes('nao');
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-4 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md ${isSim ? 'bg-green-100/50 text-green-600' : isNao ? 'bg-red-100/50 text-red-600' : 'bg-gray-100/50 text-gray-600'}`}>
                    <Vote size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Votação Nominal</span>
                        <span className="text-[9px] font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-1">{item.description}</h4>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md inline-block backdrop-blur-md ${isSim ? 'bg-green-100/50 text-green-700' : isNao ? 'bg-red-100/50 text-red-700' : 'bg-gray-100/50 text-gray-700'}`}>
                        Votou: {item.vote}
                    </span>
                </div>
            </article>
        );
    }

    if (type === 'report') {
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col gap-3 relative overflow-hidden hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none"></div>
                <div className="flex justify-between items-start relative z-10">
                    <span className="bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-[9px] font-black uppercase px-2 py-1 rounded-full backdrop-blur-md">Relatoria</span>
                    <span className="text-[10px] font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                    <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1">{item.billTitle}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Comissão: {item.commission}</p>
                </div>
            </article>
        );
    }

    if (type === 'speech') {
        return (
            <article className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-red-100/50 dark:bg-red-900/20 text-red-600 rounded-full backdrop-blur-md">
                        <Mic2 size={16} />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Discurso em Plenário</span>
                        <span className="text-[10px] font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
                <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 italic mb-4 leading-relaxed line-clamp-3">"{item.summary}"</p>
                {item.externalLink && (
                    <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50/50 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 group-hover:bg-red-50/50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-colors backdrop-blur-md">
                        <PlayCircle size={14} /> Ouvir / Assistir
                    </a>
                )}
            </article>
        );
    }

    return null;
};

const PresenceBar = ({ label, present, justified, unjustified, total }: { label: string, present: number, justified: number, unjustified: number, total: number }) => {
    if (total === 0) {
        return (
            <div className="mb-6 w-full">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
                </div>
                <div className="w-full h-12 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400">
                    <FolderOpen size={16} />
                    <span className="text-xs font-bold uppercase tracking-wide">Sem registros no período</span>
                </div>
            </div>
        );
    }

    const pctPresent = total > 0 ? (present / total) * 100 : 0;
    const pctJustified = total > 0 ? (justified / total) * 100 : 0;
    const pctUnjustified = total > 0 ? (unjustified / total) * 100 : 0;

    return (
        <div className="mb-6 w-full">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white">{Math.round(pctPresent)}% Presença</span>
            </div>
            <div className="w-full h-4 bg-gray-100/50 dark:bg-gray-700/50 rounded-full overflow-hidden flex shadow-inner">
                <div style={{ width: `${pctPresent}%` }} className="bg-green-500 h-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" title="Presenças"></div>
                <div style={{ width: `${pctJustified}%` }} className="bg-yellow-400 h-full" title="Ausências Justificadas"></div>
                <div style={{ width: `${pctUnjustified}%` }} className="bg-red-500 h-full" title="Ausências Não Justificadas"></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> {present} Presente</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> {justified} Justif.</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> {unjustified} Falta</div>
            </div>
        </div>
    );
};

const YearFilter = ({ years, selected, onSelect }: { years: number[], selected: number | 'total', onSelect: (y: number | 'total') => void }) => (
    <div className="w-full md:w-auto">
        <p className="md:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Filtrar Dados por Ano</p>
        <div className="bg-gray-100/50 dark:bg-white/5 p-1.5 rounded-2xl flex gap-1 overflow-x-auto scrollbar-hide shadow-inner border border-gray-200/50 dark:border-white/10 backdrop-blur-sm">
            <button
                onClick={() => onSelect('total')}
                className={`flex-1 md:flex-none min-w-[80px] px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    selected === 'total'
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600 scale-[1.02]'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
                Mandato
            </button>
            {years.map(year => (
                <button
                    key={year}
                    onClick={() => onSelect(year)}
                    className={`flex-1 md:flex-none min-w-[60px] px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                        selected === year
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600 scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    {year}
                </button>
            ))}
        </div>
    </div>
);

const ProfileView: React.FC<ProfileViewProps> = ({ candidate: initialCandidate, onBack, onShare, onUpdate, isFollowing }) => {
  const [profileTab, setProfileTab] = useState<'activities' | 'projects' | 'money' | 'cabinet' | 'agenda'>('activities');
  const [candidate, setCandidate] = useState<Politician>(initialCandidate);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandBio, setExpandBio] = useState(false);
  const [emailSignup, setEmailSignup] = useState('');
  const [isEmailSignedUp, setIsEmailSignedUp] = useState(false);
  
  const [activityFilter, setActivityFilter] = useState<'all' | 'propositions' | 'reported' | 'votes' | 'speeches'>('all');
  const [selectedYear, setSelectedYear] = useState<number | 'total'>(2025);
  
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const touchStartRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      setCandidate(initialCandidate);
      
      const loadDetails = async () => {
          setLoadingDetails(true);
          try {
              const fastData = await enrichPoliticianFast(initialCandidate);
              setCandidate(prev => ({ ...prev, ...fastData }));
              if (onUpdate) onUpdate({ ...initialCandidate, ...fastData });

              const fullData = await enrichPoliticianData(fastData);
              setCandidate(fullData);
              if (onUpdate) onUpdate(fullData);
          } finally {
              setLoadingDetails(false);
          }
      };
      
      if (initialCandidate.hasApiIntegration) {
          loadDetails();
      } else {
          setLoadingDetails(false);
      }
  }, [initialCandidate.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      const touchEnd = e.changedTouches[0].clientX;
      if (touchEnd - touchStartRef.current > 100) {
          onBack();
      }
  };

  const displayStats = useMemo(() => {
      if (selectedYear === 'total' || !candidate.yearlyStats || !candidate.yearlyStats[selectedYear]) {
          return candidate.stats;
      }
      const yearData = candidate.yearlyStats[selectedYear];
      return {
          ...candidate.stats,
          attendancePct: yearData.attendancePct,
          totalSessions: yearData.totalSessions,
          presentSessions: yearData.presentSessions,
          absentSessions: yearData.absentSessions,
          spending: yearData.spending,
          projects: yearData.projects,
          plenary: yearData.plenary || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 },
          commissions: yearData.commissions || { total: 0, present: 0, justified: 0, unjustified: 0, percentage: 0 }
      };
  }, [candidate, selectedYear]);

  const availableYears = useMemo(() => {
      if (!candidate.yearlyStats) return [];
      return Object.keys(candidate.yearlyStats).map(y => parseInt(y)).sort((a,b) => b - a);
  }, [candidate.yearlyStats]);

  const combinedActivities = useMemo(() => {
      let activities: any[] = [];
      if (candidate.bills) {
          activities = [...activities, ...candidate.bills.map(b => ({ ...b, _type: 'bill' }))];
      }
      if (candidate.votingHistory) {
          activities = [...activities, ...candidate.votingHistory.map(v => ({ ...v, _type: 'vote' }))];
      }
      if (candidate.reportedBills) {
          activities = [...activities, ...candidate.reportedBills.map(r => ({ ...r, _type: 'report' }))];
      }
      if (candidate.speeches) {
          activities = [...activities, ...candidate.speeches.map(s => ({ ...s, _type: 'speech' }))];
      }

      if (activityFilter !== 'all') {
          if (activityFilter === 'propositions') activities = activities.filter(a => a._type === 'bill');
          if (activityFilter === 'votes') activities = activities.filter(a => a._type === 'vote');
          if (activityFilter === 'reported') activities = activities.filter(a => a._type === 'report');
          if (activityFilter === 'speeches') activities = activities.filter(a => a._type === 'speech');
      }

      return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [candidate, activityFilter]);

  const commissionGroups = useMemo(() => {
      const titular: string[] = [];
      
      if (candidate.roles) {
          candidate.roles.forEach(role => {
              if (role.type === 'Permanente' || role.type === 'Comissão') {
                  if (role.title.includes('Titular')) titular.push(role.name);
              }
          });
      }
      return { titular };
  }, [candidate.roles]);

  useEffect(() => {
      const parseDate = (s: string) => {
          if (!s) return new Date();
          if (s.includes('/')) return new Date(s.split('/').reverse().join('-') + 'T23:59:59');
          return new Date(s);
      };
      
      const endDate = parseDate(candidate.mandate.end);

      const updateTimer = () => {
          const now = new Date();
          const difference = endDate.getTime() - now.getTime();

          if (difference > 0) {
              setTimeLeft({
                  days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                  hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                  minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                  seconds: Math.floor((difference % (1000 * 60)) / 1000)
              });
          } else {
              setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          }
      };

      const timerId = setInterval(updateTimer, 1000);
      updateTimer();

      return () => clearInterval(timerId);
  }, [candidate.mandate.end]);

  const mandateInfo = useMemo(() => {
      const parseDate = (s: string) => {
          if (!s) return new Date();
          if (s.includes('/')) return new Date(s.split('/').reverse().join('-'));
          return new Date(s);
      };
      
      const start = parseDate(candidate.mandate.start);
      const end = parseDate(candidate.mandate.end);
      const now = new Date();
      
      const totalTime = end.getTime() - start.getTime();
      const elapsedTime = now.getTime() - start.getTime();
      
      const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));
      const daysPassed = Math.max(0, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24)));
      
      const percentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
      
      const formatDate = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return { percentage, startStr: formatDate(start), endStr: formatDate(end) };
  }, [candidate.mandate]);

  return (
    <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto bg-transparent pb-32 scroll-smooth"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
    >
      <div className="relative w-full overflow-hidden rounded-b-[2.5rem] md:rounded-b-[4rem] shadow-2xl bg-gray-900 min-h-[240px] md:min-h-[280px] flex items-end group/header">
          <div className="absolute inset-0 bg-green-900"></div>
          <div className="absolute inset-0 opacity-50 mix-blend-overlay">
              <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Flag_of_Brazil.svg" alt="Bandeira do Brasil" className="w-full h-full object-cover scale-110 brightness-75"/>
          </div>
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay z-10"></div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent z-20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent z-20"></div>

          <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pt-safe">
            <button onClick={onBack} aria-label="Voltar para a lista" className="p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white backdrop-blur-md active:scale-90 border border-white/10 shadow-lg">
                <ChevronLeft size={24} aria-hidden="true" />
            </button>
            {loadingDetails && (
                <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 animate-in fade-in">
                    <Loader2 size={12} className="text-white animate-spin" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Atualizando...</span>
                </div>
            )}
          </div>
          
          <div className="relative z-30 w-full max-w-7xl mx-auto pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 pt-24">
              <div className="shrink-0 relative">
                  <div className="w-20 h-20 md:w-44 md:h-44 rounded-full shadow-2xl overflow-hidden bg-gray-800">
                      <img src={candidate.photo} className="w-full h-full object-cover" alt={`Foto de ${candidate.name}`} />
                  </div>
              </div>
              <div className="flex-1 text-center md:text-left text-white mb-2 min-w-0">
                  <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <span className="bg-white/10 backdrop-blur-md px-3 py-0.5 md:px-4 md:py-1 rounded-full text-white text-[9px] md:text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-sm">{candidate.party}</span>
                      <span className="bg-white/10 backdrop-blur-md px-3 py-0.5 md:px-4 md:py-1 rounded-full text-white text-[9px] md:text-[10px] font-black uppercase border border-white/10 tracking-widest shadow-sm">{candidate.state}</span>
                  </div>
                  <h1 className="text-2xl md:text-6xl font-black tracking-tighter leading-none drop-shadow-xl truncate">{candidate.name}</h1>
                  <p className="text-white/80 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-1.5 flex items-center justify-center md:justify-start gap-2">
                    {candidate.role} <span className="w-1 h-1 bg-white/60 rounded-full"></span> Em Exercício
                  </p>
              </div>
              
              <div className="hidden lg:block absolute right-12 bottom-12 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl min-w-[340px] group/mandate hover:bg-black/50 transition-colors">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60 flex items-center gap-1.5">
                        <Clock size={12} className="text-orange-500" /> Contagem Regressiva
                    </p>
                    <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                        {mandateInfo.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2 mb-4 text-center">
                      {[
                          { label: 'DIAS', value: timeLeft.days },
                          { label: 'HRS', value: timeLeft.hours },
                          { label: 'MIN', value: timeLeft.minutes },
                          { label: 'SEG', value: timeLeft.seconds }
                      ].map((time, i) => (
                          <div key={i} className="flex-1 bg-white/10 rounded-xl p-2 border border-white/5 backdrop-blur-sm shadow-inner group/timer hover:bg-white/15 transition-colors">
                              <span className="block text-xl md:text-2xl font-black text-white tabular-nums tracking-tighter leading-none group-hover/timer:scale-110 transition-transform">
                                  {String(time.value).padStart(2, '0')}
                              </span>
                              <span className="text-[7px] font-bold text-white/50 uppercase tracking-wider">{time.label}</span>
                          </div>
                      ))}
                  </div>
                  <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-1000" style={{ width: `${mandateInfo.percentage}%` }}></div>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 mix-blend-overlay"></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-white/40 uppercase tracking-widest">
                      <span>Início: {mandateInfo.startStr}</span>
                      <span>Fim: {mandateInfo.endStr}</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="px-4 md:px-12 max-w-[1800px] mx-auto mt-8 md:mt-10 relative z-20 space-y-6 px-safe">
          <section className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] mb-6">
               <h3 className="font-black text-blue-900 dark:text-white text-lg border-b border-gray-100/50 dark:border-white/10 pb-3 mb-6 flex items-center gap-2">
                   <Contact size={20} className="text-blue-600"/> Ficha Parlamentar
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x md:divide-gray-100 dark:md:divide-white/10">
                   <div className="space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Canais Oficiais</h4>
                       {loadingDetails && !candidate.email && !candidate.cabinet ? (
                           <>
                               <Skeleton className="h-4 w-1/2" />
                               <Skeleton className="h-4 w-3/4" />
                               <Skeleton className="h-10 w-full rounded-xl" />
                           </>
                       ) : (
                           <>
                               {candidate.email && (
                                   <div className="min-w-0">
                                       <p className="text-xs text-gray-500 font-black uppercase flex items-center gap-1.5 mb-1"><Mail size={12} className="text-blue-500" aria-hidden="true" /> E-mail Institucional</p>
                                       <p className="text-base font-bold text-blue-900 dark:text-white truncate">{candidate.email}</p>
                                   </div>
                               )}
                               {candidate.cabinet?.phone && (
                                   <div>
                                       <p className="text-xs text-gray-500 font-black uppercase flex items-center gap-1.5 mb-1"><Phone size={12} className="text-blue-500" aria-hidden="true" /> Gabinete Legislativo</p>
                                       <p className="text-base font-bold text-blue-900 dark:text-white">{candidate.cabinet.phone}</p>
                                   </div>
                               )}
                               {candidate.socials && candidate.socials.length > 0 && (
                                   <div>
                                       <p className="text-xs text-gray-500 font-black uppercase flex items-center gap-1.5 mb-2"><Globe size={12} className="text-blue-500" aria-hidden="true" /> Redes Sociais</p>
                                       <div className="flex flex-wrap gap-2">
                                           {candidate.socials.map((url, i) => <SocialIcon key={i} url={url} />)}
                                       </div>
                                   </div>
                               )}
                               {candidate.externalLink && (
                                   <div className="pt-2 mt-2 border-t border-gray-100/50 dark:border-white/10">
                                       <a href={candidate.externalLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 hover:bg-green-50/50 dark:hover:bg-green-900/20 group transition-all border border-transparent hover:border-green-200 dark:hover:border-green-900/50 w-full">
                                           <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center text-green-600 shadow-sm group-hover:scale-110 transition-transform"><Building2 size={18} /></div>
                                           <div className="flex-1">
                                               <p className="text-[9px] font-bold text-gray-500 uppercase group-hover:text-green-600 transition-colors">Transparência</p>
                                               <p className="text-xs font-black text-gray-900 dark:text-white">Perfil Oficial na Câmara</p>
                                           </div>
                                           <ExternalLink size={14} className="text-gray-400 group-hover:text-green-600" />
                                       </a>
                                   </div>
                               )}
                           </>
                       )}
                   </div>

                   <div className="space-y-5 md:pl-8">
                       <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Bio & Carreira</h4>
                       {loadingDetails && !candidate.birthCity && !candidate.education ? (
                           <div className="space-y-4">
                               <Skeleton className="h-4 w-1/3 mb-2" />
                               <Skeleton className="h-6 w-2/3" />
                               <div className="grid grid-cols-2 gap-4">
                                   <Skeleton className="h-10 w-full" />
                                   <Skeleton className="h-10 w-full" />
                               </div>
                               <Skeleton className="h-20 w-full" />
                           </div>
                       ) : (
                           <>
                               <div>
                                 <p className="text-xs text-gray-500 font-black uppercase mb-1 flex items-center gap-1.5"><GraduationCap size={12} className="text-blue-500" /> Escolaridade</p>
                                 <p className="text-base font-bold text-gray-800 dark:text-white">{candidate.education || 'Não informado'}</p>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <p className="text-xs text-gray-500 font-black uppercase mb-1 flex items-center gap-1.5"><MapPin size={12} className="text-blue-500" /> Naturalidade</p>
                                       <p className="text-base font-bold text-gray-800 dark:text-white leading-tight">{candidate.birthCity ? `${candidate.birthCity} - ${candidate.birthState}` : 'Não informado'}</p>
                                   </div>
                               </div>
                               {candidate.cabinet && (
                                   <div>
                                       <p className="text-xs text-gray-500 font-black uppercase mb-1 flex items-center gap-1.5"><Building2 size={12} className="text-blue-500" /> Gabinete em Brasília</p>
                                       <p className="text-sm md:text-base font-medium text-gray-600 dark:text-gray-300 leading-relaxed">Câmara dos Deputados, Anexo {candidate.cabinet.building || 'IV'}, Andar {candidate.cabinet.floor || 'N/A'}, Gabinete {candidate.cabinet.room || 'N/A'}, Brasília - DF</p>
                                   </div>
                               )}
                           </>
                       )}
                   </div>
               </div>
          </section>

          <section className="bg-white/95 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] w-full mb-8">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100/50 dark:border-white/10 pb-4 mb-6">
                   <h3 className="font-black text-blue-900 dark:text-white text-lg">Desempenho & Comissões</h3>
                   <YearFilter years={availableYears} selected={selectedYear} onSelect={setSelectedYear} />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                   <div>
                       {loadingDetails && !displayStats.plenary ? <Skeleton className="h-24 w-full rounded-2xl" /> : (
                           displayStats.plenary ? (
                               <PresenceBar 
                                   label="Presença em Plenário" 
                                   present={displayStats.plenary.present} 
                                   justified={displayStats.plenary.justified} 
                                   unjustified={displayStats.plenary.unjustified} 
                                   total={displayStats.plenary.total}
                               />
                           ) : <div className="text-xs text-gray-400 font-bold mb-4">Dados de plenário indisponíveis para este período.</div>
                       )}
                   </div>

                   <div>
                       {loadingDetails && !displayStats.commissions ? <Skeleton className="h-24 w-full rounded-2xl" /> : (
                           displayStats.commissions ? (
                               <PresenceBar 
                                   label="Presença em Comissões" 
                                   present={displayStats.commissions.present} 
                                   justified={displayStats.commissions.justified} 
                                   unjustified={displayStats.commissions.unjustified} 
                                   total={displayStats.commissions.total}
                               />
                           ) : <div className="text-xs text-gray-400 font-bold mb-4">Dados de comissão indisponíveis para este período.</div>
                       )}
                   </div>

                   <div className="flex flex-col gap-6">
                        <div>
                            <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2"><Users size={12}/> Integrante das Comissões</span>
                            <div className="space-y-3">
                                {loadingDetails && commissionGroups.titular.length === 0 ? <Skeleton className="h-12 w-full rounded-xl" /> : (
                                    commissionGroups.titular.length > 0 ? (
                                        <div>
                                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Titular em {commissionGroups.titular.length}</p>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-2" title={commissionGroups.titular.join(', ')}>{commissionGroups.titular.join(', ')}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Nenhuma titularidade.</p>
                                    )
                                )}
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100/50 dark:border-white/10">
                           <p className="text-xs text-gray-500 font-black uppercase mb-1 tracking-widest">{selectedYear === 'total' ? 'Gasto Total Acumulado' : `Gasto Total em ${selectedYear}`}</p>
                           {loadingDetails && displayStats.spending === 0 ? <Skeleton className="h-8 w-32 rounded" /> : (
                               <p className="text-2xl font-black text-blue-900 dark:text-white">R$ {displayStats.spending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                           )}
                       </div>
                   </div>
               </div>
          </section>

          <div className="min-w-0">
              <div className="sticky top-0 z-40 bg-white/70 dark:bg-midnight/90 backdrop-blur-3xl p-1.5 rounded-2xl md:rounded-full border border-white/50 dark:border-white/10 shadow-xl overflow-x-auto scrollbar-hide flex gap-1 mb-8 px-safe" role="tablist" aria-label="Detalhes do mandato">
                 {(['activities', 'money', 'cabinet', 'agenda'] as const).map(tab => (
                     <button key={tab} id={`tab-${tab}`} role="tab" aria-selected={profileTab === tab} aria-controls={`panel-${tab}`} onClick={() => setProfileTab(tab)} className={`px-6 md:px-10 py-3 md:py-3.5 rounded-xl md:rounded-full text-[10px] md:text-sm font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap flex-1 ${profileTab === tab ? 'bg-blue-600 text-white shadow-xl scale-[1.02]' : 'text-blue-500 hover:bg-gray-100/50 dark:hover:bg-white/10'}`}>
                        {tab === 'money' ? 'Custos' : tab === 'cabinet' ? 'Equipe' : tab === 'activities' ? 'Atuação' : tab === 'agenda' ? 'Agenda' : 'Leis'}
                     </button>
                 ))}
              </div>
              <div className="space-y-6 md:space-y-10 pb-32 animate-in fade-in duration-500">
                  <div id={`panel-${profileTab}`} role="tabpanel" aria-labelledby={`tab-${profileTab}`} tabIndex={0} className="outline-none">
                    {profileTab === 'activities' && (
                        <div>
                            <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                <button onClick={() => setActivityFilter('all')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Tudo</button>
                                <button onClick={() => setActivityFilter('propositions')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === 'propositions' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Propostas</button>
                                <button onClick={() => setActivityFilter('reported')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === 'reported' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Relatorias</button>
                                <button onClick={() => setActivityFilter('votes')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === 'votes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Votações</button>
                                <button onClick={() => setActivityFilter('speeches')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${activityFilter === 'speeches' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-500 border-gray-200 dark:border-gray-700'}`}>Discursos</button>
                            </div>
                            <div className="space-y-4">
                                {loadingDetails && combinedActivities.length === 0 ? (
                                    <>
                                        <SkeletonFeedItem />
                                        <SkeletonFeedItem />
                                    </>
                                ) : (
                                    combinedActivities.length > 0 ? combinedActivities.map((item, i) => (
                                        <ActivityCard key={`${item._type}-${i}`} item={item} />
                                    )) : (
                                        <div className="text-center py-24 text-gray-400 text-sm font-bold uppercase tracking-[0.3em] opacity-50">Nenhuma atividade encontrada neste filtro</div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                    {profileTab === 'agenda' && (
                        <div className="space-y-4">
                            {loadingDetails && (!candidate.agenda || candidate.agenda.length === 0) ? (
                                <Skeleton className="h-32 w-full rounded-[2.5rem]" />
                            ) : (
                                candidate.agenda && candidate.agenda.length > 0 ? candidate.agenda.map((event, i) => {
                                    const isLive = event.status?.toLowerCase().includes('andamento');
                                    return (
                                        <div key={i} className="bg-white/90 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                                            {isLive && (<div className="absolute top-0 right-0 px-4 py-2 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-lg animate-pulse">Ao Vivo</div>)}
                                            <div className="flex md:flex-col items-center md:justify-center gap-3 shrink-0 md:w-32 md:border-r border-gray-100 dark:border-gray-800">
                                                <div className="p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 backdrop-blur-sm"><CalendarDays size={24} /></div>
                                                <div className="text-center"><p className="text-xs font-black text-gray-900 dark:text-white uppercase">{event.startTime.split(' ')[0]}</p><p className="text-xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{event.startTime.split(' ')[1]}</p></div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex flex-wrap gap-2 mb-2"><span className="px-3 py-1 rounded-full bg-gray-100/50 dark:bg-white/5 text-[9px] font-black uppercase text-gray-500 tracking-wider backdrop-blur-sm">{event.type}</span><span className="px-3 py-1 rounded-full bg-gray-100/50 dark:bg-white/5 text-[9px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-1 backdrop-blur-sm"><MapPin size={10}/> {event.location}</span></div>
                                                <h4 className="text-lg font-black text-gray-900 dark:text-white mb-2 leading-tight">{event.description}</h4>
                                                <p className="text-sm text-gray-500 font-medium">Situação: {event.status}</p>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="text-center py-24 text-gray-400 text-sm font-bold uppercase tracking-[0.3em] opacity-50">Nenhum evento agendado para os próximos 15 dias</div>
                                )
                            )}
                        </div>
                    )}
                    {profileTab === 'money' && (
                         <div className="space-y-6 md:space-y-10">
                             {loadingDetails && displayStats.spending === 0 ? <Skeleton className="h-64 w-full rounded-[3rem]" /> : (
                                 <div className="bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 px-8 py-12 md:py-20 rounded-[3rem] border border-green-200/50 dark:border-green-800/50 text-center shadow-inner dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden group backdrop-blur-2xl">
                                     <div className="absolute top-4 right-6 text-green-500 opacity-50" title="Total bruto acumulado na API de Dados Abertos.">
                                         <Info size={16} />
                                     </div>
                                     <p className="text-[10px] md:text-xs font-black text-green-700 dark:text-green-300 uppercase mb-3 tracking-[0.3em]">{selectedYear === 'total' ? 'Recursos Públicos Utilizados (Total)' : `Recursos Utilizados em ${selectedYear}`}</p>
                                     <p className="text-4xl md:text-7xl font-black text-green-800 dark:text-green-400 tracking-tighter">R$ {displayStats.spending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                     <div className="mt-6 flex justify-center gap-3">
                                         <span className="text-[10px] font-bold text-green-600/60 uppercase tracking-widest bg-green-200/20 px-4 py-1 rounded-full">
                                             Atualizado: {new Date().toLocaleDateString('pt-BR')}
                                         </span>
                                     </div>
                                 </div>
                             )}
                             
                             {candidate.amendmentStats && candidate.amendmentStats.authorized > 0 && (
                                <section className="bg-white/60 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-8 rounded-[3rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
                                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="p-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-600 backdrop-blur-sm"><Wallet size={20} /></div><div><h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Emendas Individuais</h4><p className="text-[10px] text-gray-500 font-medium">Orçamento da União (Proposto)</p></div></div>
                                    <div className="space-y-6"><div><div className="flex justify-between items-end mb-2"><span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Valor Apresentado</span><span className="text-lg font-black text-purple-600 dark:text-purple-400">R$ {candidate.amendmentStats.authorized.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="w-full h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><div className="h-full bg-purple-500 rounded-full w-full"></div></div></div></div>
                                    <div className="mt-6 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl text-[10px] text-gray-500 italic text-center backdrop-blur-sm">* Valor total das emendas de autoria do parlamentar listadas na API. A execução financeira depende do Poder Executivo.</div>
                                </section>
                             )}
                             
                             {loadingDetails && (!candidate.expensesBreakdown || candidate.expensesBreakdown.length === 0) ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                    <Skeleton className="h-16 w-full rounded-2xl" />
                                </div>
                             ) : (
                                 candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 && (
                                      <section className="bg-white/60 dark:bg-midnight/90 backdrop-blur-2xl p-6 md:p-12 rounded-[3rem] border border-white/30 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                                          <h4 className="text-[11px] md:text-xs font-black uppercase text-gray-400 mb-8 tracking-[0.4em] border-b border-gray-50 dark:border-white/5 pb-3">Detalhamento dos Gastos</h4>
                                          <div className="space-y-4 md:space-y-6">
                                              {candidate.expensesBreakdown.map((exp, i) => (
                                                  <a 
                                                    key={i}
                                                    href={`https://www.camara.leg.br/deputados/${candidate.id}/despesas`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    title="Ver fonte oficial na Câmara"
                                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-gray-50/50 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-transparent hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all group cursor-pointer hover:scale-[1.01]"
                                                  >
                                                      <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                                          <div className="w-10 h-10 rounded-2xl bg-white/50 dark:bg-gray-700/50 flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                                                              <Banknote size={20} aria-hidden="true" />
                                                          </div>
                                                          <div>
                                                              <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-1 group-hover:text-blue-600 transition-colors">{exp.type}</span>
                                                              <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center gap-1 group-hover:text-blue-400">Fonte Oficial <ExternalLink size={8}/></span>
                                                          </div>
                                                      </div>
                                                      <div className="flex items-center justify-between sm:justify-end gap-6 pl-14 sm:pl-0">
                                                          <div className="text-right">
                                                              <span className="text-sm md:text-lg font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                              <div className="w-full bg-gray-200 dark:bg-gray-700 h-1 rounded-full mt-1 overflow-hidden" aria-hidden="true"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${exp.percent}%` }}></div></div>
                                                          </div>
                                                      </div>
                                                  </a>
                                              ))}
                                          </div>
                                      </section>
                                 )
                             )}
                         </div>
                    )}
                    
                    {profileTab === 'cabinet' && (
                        <div className="space-y-6">
                             <div className="bg-white/70 dark:bg-midnight/90 backdrop-blur-2xl rounded-[2.5rem] p-6 md:p-8 border border-white/20 dark:border-white/10 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                                <h3 className="font-black text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">Equipe de Gabinete</h3>
                                {loadingDetails && (!candidate.staff || candidate.staff.length === 0) ? (
                                    <div className="space-y-4">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : (
                                    candidate.staff && candidate.staff.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {candidate.staff.map((sec, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/10">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
                                                        {sec.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase">{sec.name}</p>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{sec.role} • {sec.group}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest opacity-50">
                                            Informação de secretários não disponível.
                                        </div>
                                    )
                                )}
                             </div>
                        </div>
                    )}

                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default ProfileView;