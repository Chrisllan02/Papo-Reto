
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, Clock, Banknote, Loader2, ExternalLink, Wallet, Briefcase, Flag, PieChart, Tag, Plane, FileCheck, FileText, Crown, Star, ScrollText, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { Politician, FeedItem } from '../types';
import { Skeleton, SkeletonFeedItem } from '../components/Skeleton';
import { usePoliticianProfile } from '../hooks/useCamaraData';
import { formatLocalDate, parseLocalDate } from '../utils/date';
import { safeHttpUrl } from '../utils/url';
import {
  ActivityCard,
  AgendaWidget,
  BioCard,
  DailyExpensesChart,
  RemunerationWidget,
  StatsCard,
  VotesSummaryWidget,
  WordCloudWidget,
} from './profile/ProfileWidgets';

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

const getFrontCategoryStyle = (title: string) => {
    const t = title.toLowerCase();
    
    if (t.match(/agro|rural|campo/)) return { name: 'Agropecuária', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-900/50', stroke: '#22c55e' };
    if (t.match(/saúde|médic|hospit|doença/)) return { name: 'Saúde', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-900/50', stroke: '#ef4444' };
    if (t.match(/econo|comércio|indústria|serviços|tribut|invest/)) return { name: 'Economia', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/50', stroke: '#3b82f6' };
    if (t.match(/educ|ensino|escola|profess/)) return { name: 'Educação', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-900/50', stroke: '#eab308' };
    if (t.match(/seguran|polícia|armas|violência/)) return { name: 'Segurança', bg: 'bg-[#DBE64C] dark:bg-gray-700/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', stroke: '#4b5563' };
    if (t.match(/ambien|verde|clima|sustent|florest/)) return { name: 'Meio ambiente', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/50', stroke: '#10b981' };
    if (t.match(/mulher|idoso|criança|humanos|minoria|racial/)) return { name: 'Direitos humanos', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-900/50', stroke: '#a855f7' };
    if (t.match(/digit|tecno|inov|internet|cyber/)) return { name: 'Tecnologia', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-900/50', stroke: '#6366f1' };
    if (t.match(/transp|logíst|energia|obras|urbano/)) return { name: 'Infraestrutura', bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900/50', stroke: '#f97316' };
    
    return { name: 'Outros', bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', stroke: '#94a3b8' };
};

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const ZERO_TIME: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

const computeTimeLeft = (end: string): TimeLeft => {
    const endDate = parseLocalDate(end);
    if (!endDate) return ZERO_TIME;
    endDate.setHours(23, 59, 59, 0);
    const difference = endDate.getTime() - Date.now();
    if (difference <= 0) return ZERO_TIME;
    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
    };
};

interface MandateCountdownProps {
    end: string;
    percentage: number;
    startStr: string;
    endStr: string;
    variant: 'hero' | 'card';
}

// Estado próprio: o relógio de 1s não re-renderiza o perfil inteiro
const MandateCountdown: React.FC<MandateCountdownProps> = ({ end, percentage, startStr, endStr, variant }) => {
    const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(end));

    useEffect(() => {
        const update = () => setTimeLeft(computeTimeLeft(end));
        update();
        const timerId = setInterval(update, 1000);
        return () => clearInterval(timerId);
    }, [end]);

    const isHero = variant === 'hero';
    const units = [
        { label: 'Dias', value: timeLeft.days },
        { label: 'Horas', value: timeLeft.hours },
        { label: 'Min', value: timeLeft.minutes },
        { label: 'Seg', value: timeLeft.seconds },
    ];

    return (
        <>
            <div className="flex justify-between items-center mb-4">
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${isHero ? 'text-white/75' : 'text-gray-600 dark:text-gray-400'}`}><Clock size={12} className="text-orange-500" aria-hidden="true" /> Contagem regressiva</p>
                <span className={`text-xs font-semibold tabular-nums ${isHero ? 'text-orange-300' : 'text-orange-700 dark:text-orange-300'}`}>{percentage}% do mandato</span>
            </div>
            <div role="timer" className="flex justify-between items-center gap-2 mb-4 text-center">
                {units.map((time) => (
                    <div key={time.label} className={isHero
                        ? 'flex-1 bg-white/10 rounded-xl p-2 border border-white/10'
                        : 'flex-1 bg-white/50 dark:bg-white/5 rounded-xl p-2 border border-gray-200 dark:border-white/10'}>
                        <span className={isHero
                            ? 'block text-xl md:text-2xl font-black text-white tabular-nums tracking-tighter leading-none'
                            : 'block text-xl font-black text-gray-900 dark:text-white tabular-nums tracking-tighter leading-none'}>{String(time.value).padStart(2, '0')}</span>
                        <span className={`text-xs font-medium ${isHero ? 'text-white/75' : 'text-gray-600 dark:text-white/75'}`}>{time.label}</span>
                    </div>
                ))}
            </div>
            <div className={`relative w-full h-2 rounded-full overflow-hidden mb-2 ${isHero ? 'bg-white/10' : 'bg-[#DBE64C] dark:bg-white/10'}`}><div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-[#DBE64C] rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div>
            <div className={`flex justify-between text-xs font-medium ${isHero ? 'text-white/75' : 'text-gray-600 dark:text-white/75'}`}><span>Início: {startStr}</span><span>Fim: {endStr}</span></div>
        </>
    );
};

interface QuickMetricProps {
    icon: React.ElementType;
    label: string;
    value: string;
    hint: string;
    tone: string;
}

const QuickMetric: React.FC<QuickMetricProps> = ({ icon: Icon, label, value, hint, tone }) => (
    <div className="glass-surface rounded-2xl p-4 md:p-5 border border-white/60 dark:border-white/10 min-w-0">
        <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
                <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-subtle">{label}</p>
                <p className={`${/\d/.test(String(value)) ? 'text-xl md:text-2xl' : 'text-base md:text-lg'} font-black text-midnight dark:text-white tracking-tight leading-tight`}>{value}</p>
                <p className="text-xs font-medium text-muted leading-snug mt-1">{hint}</p>
            </div>
        </div>
    </div>
);

interface FrontCategory {
    name: string;
    percent: number;
    strokeColor: string;
}

const DnaDonutChart: React.FC<{ categories: FrontCategory[]; total: number }> = ({ categories, total }) => {
    const size = 220; 
    const strokeWidth = 35; 
    const center = size / 2;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const visibleCategories = categories.slice(0, 6);
    const startPercents = visibleCategories.map((_, i) => visibleCategories.slice(0, i).reduce((sum, cat) => sum + cat.percent, 0));
    return (
        <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90" role="img" aria-label={`Distribuição de ${total} frentes parlamentares por tema`}>
                <circle cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" className="text-gray-100 dark:text-[#1E488F]" stroke="currentColor" />
                {visibleCategories.map((cat, i) => {
                    const strokeDasharray = `${(cat.percent / 100) * circumference} ${circumference}`;
                    const rotation = (startPercents[i] / 100) * 360;
                    const offset = 0; 
                    return (
                        <circle key={cat.name} cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" stroke={cat.strokeColor} strokeDasharray={strokeDasharray} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(${rotation} ${center} ${center})`} className="transition-all duration-1000 ease-out" />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{total}</span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Frentes</span>
            </div>
        </div>
    );
};

const ProfileView: React.FC<ProfileViewProps> = ({ candidate: initialCandidate, onBack }) => {
  const [profileTab, setProfileTab] = useState<'activities' | 'money'>('activities');
  const [activityFilter, setActivityFilter] = useState<'all' | 'propositions' | 'reported' | 'votes' | 'speeches'>('all');
    const [showOtherFronts, setShowOtherFronts] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const { candidate: enrichedCandidate, isLoadingDetails, loadingStatus } = usePoliticianProfile(initialCandidate);
  const candidate = enrichedCandidate || initialCandidate;
  const [selectedYear, setSelectedYear] = useState<number | 'total'>('total');

  const handleTouchStart = (e: React.TouchEvent) => {
      const threshold = Math.min(window.innerWidth * 0.1, 35);
      if (e.touches[0].clientX < threshold) {
          touchStartRef.current = e.touches[0].clientX;
          touchStartYRef.current = e.touches[0].clientY;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (touchStartRef.current !== null) {
          const currentX = e.touches[0].clientX;
          const currentY = e.touches[0].clientY;
          const deltaX = currentX - touchStartRef.current;
          const deltaY = currentY - (touchStartYRef.current || 0);
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
              touchStartRef.current = null;
              touchStartYRef.current = null;
              setTranslateX(0);
              return;
          }
          if (deltaX > 0) {
              if (e.cancelable && deltaX > 10) e.preventDefault();
              setTranslateX(deltaX);
          }
      }
  };

  const handleTouchEnd = () => {
      if (touchStartRef.current !== null) {
          const threshold = window.innerWidth * 0.3; 
          if (translateX > threshold) onBack();
          setTranslateX(0);
          touchStartRef.current = null;
          touchStartYRef.current = null;
      }
  };

  useEffect(() => {
      // Mantém "Mandato completo" como padrão ao abrir o perfil.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- volta para o mandato completo ao trocar de parlamentar
      setSelectedYear('total');
  }, [candidate.id]);

  const frontCategories = useMemo(() => {
      if (!candidate.fronts || candidate.fronts.length === 0) return [];
      const categoryMap: Record<string, { count: number, bg: string, text: string, strokeColor: string, border: string }> = {};
      candidate.fronts?.forEach(f => {
          const style = getFrontCategoryStyle(f.title);
          if (!categoryMap[style.name]) {
              categoryMap[style.name] = { count: 0, bg: style.bg, text: style.text, strokeColor: style.stroke, border: style.border };
          }
          categoryMap[style.name].count++;
      });
      const total = candidate.fronts?.length || 1;
      return Object.entries(categoryMap)
          .filter(([, data]) => data.count > 0)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([name, data]) => ({ name, percent: (data.count / total) * 100, ...data }));
  }, [candidate.fronts]);

  const sortedFronts = useMemo(() => {
      if (!candidate.fronts) return [];
      return [...candidate.fronts].sort((a, b) => {
          const roleA = a.role || 'Membro';
          const roleB = b.role || 'Membro';
          if (roleA === 'Presidente') return -1;
          if (roleB === 'Presidente') return 1;
          if (roleA === 'Coordenador') return -1;
          if (roleB === 'Coordenador') return 1;
          return 0;
      });
  }, [candidate.fronts]);

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
      if (candidate.bills) activities = [...activities, ...candidate.bills.map(b => ({ ...b, _type: 'bill' }))];
      if (candidate.votingHistory) activities = [...activities, ...candidate.votingHistory.map(v => ({ ...v, _type: 'vote' }))];
      if (candidate.reportedBills) activities = [...activities, ...candidate.reportedBills.map(r => ({ ...r, _type: 'report' }))];
      if (candidate.speeches) activities = [...activities, ...candidate.speeches.map(s => ({ ...s, _type: 'speech' }))];
      if (activityFilter !== 'all') {
          if (activityFilter === 'propositions') activities = activities.filter(a => a._type === 'bill');
          if (activityFilter === 'votes') activities = activities.filter(a => a._type === 'vote');
          if (activityFilter === 'reported') activities = activities.filter(a => a._type === 'report');
          if (activityFilter === 'speeches') activities = activities.filter(a => a._type === 'speech');
      }
      return activities.sort((a, b) => {
          const diff = (parseLocalDate(b.date)?.getTime() ?? 0) - (parseLocalDate(a.date)?.getTime() ?? 0);
          if (diff !== 0) return diff;
          return String(b.date || '').localeCompare(String(a.date || ''));
      });
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

  const hasMandateDates = Boolean(parseLocalDate(candidate.mandate.start) && parseLocalDate(candidate.mandate.end));

  const mandateInfo = useMemo(() => {
      const start = parseLocalDate(candidate.mandate.start);
      const end = parseLocalDate(candidate.mandate.end);
      const startStr = formatLocalDate(candidate.mandate.start);
      const endStr = formatLocalDate(candidate.mandate.end);
      if (!start || !end) return { percentage: 0, startStr, endStr };
      const now = new Date();
      const totalTime = end.getTime() - start.getTime();
      const elapsedTime = now.getTime() - start.getTime();
      const totalDays = Math.max(1, Math.ceil(totalTime / (1000 * 60 * 60 * 24)));
      const daysPassed = Math.max(0, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24)));
      const percentage = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
      return { percentage, startStr, endStr };
  }, [candidate.mandate]);

  const profileSummary = useMemo(() => {
      const activitiesCount = (candidate.bills?.length || 0) + (candidate.votingHistory?.length || 0) + (candidate.reportedBills?.length || 0) + (candidate.speeches?.length || 0);
      const attendance = Math.round(displayStats.attendancePct || displayStats.plenary?.percentage || 0);
      const hasAttendance = Boolean(displayStats.plenary?.total || displayStats.totalSessions);
      const frontsCount = candidate.fronts?.length || 0;
      const spending = displayStats.spending || 0;
      const hasSourceData = candidate.hasApiIntegration !== false;
      const hasSpendingData = hasSourceData && (spending > 0 || Boolean(candidate.detailedExpenses?.length) || Boolean(candidate.expensesBreakdown?.length));
      return { activitiesCount, attendance, hasAttendance, frontsCount, spending, hasSourceData, hasSpendingData };
  }, [candidate, displayStats]);

  const getStatusDisplay = () => {
      let statusText = "Em exercício";
      let statusColor = "bg-green-500/20 text-white"; 
      let dotColor = "bg-green-400";
      if (candidate.situation) {
          const sit = candidate.situation.toLowerCase();
          if (sit.includes('licença')) {
              statusText = "Licenciado";
              if (candidate.statusDescription) {
                  statusText = candidate.statusDescription;
              }
              statusColor = "bg-yellow-500/20 text-yellow-50";
              dotColor = "bg-yellow-400";
          } else if (sit.includes('suplência') || sit.includes('suplente')) {
              statusText = "Suplência";
              statusColor = "bg-orange-500/20 text-orange-50";
              dotColor = "bg-orange-400";
          } else if (sit.includes('exercício')) {
              statusText = "Em exercício";
              statusColor = "bg-white/10 text-white";
              dotColor = "bg-green-400";
          } else {
              statusText = candidate.situation;
              statusColor = "bg-gray-500/20 text-gray-200";
              dotColor = "bg-gray-400";
          }
      }
      return { text: statusText, bg: statusColor, dot: dotColor };
  };
  const statusDisplay = getStatusDisplay();
  const maskDoc = (doc: string) => {
      if (!doc) return "---";
      if (doc.length > 11) return `${doc.substring(0, 2)}.***.***/${doc.substring(8, 12)}-**`;
      return `***.${doc.substring(3, 6)}.***-**`;
  };

  return (
    <div 
        ref={containerRef}
        className={`w-full h-full overflow-y-auto bg-transparent pb-24 md:pb-12 scroll-smooth ${translateX !== 0 ? 'will-change-transform' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={translateX !== 0 ? { transform: `translateX(${translateX}px)`, transition: 'none' } : { transition: 'transform 0.3s ease-out' }}
    >
      {isLoadingDetails && (
          <div role="status" className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-black/80 dark:bg-white/90 text-white dark:text-black px-6 py-3 rounded-full shadow-lg backdrop-blur-xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-500">
              <Loader2 size={18} className="animate-spin shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold whitespace-nowrap">{loadingStatus}</span>
          </div>
      )}

      <div className="px-4 md:px-12 max-w-[1800px] mx-auto pt-6 px-safe">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-lg bg-gray-900 min-h-[240px] md:min-h-[280px] flex items-end">
              <div className="absolute inset-0 bg-green-900"></div>
              <div className="absolute inset-0 opacity-50 mix-blend-overlay" aria-hidden="true"><svg viewBox="0 0 20 14" preserveAspectRatio="xMidYMid slice" className="w-full h-full brightness-75"><rect width="20" height="14" fill="#009C3B" /><path d="M10 1.7 18.3 7 10 12.3 1.7 7z" fill="#FFDF00" /><circle cx="10" cy="7" r="3.5" fill="#002776" /></svg></div>
              <div className="absolute inset-0 opacity-20 texture-overlay mix-blend-overlay z-10"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/90 to-transparent z-20"></div>
              <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
                <button type="button" onClick={onBack} aria-label="Voltar para a lista" className="p-3 md:p-4 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white backdrop-blur-md active:scale-[0.98] border border-white/10 focus-visible:ring-4 focus-visible:ring-white/50"><ChevronLeft size={24} aria-hidden="true" /></button>
              </div>
              <div className="relative z-30 w-full max-w-7xl mx-auto pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 pt-24 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="shrink-0 relative">
                      <div className="w-20 h-20 md:w-44 md:h-44 rounded-full shadow-lg overflow-hidden bg-gray-800"><img src={candidate.photo} className="w-full h-full object-cover" alt={`Foto de ${candidate.name}`} /></div>
                  </div>
                  <div className="flex-1 text-center md:text-left text-white mb-2 min-w-0">
                      <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-2 mb-2 md:mb-3">
                          <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold uppercase border border-white/10">{candidate.party}</span>
                          <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold uppercase border border-white/10">{candidate.state}</span>
                      </div>
                      <h1 className="text-2xl md:text-6xl font-black tracking-tighter leading-none break-words">{candidate.name}</h1>
                      <p className="text-white/90 text-sm font-medium mt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span>{candidate.role}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-white/10 max-w-full ${statusDisplay.bg}`} title={statusDisplay.text}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDisplay.dot}`}></span>
                            <span className="line-clamp-2">{statusDisplay.text}</span>
                        </span>
                      </p>
                  </div>
                  <div className="hidden lg:block absolute right-12 bottom-12 bg-black/40 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-lg min-w-[340px]">
                      {hasMandateDates ? <MandateCountdown end={candidate.mandate.end} percentage={mandateInfo.percentage} startStr={mandateInfo.startStr} endStr={mandateInfo.endStr} variant="hero" /> : <p className="text-xs font-bold text-white/80">Mandato: datas não informadas</p>}
                  </div>
              </div>
          </div>
      </div>

      <div className="px-4 md:px-12 max-w-[1800px] mx-auto mt-6 relative z-20 space-y-6 px-safe">
          <div className="lg:hidden mb-6 glass-panel rounded-2xl p-6">
                {hasMandateDates ? <MandateCountdown end={candidate.mandate.end} percentage={mandateInfo.percentage} startStr={mandateInfo.startStr} endStr={mandateInfo.endStr} variant="card" /> : <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Mandato: datas não informadas</p>}
          </div>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4" aria-label="Resumo do parlamentar">
              <QuickMetric
                  icon={CheckCircle2}
                  label="Presença"
                  value={profileSummary.hasAttendance ? `${profileSummary.attendance}%` : 'Não disponível'}
                  hint={profileSummary.hasAttendance ? 'Base oficial do mandato' : 'A fonte oficial não informa presença consolidada'}
                  tone="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              />
              <QuickMetric
                  icon={ScrollText}
                  label="Atividades"
                  value={profileSummary.hasSourceData ? profileSummary.activitiesCount.toLocaleString('pt-BR') : 'Sem dados da fonte'}
                  hint="Propostas, votos, relatorias e discursos"
                  tone="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              />
              <QuickMetric
                  icon={Flag}
                  label="Frentes"
                  value={profileSummary.hasSourceData ? profileSummary.frontsCount.toLocaleString('pt-BR') : 'Sem dados da fonte'}
                  hint="Temas de atuação parlamentar"
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              />
              <QuickMetric
                  icon={Wallet}
                  label="Custos"
                  value={profileSummary.hasSpendingData ? profileSummary.spending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'Sem dados da fonte'}
                  hint={selectedYear === 'total' ? 'Total disponível' : `Recorte de ${selectedYear}`}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              />
          </section>

          <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <BioCard candidate={candidate} isLoading={isLoadingDetails} />
              <StatsCard displayStats={displayStats} selectedYear={selectedYear} setSelectedYear={setSelectedYear} availableYears={availableYears} commissionGroups={commissionGroups} isLoading={isLoadingDetails} mandateInfo={mandateInfo} loadingStatus={loadingStatus} hasSpendingData={profileSummary.hasSpendingData} />
          </div>

          <div className="min-w-0">
              <div className="sticky top-0 z-40 glass-surface p-1.5 rounded-2xl shadow-sm overflow-x-auto scrollbar-hide flex gap-1 mb-8 px-safe" role="tablist" aria-label="Detalhes do mandato">
                 {(['activities', 'money'] as const).map(tab => (
                     <button key={tab} type="button" id={`tab-${tab}`} role="tab" aria-selected={profileTab === tab} aria-controls={`panel-${tab}`} onClick={() => setProfileTab(tab)} className={`px-6 md:px-10 min-h-[44px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap flex-1 ${profileTab === tab ? 'bg-blue-600 text-white' : 'text-blue-700 dark:text-blue-300 hover:bg-gray-100/50 dark:hover:bg-white/10'}`}>
                        {tab === 'money' ? 'Custos e salário' : 'Atuação e agenda'}
                     </button>
                 ))}
              </div>
              
              <div className="space-y-6 md:space-y-10 pb-24 md:pb-12">
                  <div id={`panel-${profileTab}`} role="tabpanel" aria-labelledby={`tab-${profileTab}`} tabIndex={0} className="rounded-2xl focus-visible:ring-4 focus-visible:ring-blue-500/40">
                    {profileTab === 'activities' && (
                        <div>
                            {candidate.agenda && candidate.agenda.length > 0 && <AgendaWidget agenda={candidate.agenda} />}

                            {candidate.votes && Object.keys(candidate.votes).length > 0 && <VotesSummaryWidget votes={candidate.votes} />}

                            {(activityFilter === 'all' || activityFilter === 'speeches') && candidate.speeches && candidate.speeches.length > 0 && <WordCloudWidget speeches={candidate.speeches} />}

                            <div className="glass-panel rounded-2xl p-6 md:p-10 animate-in fade-in mb-8">
                                <h3 className="font-semibold text-blue-900 dark:text-white text-lg mb-8 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2"><Flag size={20} className="text-blue-500 dark:text-blue-400"/> Frentes parlamentares</h3>
                                {isLoadingDetails ? <Skeleton className="h-20 w-full rounded-2xl" /> : (candidate.fronts && candidate.fronts.length > 0 ? (
                                    <div className="flex flex-col lg:flex-row gap-10 items-start">
                                        <div className="bg-gray-50/50 dark:bg-black/20 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8 shrink-0 w-full lg:w-auto">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="flex items-center gap-2 mb-6"><div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl"><PieChart size={18} /></div><h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">DNA de interesses</h4></div>
                                                <DnaDonutChart categories={frontCategories} total={candidate.fronts?.length || 0} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                                                {frontCategories.slice(0, 4).map((cat) => (
                                                    <div key={cat.name} className={`p-4 rounded-2xl border ${cat.bg} ${cat.border} flex flex-col items-center justify-center min-w-[100px]`}><span className={`text-2xl font-black ${cat.text}`}>{cat.count}</span><span className={`text-xs font-medium ${cat.text}`}>{cat.name}</span></div>
                                                ))}
                                                {frontCategories.length > 4 && (
                                                    <button
                                                        type="button"
                                                        aria-expanded={showOtherFronts}
                                                        onClick={() => setShowOtherFronts(prev => !prev)}
                                                        className="col-span-2 min-h-[44px] p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-center border border-gray-200 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40"
                                                    >
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                            +{candidate.fronts.length - frontCategories.slice(0,4).reduce((acc, c) => acc + c.count, 0)} outras
                                                        </span>
                                                        <span className="ml-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                            {showOtherFronts ? 'Ocultar' : 'Ver'}
                                                        </span>
                                                    </button>
                                                )}
                                                {showOtherFronts && frontCategories.slice(4).length > 0 && (
                                                    <div className="col-span-2 flex flex-wrap gap-2">
                                                        {frontCategories.slice(4).map((cat) => (
                                                            <span key={`other-${cat.name}`} className={`px-3 py-2 text-xs font-medium rounded-xl border ${cat.bg} ${cat.border} ${cat.text}`}>
                                                                {cat.name} • {cat.count}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 w-full">
                                            <div className="flex items-center gap-2 mb-6"><Tag size={16} className="text-gray-500 dark:text-gray-400" /><p className="text-xs font-black text-gray-500 dark:text-gray-400">Todas as frentes</p></div>
                                            <div className="flex flex-wrap gap-2 content-start max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                                {sortedFronts.map(f => {
                                                    const style = getFrontCategoryStyle(f.title);
                                                    const isLeader = f.role === 'Presidente';
                                                    const isCoordinator = f.role === 'Coordenador';
                                                    const isHighlight = isLeader || isCoordinator;
                                                    return (
                                                        <span key={f.id} className={`px-4 py-2 text-xs font-medium rounded-xl border cursor-default flex items-center gap-1.5 ${isHighlight ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700/50' : `${style.bg} ${style.text} ${style.border}`}`}>{isLeader && <Crown size={12} className="text-amber-600 dark:text-amber-400" />}{isCoordinator && <Star size={12} className="text-amber-600 dark:text-amber-400" />}{f.title}{isHighlight && <span className="text-xs border-l border-amber-600/30 pl-1 ml-0.5">{f.role}</span>}</span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : <div className="text-center py-6 text-gray-600 dark:text-gray-400 font-medium text-sm">Nenhuma frente parlamentar registrada.</div>)}
                            </div>

                            <div className="glass-panel rounded-2xl p-6 md:p-10 animate-in fade-in mb-8">
                                <h3 className="font-semibold text-blue-900 dark:text-white text-lg mb-8 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2"><Briefcase size={20} className="text-blue-500 dark:text-blue-400"/> Trajetória profissional</h3>
                                {isLoadingDetails && (!candidate.occupations || candidate.occupations.length === 0) ? <div className="space-y-4"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></div> : (candidate.occupations && candidate.occupations.length > 0 ? (
                                        <div className="space-y-4 relative">
                                            <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                                            {[...candidate.occupations].sort((a,b) => (b.startYear || 0) - (a.startYear || 0)).map((job, i) => (
                                                <div key={`${job.title}-${job.entity ?? ''}-${job.startYear ?? ''}-${i}`} className="flex gap-4 relative z-10 group">
                                                    <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center shrink-0 transition-colors"><Briefcase size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-blue-600"/></div>
                                                    <div className="flex-1 bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-colors">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-3">{job.title}</h4>
                                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{job.entity} {job.state ? `- ${job.state}` : job.country ? `- ${job.country}` : ''}</p>
                                                        <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">{job.startYear} {job.endYear ? `- ${job.endYear}` : '- Atual'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-center py-10 text-gray-600 dark:text-gray-400 font-medium text-sm">Informações de carreira não disponíveis na base oficial.</div>)}
                            </div>

                            <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                                {['all', 'propositions', 'reported', 'votes', 'speeches'].map(f => (
                                    <button key={f} type="button" aria-pressed={activityFilter === f} onClick={() => setActivityFilter(f as any)} className={`focus-visible:ring-4 focus-visible:ring-blue-500/40 px-5 min-h-[44px] rounded-xl text-sm font-medium whitespace-nowrap border transition-colors ${activityFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/50 dark:bg-midnight/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-midnight'}`}>{f === 'all' ? 'Tudo' : f === 'propositions' ? 'Propostas' : f === 'reported' ? 'Relatorias' : f === 'votes' ? 'Votações' : 'Discursos'}</button>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {isLoadingDetails && combinedActivities.length === 0 ? <><SkeletonFeedItem /><SkeletonFeedItem /><SkeletonFeedItem /></> : (combinedActivities.length > 0 ? combinedActivities.map((item, i) => <ActivityCard key={`${item._type}-${item.id ?? `${item.date}-${i}`}`} item={item} />) : <div className="text-center py-24 text-gray-600 dark:text-gray-400 text-sm font-medium">Nenhuma atividade encontrada neste filtro</div>)}
                            </div>
                        </div>
                    )}
                    {profileTab === 'money' && (
                         <div className="space-y-6 md:space-y-10">
                             {isLoadingDetails && displayStats.spending === 0 ? <Skeleton className="h-64 w-full rounded-2xl" /> : (
                                 <div className="bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-900/30 dark:to-green-900/10 px-8 py-12 md:py-20 rounded-2xl border border-green-200/50 dark:border-green-800/50 text-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                                     <p className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">{selectedYear === 'total' ? 'Recursos públicos utilizados (total)' : `Recursos utilizados em ${selectedYear}`}</p>
                                     <p className="text-4xl md:text-7xl font-black text-green-800 dark:text-green-400 tracking-tighter">{profileSummary.hasSpendingData ? `R$ ${displayStats.spending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sem dados da fonte'}</p>
                                 </div>
                             )}

                             {candidate.remuneration && <RemunerationWidget remuneration={candidate.remuneration} />}
                             
                             {candidate.amendmentStats && candidate.amendmentStats.authorized > 0 && (
                                <section className="glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden animate-in fade-in">
                                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="p-2 bg-purple-100/50 dark:bg-purple-900/30 rounded-xl text-purple-700 dark:text-purple-300"><Wallet size={20} /></div><div><h4 className="text-sm font-semibold text-gray-900 dark:text-white">Emendas individuais</h4><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Orçamento da União (proposto)</p></div></div>
                                    <div className="space-y-6"><div><div className="flex justify-between items-end mb-2"><span className="text-xs font-medium text-gray-600 dark:text-gray-400">Valor apresentado</span><span className="text-lg font-black text-purple-700 dark:text-purple-300">R$ {candidate.amendmentStats.authorized.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="w-full h-2 bg-purple-100 dark:bg-purple-900/30 rounded-full"><div className="h-full bg-purple-500 rounded-full w-full"></div></div></div></div>
                                    <div className="mt-6 p-3 bg-gray-50/50 dark:bg-white/5 rounded-xl text-xs text-gray-600 dark:text-gray-400 text-center">* Valor total das emendas de autoria do parlamentar listadas na API. A execução financeira depende do Poder Executivo.</div>
                                </section>
                             )}
                             
                             {isLoadingDetails && (!candidate.expensesBreakdown || candidate.expensesBreakdown.length === 0) ? <div className="space-y-2"><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /><Skeleton className="h-16 w-full rounded-2xl" /></div> : (candidate.expensesBreakdown && candidate.expensesBreakdown.length > 0 && (
                                      <section className="glass-panel p-6 md:p-12 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 border-b border-gray-50 dark:border-white/5 pb-3">Detalhamento dos gastos</h4>
                                          <div className="space-y-4 md:space-y-6">
                                              {candidate.expensesBreakdown.map((exp) => (
                                                  <a key={exp.type} href={`https://www.camara.leg.br/deputados/${candidate.id}/despesas`} target="_blank" rel="noopener noreferrer" title="Ver fonte oficial na Câmara" className="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-6 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 hover:border-blue-200 dark:hover:border-blue-900 transition-colors group cursor-pointer">
                                                      <div className="flex items-center gap-4 mb-2 sm:mb-0"><div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-gray-700/50 flex items-center justify-center text-blue-600 dark:text-blue-300"><Banknote size={24} aria-hidden="true" /></div><div><span className="text-sm font-semibold text-gray-700 dark:text-gray-200 line-clamp-3 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors block">{exp.type}</span><span className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">Fonte oficial <ExternalLink size={12} aria-hidden="true"/></span></div></div>
                                                      <div className="flex items-center justify-between sm:justify-end gap-6 pl-16 sm:pl-0"><div className="text-right"><span className="text-sm md:text-lg font-black text-blue-700 dark:text-blue-300 whitespace-nowrap">R$ {exp.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><div className="w-full bg-[#DBE64C] dark:bg-gray-700 h-1.5 rounded-full mt-1.5 overflow-hidden" aria-hidden="true"><div className="bg-[#1E488F] h-full rounded-full" style={{ width: `${exp.percent}%` }}></div></div></div></div>
                                                  </a>
                                              ))}
                                          </div>
                                      </section>
                                 ))}

                             {candidate.detailedExpenses && candidate.detailedExpenses.length > 0 && <DailyExpensesChart expenses={candidate.detailedExpenses} />}

                             {candidate.assets && candidate.assets.length > 0 && <section className="glass-panel p-6 md:p-10 rounded-2xl animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3">
                                    <div className="p-2.5 bg-yellow-100/50 dark:bg-yellow-900/30 rounded-xl text-yellow-700 dark:text-yellow-300"><BadgeCheck size={20} /></div>
                                    <div><h4 className="text-sm font-semibold text-gray-900 dark:text-white">Patrimônio declarado</h4><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Bens informados ao TSE</p></div>
                                </div>
                                <div className="space-y-4">
                                    {candidate.assets.map((asset, i) => (
                                        <div key={`${asset.type}-${asset.description}-${i}`} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                                            <div>
                                                <p className="text-xs font-semibold text-gray-800 dark:text-white">{asset.type}</p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">{asset.description}</p>
                                            </div>
                                            <span className="text-sm font-black text-gray-900 dark:text-white">{asset.value}</span>
                                        </div>
                                    ))}
                                </div>
                             </section>}

                             {candidate.detailedExpenses && candidate.detailedExpenses.length > 0 && (
                                <section className="glass-panel p-6 md:p-10 rounded-2xl animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2"><FileCheck size={14} className="text-green-700 dark:text-green-400" aria-hidden="true"/> Auditoria de notas fiscais</h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Últimos pagamentos realizados</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {candidate.detailedExpenses.slice(0, 20).map((expense, idx) => ( 
                                            <div key={expense.id ?? idx} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/40 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
                                                <div className="flex items-start gap-4 mb-3 md:mb-0">
                                                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 shrink-0"><span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{formatLocalDate(expense.date, { day: '2-digit', month: 'short' }, expense.date).replace('.', '')}</span><FileText size={14} className="text-gray-400 mt-0.5" aria-hidden="true"/></div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-white line-clamp-3 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{expense.provider}</p>
                                                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                            {expense.cnpjCpf && (<span className="text-xs font-medium text-gray-600 dark:text-gray-400">{maskDoc(expense.cnpjCpf)}</span>)}
                                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{expense.type}</span>
                                                            {expense.documentType && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{expense.documentType}{expense.documentNumber ? ` ${expense.documentNumber}` : ''}</span>}
                                                            {expense.installment && expense.installment > 0 && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Parcela {expense.installment}</span>}
                                                            {expense.reimbursementNumber && <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ressarcimento {expense.reimbursementNumber}</span>}
                                                        </div>
                                                        {Boolean(expense.documentValue || expense.disallowedValue) && (
                                                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                                                {expense.documentValue ? `Documento: ${expense.documentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                                                                {expense.disallowedValue ? ` • Glosa: ${expense.disallowedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between md:justify-end gap-4 pl-16 md:pl-0">
                                                    <p className="text-sm font-black text-gray-900 dark:text-white">R$ {expense.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    {safeHttpUrl(expense.urlDocumento) ? (<a href={safeHttpUrl(expense.urlDocumento)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40 rounded-lg">Nota fiscal <ExternalLink size={12} aria-hidden="true" /></a>) : (<span className="text-xs font-medium text-gray-600 dark:text-gray-400">Sem nota</span>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 text-center"><a href={`https://www.camara.leg.br/deputados/${candidate.id}/despesas`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[44px] text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40 rounded-lg">Ver todas as despesas no portal da Câmara <ExternalLink size={12} aria-hidden="true" /></a></div>
                                </section>
                             )}

                             {candidate.travels && candidate.travels.length > 0 && (
                                 <section className="glass-panel p-6 md:p-8 rounded-2xl relative overflow-hidden animate-in fade-in">
                                     <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-gray-700 pb-3"><div className="p-2 bg-sky-100/50 dark:bg-sky-900/30 rounded-xl text-sky-700 dark:text-sky-300"><Plane size={20} /></div><div><h4 className="text-sm font-semibold text-gray-900 dark:text-white">Viagens oficiais</h4><p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Deslocamentos com cota parlamentar</p></div></div>
                                     <div className="space-y-3">
                                         {candidate.travels.map((trip, i) => (
                                             <div key={`${trip.date}-${trip.destiny}-${i}`} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-sky-200 dark:hover:border-sky-900 transition-colors group">
                                                 <div className="flex items-center gap-4"><div className="flex flex-col items-center justify-center w-12 h-12 bg-white dark:bg-black/20 rounded-xl border border-gray-200 dark:border-white/10 shrink-0"><span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{formatLocalDate(trip.date, { month: 'short' }).replace('.', '')}</span><span className="text-lg font-black text-gray-800 dark:text-white leading-none">{parseLocalDate(trip.date)?.getDate() ?? ''}</span></div><div><p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">{trip.destiny}</p><p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">{trip.reason}</p></div></div>
                                                 <div className="text-right"><p className="text-sm font-black text-sky-700 dark:text-sky-300">R$ {trip.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                                             </div>
                                         ))}
                                     </div>
                                 </section>
                             )}
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
