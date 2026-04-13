import React, { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertTriangle,
  Award,
  Banknote,
  BadgeCheck,
  BarChart3,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Contact,
  DollarSign,
  ExternalLink,
  FileSearch,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Instagram,
  Linkedin,
  Mail,
  Facebook,
  Link,
  Loader2,
  MapPin,
  MessageSquare,
  Mic2,
  MonitorOff,
  PlayCircle,
  Search,
  ScrollText,
  Share2,
  Scale,
  Star,
  Tag,
  Twitter,
  Users,
  Youtube,
  Video,
  Volume2,
  VolumeX,
  Vote,
  X,
} from 'lucide-react';
import {
  AmendmentStats,
  Bill,
  Cabinet,
  ExpenseItem,
  LegislativeEvent,
  LegislativeVote,
  Politician,
  Relatoria,
  Remuneration,
  Role,
  Speech,
  Stats,
  YearStats,
} from '../../types';
import { Skeleton, SkeletonFeedItem } from '../../components/Skeleton';

type ProfileActivityItem =
  | ({ _type: 'bill' } & Bill)
  | ({ _type: 'vote' } & LegislativeVote)
  | ({ _type: 'report' } & Relatoria)
  | ({ _type: 'speech' } & Speech);

type MandateInfo = {
  percentage: number;
  startStr: string;
  endStr: string;
};

type StatsCardProps = {
  displayStats: Stats;
  selectedYear: number | 'total';
  setSelectedYear: Dispatch<SetStateAction<number | 'total'>>;
  availableYears: number[];
  commissionGroups: { titular: string[] };
  isLoading: boolean;
  mandateInfo: MandateInfo;
  loadingStatus: string;
};

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
      <Icon size={20} className="stroke-[1.5]" />
    </a>
  );
};

const PresenceBar = ({ label, present, justified, unjustified, total }: { label: string; present: number; justified: number; unjustified: number; total: number }) => {
  if (total === 0) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
        </div>
        <div className="w-full h-10 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400">
          <FolderOpen size={14} />
          <span className="text-xs font-bold uppercase tracking-wide">Sem dados</span>
        </div>
      </div>
    );
  }

  const pctPresent = total > 0 ? (present / total) * 100 : 0;
  const pctJustified = total > 0 ? (justified / total) * 100 : 0;
  const pctUnjustified = total > 0 ? (unjustified / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(pctPresent)}% Presença</span>
      </div>
      <div className="w-full h-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-full overflow-hidden flex shadow-inner">
        <div style={{ width: `${pctPresent}%` }} className="bg-green-500 h-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" title="Presenças" />
        <div style={{ width: `${pctJustified}%` }} className="bg-yellow-400 h-full" title="Ausências Justificadas" />
        <div style={{ width: `${pctUnjustified}%` }} className="bg-red-500 h-full" title="Ausências Não Justificadas" />
      </div>
      <div className="flex justify-between mt-1.5 text-xs font-bold text-gray-400 uppercase tracking-wide">
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {present}</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {justified} Justif.</div>
        <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {unjustified} Falta</div>
      </div>
    </div>
  );
};

export const RemunerationWidget = ({ remuneration }: { remuneration: Remuneration }) => {
  if (!remuneration) return null;

  const otherBenefits = remuneration.otherBenefits || 0;
  const allowTotal = remuneration.housingAllowance + otherBenefits;
  const total = remuneration.gross + allowTotal;
  const safeTotal = total > 0 ? total : 1;
  const netPct = (remuneration.net / safeTotal) * 100;
  const taxPct = (remuneration.tax / safeTotal) * 100;
  const allowPct = (allowTotal / safeTotal) * 100;
  const referenceLabel = remuneration.month && remuneration.year ? `${String(remuneration.month).padStart(2, '0')}/${remuneration.year}` : null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 p-6 md:p-8 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400">
          <DollarSign size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Salário e Benefícios</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">Remuneração Mensal Estimada</p>
          {referenceLabel && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Referência: {referenceLabel}</p>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Salário Bruto</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">R$ {remuneration.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex mb-2">
            <div style={{ width: `${netPct}%` }} className="bg-emerald-500 h-full" title="Salário Líquido" />
            <div style={{ width: `${taxPct}%` }} className="bg-red-400 h-full" title="Impostos/Descontos" />
            <div style={{ width: `${allowPct}%` }} className="bg-blue-400 h-full" title="Auxílios" />
          </div>

          <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 tracking-wide">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Líquido</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Descontos</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Auxílios</div>
          </div>
        </div>

        <div className="w-full md:w-auto bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-white/50 dark:border-white/10 min-w-[200px]">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-white/10">
            <span className="text-xs font-bold text-gray-500">Líquido em Conta</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">R$ {remuneration.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500">Impostos (IR/INSS)</span>
            <span className="text-xs font-bold text-red-500">- R$ {remuneration.tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {remuneration.housingAllowance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">Auxílio Moradia</span>
              <span className="text-xs font-bold text-blue-500">+ R$ {remuneration.housingAllowance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {otherBenefits > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold text-gray-500">Outros Auxílios</span>
              <span className="text-xs font-bold text-blue-500">+ R$ {otherBenefits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-[9px] text-gray-400 italic mt-4 text-center">
        * Valores baseados na remuneração padrão do cargo. Podem variar conforme descontos individuais e presença.
      </p>
    </div>
  );
};

export const AgendaWidget = ({ agenda }: { agenda: LegislativeEvent[] }) => {
  if (!agenda || agenda.length === 0) return null;

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 md:p-8 animate-in fade-in mb-8">
      <h3 className="font-black text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <CalendarDays size={20} className="text-blue-500" /> Agenda Legislativa
      </h3>

      <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
        {agenda.map((event, i) => (
          <div key={i} className="relative pl-6">
            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-800" />
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
              <span className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wide bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md self-start">
                {new Date(event.startTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} • {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{event.endTime ? ` → ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
              {event.status && (
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${event.status.includes('Convocada') ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'} self-start`}>
                  {event.status}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{event.title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1"><MapPin size={10} /> {event.location}</span>
              {event.type && <span className="flex items-center gap-1"><Tag size={10} /> {event.type}</span>}
              {event.endTime && <span className="flex items-center gap-1"><Clock size={10} /> Até {new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VotesSummaryWidget = ({ votes }: { votes: Record<number, string> }) => {
  if (!votes || Object.keys(votes).length === 0) return null;
  const entries = Object.entries(votes).sort((a, b) => Number(b[0]) - Number(a[0]));

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 md:p-8 animate-in fade-in mb-8">
      <h3 className="font-black text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <Vote size={20} className="text-blue-500" /> Mapa de Votos
      </h3>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-gray-100 dark:border-white/10">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{key}</span>
            <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DailyExpensesChart = ({ expenses }: { expenses: ExpenseItem[] }) => {
  const groupedData = useMemo(() => {
    const parseCurrency = (raw: any) => {
      if (typeof raw === 'number') return raw;
      if (typeof raw !== 'string') return Number(raw);
      const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      return Number(cleaned);
    };
    const normalizeDateKey = (raw: string) => {
      let dateKey = raw;
      if (dateKey.includes('T')) {
        dateKey = dateKey.split('T')[0];
      }
      if (dateKey.includes('/')) {
        const parts = dateKey.split('/');
        if (parts.length === 3) dateKey = `${parts[2]}-${parts[1]}-${parts[0]}`;
        if (parts.length === 2) dateKey = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
      }
      if (dateKey.includes('-')) {
        const dashParts = dateKey.split('-');
        if (dashParts.length === 2) {
          dateKey = `${dashParts[0]}-${dashParts[1].padStart(2, '0')}-01`;
        }
      }
      return dateKey;
    };
    const groups: Record<string, { total: number; count: number; dateObj: Date }> = {};
    expenses.forEach(item => {
      if (!item.date) return;
      const dateKey = normalizeDateKey(item.date);
      if (dateKey.length < 10) return;
      if (!groups[dateKey]) {
        groups[dateKey] = { total: 0, count: 0, dateObj: new Date(`${dateKey}T12:00:00`) };
      }
      const value = parseCurrency(item.value);
      if (!Number.isFinite(value)) return;
      groups[dateKey].total += value;
      groups[dateKey].count += 1;
    });
    return Object.entries(groups).sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime()).slice(-30);
  }, [expenses]);

  if (groupedData.length === 0) return null;
  const maxVal = Math.max(...groupedData.map(d => d[1].total));
  if (!Number.isFinite(maxVal) || maxVal <= 0) return null;

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 md:p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 mb-6">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <h4 className="text-[11px] md:text-xs font-black uppercase text-gray-400 tracking-[0.4em] flex items-center gap-2">
            <Calendar size={14} className="text-blue-600 dark:text-blue-400" /> Cronologia de Gastos
          </h4>
          <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wide opacity-70">Picos Diários e Finais de Semana</p>
        </div>
      </div>
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex items-end gap-2 h-40 min-w-max px-2">
          {groupedData.map(([dateStr, data]) => {
            const dayOfWeek = data.dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const heightPct = Math.max((data.total / maxVal) * 100, 5);
            return (
              <div key={dateStr} className="flex flex-col items-center gap-2 group relative">
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10">
                  <span className="block">{dateStr.split('-').reverse().join('/')}</span>
                  <span className="text-xs">R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  {isWeekend && <span className="block text-orange-300 uppercase text-[9px] mt-0.5">Final de Semana</span>}
                </div>
                <div className={`w-3 md:w-4 rounded-t-full transition-all duration-500 relative ${isWeekend ? 'bg-orange-400 dark:bg-orange-500' : 'bg-blue-400 dark:bg-blue-600'}`} style={{ height: `${heightPct}%` }}>
                  <div className="absolute top-0 left-0 right-0 h-1/3 bg-white/20 rounded-t-full" />
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-[9px] font-bold ${isWeekend ? 'text-orange-500 dark:text-orange-400' : 'text-gray-400 dark:text-gray-300'}`}>{data.dateObj.getDate()}</span>
                  <span className="text-[7px] uppercase font-black text-gray-300 dark:text-gray-400">{data.dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const WordCloudWidget = ({ speeches }: { speeches: Speech[] }) => {
  const words = useMemo(() => {
    if (!speeches || speeches.length === 0) return [];
    const frequency: Record<string, number> = {};
    speeches.forEach(speech => {
      if (speech.keywords) {
        speech.keywords.forEach(k => {
          const cleanK = k.trim();
          if (cleanK) frequency[cleanK] = (frequency[cleanK] || 0) + 1;
        });
      }
    });
    return Object.entries(frequency).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([text, value]) => ({ text, value }));
  }, [speeches]);

  if (words.length === 0) return null;
  const maxVal = Math.max(...words.map(w => w.value));

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 md:p-10 animate-in fade-in mb-8">
      <h3 className="font-black text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-blue-500" /> DNA do Discurso
      </h3>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center">
        {words.map((word, i) => {
          const scale = 0.8 + ((word.value / maxVal) * 1.5);
          const opacity = 0.5 + ((word.value / maxVal) * 0.5);
          return (
            <span key={i} className="font-black uppercase tracking-tighter transition-all hover:scale-110 hover:text-blue-600 dark:hover:text-blue-400 cursor-default" style={{ fontSize: `${scale}rem`, opacity, color: i < 3 ? 'var(--color-primary)' : 'inherit' }}>
              {word.text}
            </span>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">Termos mais utilizados em plenário</p>
    </div>
  );
};

export const BioCard = ({ candidate, isLoading }: { candidate: Politician; isLoading: boolean }) => {
  const age = useMemo(() => {
    if (!candidate.birthDate) return null;
    const birth = new Date(candidate.birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      years--;
    }
    return years;
  }, [candidate.birthDate]);

  const getZodiac = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    if ((month == 1 && day <= 20) || (month == 12 && day >= 22)) return 'Capricórnio';
    if ((month == 1 && day >= 21) || (month == 2 && day <= 18)) return 'Aquário';
    if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Peixes';
    if ((month == 3 && day >= 21) || (month == 4 && day <= 20)) return 'Áries';
    if ((month == 4 && day >= 21) || (month == 5 && day <= 20)) return 'Touro';
    if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gêmeos';
    if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Câncer';
    if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leão';
    if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgem';
    if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
    if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Escorpião';
    if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagitário';
    return '';
  };

  const sexLabel = candidate.sex
    ? (candidate.sex.toUpperCase() === 'F' ? 'Feminino' : candidate.sex.toUpperCase() === 'M' ? 'Masculino' : candidate.sex)
    : 'N/A';
  const birthplace = candidate.birthCity
    ? `${candidate.birthCity}${candidate.birthState ? ` / ${candidate.birthState}` : ''}`
    : (candidate.birthState || 'N/A');
  const conditionLabel = candidate.condition || 'N/A';
  const matchScore = Number.isFinite(candidate.matchScore) ? candidate.matchScore : null;
  const cabinetLocation = [
    candidate.cabinet?.room ? `Sala ${candidate.cabinet.room}` : null,
    candidate.cabinet?.floor ? `${candidate.cabinet.floor}º andar` : null,
    candidate.cabinet?.building || null
  ].filter(Boolean) as string[];
  const formatStaffStart = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
  };

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
          <Contact size={20} />
        </div>
        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Ficha Parlamentar</h3>
      </div>

      <div className="space-y-6 flex-1 relative">
        {isLoading && !candidate.email && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-blue-500" size={24} />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><Calendar size={10} /> Idade</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {isLoading ? <Skeleton className="h-4 w-12" /> : (age ? `${age} anos` : 'N/A')}
            </p>
            {candidate.birthDate && <span className="text-[9px] text-gray-400 font-bold uppercase">{getZodiac(candidate.birthDate)}</span>}
          </div>
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={10} /> Naturalidade</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{birthplace}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><Users size={10} /> Sexo</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{sexLabel}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><GraduationCap size={10} /> Escolaridade</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{candidate.education || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><BadgeCheck size={10} /> Condição</p>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{conditionLabel}</p>
          </div>
          {candidate.civilName && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs font-black uppercase text-gray-400 mb-1 flex items-center gap-1.5"><Contact size={10} /> Nome civil</p>
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{candidate.civilName}</p>
            </div>
          )}
        </div>

        {candidate.bio && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-2"><ScrollText size={12} /> Biografia</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{candidate.bio}</p>
          </div>
        )}

        {matchScore !== null && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-2"><Award size={12} /> Compatibilidade</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${Math.max(0, Math.min(100, matchScore))}%` }} />
              </div>
              <span className="text-xs font-black text-gray-800 dark:text-gray-200 tabular-nums">{Math.max(0, Math.min(100, matchScore))}%</span>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-white/5 pt-4">
          <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Contatos Oficiais</p>
          <div className="space-y-3">
            {candidate.email && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1"><Mail size={12} className="text-blue-500" /> E-mail</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{candidate.email}</p>
              </div>
            )}
            {candidate.cabinet?.email && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1"><Mail size={12} className="text-blue-500" /> E-mail do Gabinete</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{candidate.cabinet.email}</p>
              </div>
            )}
            {candidate.cabinet?.phone && (
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1"><MapPin size={12} className="text-blue-500" /> Telefone</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{candidate.cabinet.phone}</p>
              </div>
            )}
          </div>
        </div>

        {(cabinetLocation.length > 0 || candidate.cabinet?.address) && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2"><Building2 size={12} /> Gabinete</p>
            {cabinetLocation.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {cabinetLocation.map((item) => (
                  <span key={item} className="text-[9px] font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5">{item}</span>
                ))}
              </div>
            )}
            {candidate.cabinet?.address && (
              <div className="flex items-start gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <MapPin size={12} className="text-blue-500 mt-0.5" />
                <span className="leading-relaxed">{candidate.cabinet.address}</span>
              </div>
            )}
          </div>
        )}

        {candidate.staff && candidate.staff.length > 0 && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2">
              <Users size={12} /> Gabinete Digital
            </p>
            <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
              {candidate.staff.map((sec, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-[9px] font-black">
                      {sec.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-900 dark:text-white leading-none">{sec.name}</p>
                      <p className="text-[8px] text-gray-500 uppercase">{sec.role}</p>
                      {(sec.group || sec.start) && (
                        <p className="text-[8px] text-gray-400 uppercase flex flex-wrap items-center gap-1">
                          {sec.group && <span>{sec.group}</span>}
                          {sec.start && <span className="flex items-center gap-1"><Calendar size={8} /> desde {formatStaffStart(sec.start)}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {candidate.suplentes && candidate.suplentes.length > 0 && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Suplentes</p>
            <div className="flex flex-wrap gap-2">
              {candidate.suplentes.map((sup, i) => (
                <span key={i} className="text-[9px] font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/5">
                  {sup}
                </span>
              ))}
            </div>
          </div>
        )}

        {candidate.socials && candidate.socials.length > 0 && (
          <div className="pt-2">
            <div className="flex flex-wrap gap-2">
              {candidate.socials.map((url, i) => <SocialIcon key={i} url={url} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const StatsCard = ({ displayStats, selectedYear, setSelectedYear, availableYears, commissionGroups, isLoading, mandateInfo, loadingStatus }: StatsCardProps) => {
  const sortedYears = [...availableYears].sort((a, b) => a - b);
  const currentYear = new Date().getFullYear();
  const fidelity = displayStats.partyFidelity || 0;

  return (
    <div className="glass-panel rounded-[2.5rem] p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
          <BarChart3 size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white leading-none">Desempenho</h3>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mt-1">Evolução do Mandato</p>
        </div>
      </div>

      {isLoading && !displayStats.plenary ? (
        <div className="space-y-4 relative min-h-[300px] flex flex-col justify-center items-center">
          <div className="absolute inset-0 space-y-4 opacity-30 pointer-events-none">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="z-10 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300 glass-panel p-6 rounded-[2rem] shadow-xl">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide animate-pulse">
                {loadingStatus || 'Carregando...'}
              </p>
              <p className="text-xs font-bold text-gray-400 mt-1">Consultando bases da Câmara</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 flex-1 animate-in fade-in duration-500">
          <div className="bg-white/50 dark:bg-black/20 p-5 rounded-3xl border border-white/40 dark:border-white/5 shadow-inner">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Clock size={12} /> Linha do Tempo
              </span>
              <button
                onClick={() => setSelectedYear('total')}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition-all ${selectedYear === 'total' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/20'}`}
              >
                Mandato Completo
              </button>
            </div>
            <div className="relative h-14 flex items-center justify-between px-2 mx-1">
              <div className="absolute left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full top-1/2 -translate-y-1/2 z-0" />
              <div
                className="absolute left-0 h-1.5 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 z-0 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${Math.max(0, Math.min(100, mandateInfo.percentage))}%` }}
              />
              {sortedYears.map((year) => {
                const isActive = selectedYear === year;
                const isCurrent = year === currentYear;
                const isPast = year <= currentYear;
                return (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`group relative flex flex-col items-center justify-center w-10 h-10 rounded-full transition-all duration-300 z-10 active:scale-90 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xl scale-110 ring-4 ring-blue-100 dark:ring-blue-900/30'
                        : isPast
                          ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-200 border-2 border-blue-500 dark:border-blue-300/60 hover:border-blue-400 dark:hover:border-blue-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <span className={`text-xs font-black ${isActive ? 'text-white' : ''}`}>{year}</span>
                    {isCurrent && !isActive && <span className="absolute -bottom-6 text-[9px] font-black uppercase text-blue-500 tracking-wider bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">Atual</span>}
                    {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>

          <PresenceBar
            label={`Presença em Plenário (${selectedYear === 'total' ? 'Total' : selectedYear})`}
            present={displayStats.plenary?.present || 0}
            justified={displayStats.plenary?.justified || 0}
            unjustified={displayStats.plenary?.unjustified || 0}
            total={displayStats.plenary?.total || 0}
          />

          <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30 mt-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Scale size={14} /> Fidelidade Partidária
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase ${
                fidelity >= 90 ? 'bg-green-100 text-green-700' :
                fidelity >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
              }`}>
                {fidelity >= 90 ? 'Fiel à Bancada' : fidelity >= 60 ? 'Independente' : 'Rebelde'}
              </span>
            </div>
            <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                  fidelity >= 90 ? 'bg-green-500' : fidelity >= 60 ? 'bg-blue-500' : 'bg-red-500'
                }`}
                style={{ width: `${fidelity}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide group-hover:text-blue-500 transition-colors">Gastos de Gabinete ({selectedYear === 'total' ? 'Total' : selectedYear})</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                  R$ {displayStats.spending?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-600 rounded-xl">
                <Banknote size={24} />
              </div>
            </div>
            {commissionGroups.titular.length > 0 && (
              <div className="mt-4 flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                <span>Titular em Comissões</span>
                <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">{commissionGroups.titular.length} Colegiados</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ActivityCard: React.FC<{ item: ProfileActivityItem }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const type = item._type;

  if (type === 'bill') {
    return (
      <article className="glass-panel p-6 rounded-[2.5rem] flex flex-col gap-4 group hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-default animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-start">
          <span className={`text-xs font-black uppercase px-3 py-1 rounded-full backdrop-blur-md ${getStatusColor(item.status)}`}>{item.status}</span>
          <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
        </div>
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Proposta de Lei</span>
          <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-2 text-lg">{item.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">{item.description}</p>
        </div>
        <div className="flex gap-2 mt-auto">
          {item.urlInteiroTeor && (
            <a href={item.urlInteiroTeor} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5 hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
              <FileText size={12} /> Inteiro Teor
            </a>
          )}
          {item.externalLink && (
            <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5 hover:underline px-3 py-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/5 transition-colors ml-auto">
              Ver Site <ExternalLink size={12} />
            </a>
          )}
        </div>
      </article>
    );
  }

  if (type === 'vote') {
    const isSim = item.vote.toLowerCase().includes('sim');
    const isNao = item.vote.toLowerCase().includes('não') || item.vote.toLowerCase().includes('nao');
    const isRebel = item.isRebel;
    return (
      <article className="glass-panel p-6 rounded-[2.5rem] flex flex-col gap-4 hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-md ${isSim ? 'bg-green-100/50 text-green-600' : isNao ? 'bg-red-100/50 text-red-600' : 'bg-gray-100/50 text-gray-600'}`}>
            <Vote size={28} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Votação Nominal</span>
              <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <h4 className="font-bold text-base text-gray-900 dark:text-white leading-tight mb-2 line-clamp-3" title={item.description}>{item.description}</h4>
          </div>
        </div>
        <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-gray-400">Voto do Deputado</span>
            <span className={`text-xs font-black uppercase px-3 py-1 rounded-md ${isSim ? 'bg-green-100/50 text-green-700' : isNao ? 'bg-red-100/50 text-red-700' : 'bg-gray-100/50 text-gray-700'}`}>
              {item.vote}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5">
            <span className="text-[10px] font-bold uppercase text-gray-400">Orientação do Partido</span>
            <div className="flex items-center gap-2">
              {isRebel ? (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase bg-red-100/30 text-red-600 px-2 py-0.5 rounded border border-red-200/50">
                  <AlertTriangle size={10} /> Rebelde
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] font-bold uppercase bg-green-100/30 text-green-600 px-2 py-0.5 rounded border border-green-200/50">
                  <CheckCircle2 size={10} /> Seguiu
                </span>
              )}
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">{item.partyOrientation || 'Liberado'}</span>
            </div>
          </div>
        </div>
        {item.propositionId && (
          <div className="flex justify-end">
            <a href={`https://www.camara.leg.br/propostas-legislativas/${item.propositionId}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors">
              Ver Objeto da Votação (PL/PEC) <Link size={10} />
            </a>
          </div>
        )}
      </article>
    );
  }

  if (type === 'report') {
    return (
      <article className="glass-panel p-6 rounded-[2.5rem] flex flex-col gap-3 relative overflow-hidden hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-3xl pointer-events-none" />
        <div className="flex justify-between items-start relative z-10">
          <span className="bg-purple-100/50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-xs font-black uppercase px-3 py-1 rounded-full backdrop-blur-md">Relatoria</span>
          <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1 text-lg">{item.billTitle}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Comissão: {item.commission}</p>
        </div>
      </article>
    );
  }

  if (type === 'speech') {
    const hasAudio = !!item.urlAudio;
    const hasVideo = !!item.urlVideo;
    const phase = item.phase || 'Plenário';
    const isHighRelevance = phase.toLowerCase().includes('ordem do dia') || phase.toLowerCase().includes('grande expediente');

    return (
      <article className="glass-panel p-6 rounded-[2.5rem] group hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100/50 dark:bg-red-900/20 text-red-600 rounded-full backdrop-blur-md">
              <Mic2 size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Discurso</span>
              <span className="text-xs font-bold text-gray-500">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${isHighRelevance ? 'bg-orange-100/50 text-orange-700 border-orange-200' : 'bg-gray-100/50 text-gray-600 border-gray-200'}`}>
            {phase}
          </div>
        </div>
        <div className="relative mb-6">
          <p className={`text-sm md:text-base text-gray-700 dark:text-gray-300 italic leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            "{item.transcription || item.summary}"
          </p>
          {item.transcription && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-black/80 to-transparent pointer-events-none" />
          )}
        </div>
        {item.keywords && item.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {item.keywords.slice(0, 4).map((keyword: string, idx: number) => (
              <span key={idx} className="text-[9px] font-bold uppercase bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-md border border-gray-200 dark:border-white/5">
                #{keyword}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-white/10 bg-black relative min-h-[200px]">
            {hasVideo ? (
              showVideo ? (
                <div className="relative w-full h-full aspect-video bg-black">
                  <video controls className="w-full h-full object-contain" src={item.urlVideo}>
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                  <button onClick={() => setShowVideo(false)} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowVideo(true)} className="w-full h-48 md:h-64 bg-gray-900 relative group/play flex flex-col items-center justify-center hover:bg-gray-800 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover/play:scale-110 transition-transform mb-3">
                      <PlayCircle size={32} className="text-white fill-white/20 ml-1" />
                    </div>
                    <span className="text-xs font-black text-white/80 uppercase tracking-widest">Assistir Discurso</span>
                  </div>
                </button>
              )
            ) : (
              <div className="w-full h-48 md:h-64 bg-gray-100 dark:bg-white/5 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 dark:border-gray-700/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 pointer-events-none bg-[length:100%_4px,6px_100%]" />
                <div className="z-10 p-4 bg-gray-200/50 dark:bg-black/40 rounded-full">
                  <MonitorOff size={24} className="text-gray-400 dark:text-gray-600" />
                </div>
                <div className="z-10 text-center">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sinal de Vídeo Indisponível</p>
                  <p className="text-[9px] text-gray-400/70 mt-1">A Câmara não forneceu o registro visual.</p>
                </div>
              </div>
            )}
          </div>
          <div className={`rounded-2xl p-4 border flex items-center gap-4 transition-colors ${hasAudio ? 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5' : 'bg-gray-100/30 dark:bg-white/5 border-gray-200/50 dark:border-white/5 border-dashed'}`}>
            {hasAudio ? (
              <>
                <div className="p-3 bg-white dark:bg-white/10 rounded-full text-blue-500 shadow-sm shrink-0"><Volume2 size={20} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Áudio Oficial</p>
                  <audio controls className="w-full h-8 outline-none" src={item.urlAudio}>Seu navegador não suporta áudio.</audio>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-200 dark:bg-white/5 rounded-full text-gray-400 shrink-0"><VolumeX size={20} /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Áudio não captado</p>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-white/5 rounded-full mt-2 overflow-hidden"><div className="h-full w-full bg-gray-300 dark:bg-white/10" style={{ width: '0%' }} /></div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-100 dark:border-white/5">
            {item.transcription && (
              <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl text-xs font-black uppercase text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors backdrop-blur-md">
                <FileSearch size={14} className="pl-0.5" /> {expanded ? 'Recolher Texto' : 'Ler Íntegra'}
              </button>
            )}
            {item.externalLink && (
              <a href={item.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/50 dark:bg-white/5 rounded-xl text-xs font-black uppercase text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors backdrop-blur-md ml-auto">
                <ExternalLink size={14} /> Fonte Oficial
              </a>
            )}
          </div>
        </div>
      </article>
    );
  }

  return null;
};
