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
  Landmark,
  Linkedin,
  Mail,
  Facebook,
  Link,
  Loader2,
  MapPin,
  Phone,
  MessageSquare,
  Mic2,
  MonitorOff,
  PlayCircle,
  Search,
  ScrollText,
  Scale,
  Tag,
  Twitter,
  Users,
  Youtube,
  Volume2,
  VolumeX,
  Vote,
  X,
} from 'lucide-react';
import { formatLocalDate, parseLocalDate } from '../../utils/date';
import { safeHttpUrl } from '../../utils/url';
import {
  Bill,
  ExpenseItem,
  LegislativeEvent,
  LegislativeVote,
  Politician,
  Relatoria,
  Remuneration,
  Speech,
  Stats,
} from '../../types';
import { Skeleton } from '../../components/Skeleton';

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
  hasSpendingData: boolean;
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

  const href = safeHttpUrl(url);
  if (!href) return null;

  const host = new URL(href).hostname.toLowerCase();
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (isHost('instagram.com')) { Icon = Instagram; label = 'Instagram'; colorClass = 'text-pink-600 hover:text-pink-700'; }
  else if (isHost('twitter.com') || isHost('x.com')) { Icon = Twitter; label = 'Twitter'; colorClass = 'text-sky-600 hover:text-sky-700'; }
  else if (isHost('facebook.com')) { Icon = Facebook; label = 'Facebook'; colorClass = 'text-blue-700 hover:text-blue-800'; }
  else if (isHost('youtube.com') || host === 'youtu.be') { Icon = Youtube; label = 'YouTube'; colorClass = 'text-red-600 hover:text-red-700'; }
  else if (isHost('linkedin.com')) { Icon = Linkedin; label = 'LinkedIn'; colorClass = 'text-blue-800 hover:text-blue-900'; }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`p-3 rounded-xl bg-gray-100/50 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40 ${colorClass}`} title={label} aria-label={`${label} (nova aba)`}>
      <Icon size={20} className="stroke-[1.5]" aria-hidden="true" />
    </a>
  );
};

const PresenceBar = ({ label, present, justified, unjustified, total }: { label: string; present: number; justified: number; unjustified: number; total: number }) => {
  if (total === 0) {
    return (
      <div className="w-full">
        <div className="flex justify-between items-end mb-2">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
        </div>
        <div className="w-full h-10 bg-gray-50/50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <FolderOpen size={14} aria-hidden="true" />
          <span className="text-xs font-medium">Sem dados</span>
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
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-black text-gray-900 dark:text-white">{Math.round(pctPresent)}% de presença</span>
      </div>
      <div className="w-full h-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-full overflow-hidden flex">
        <div style={{ width: `${pctPresent}%` }} className="bg-green-500 h-full" title="Presenças" />
        <div style={{ width: `${pctJustified}%` }} className="bg-yellow-400 h-full" title="Ausências Justificadas" />
        <div style={{ width: `${pctUnjustified}%` }} className="bg-red-500 h-full" title="Ausências Não Justificadas" />
      </div>
      <div className="flex justify-between mt-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1"><div aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-green-500" /> {present} presenças</div>
        <div className="flex items-center gap-1"><div aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> {justified} justificadas</div>
        <div className="flex items-center gap-1"><div aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-red-500" /> {unjustified} faltas</div>
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
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 p-6 md:p-8 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-700 dark:text-emerald-400">
          <DollarSign size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-none">Salário e benefícios</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">Remuneração mensal estimada</p>
          {referenceLabel && <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">Referência: {referenceLabel}</p>}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Salário bruto</span>
            <span className="text-xl font-black text-gray-900 dark:text-white">R$ {remuneration.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex mb-2">
            <div style={{ width: `${netPct}%` }} className="bg-emerald-500 h-full" title="Salário Líquido" />
            <div style={{ width: `${taxPct}%` }} className="bg-red-400 h-full" title="Impostos/Descontos" />
            <div style={{ width: `${allowPct}%` }} className="bg-blue-400 h-full" title="Auxílios" />
          </div>

          <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Líquido</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Descontos</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /> Auxílios</div>
          </div>
        </div>

        <div className="w-full md:w-auto bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-white/50 dark:border-white/10 min-w-[200px]">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-white/10">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Líquido em conta</span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">R$ {remuneration.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Impostos (IR/INSS)</span>
            <span className="text-xs font-bold text-red-700 dark:text-red-400">- R$ {remuneration.tax.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {remuneration.housingAllowance > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Auxílio moradia</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">+ R$ {remuneration.housingAllowance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {otherBenefits > 0 && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Outros auxílios</span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">+ R$ {otherBenefits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-4 text-center">
        * Valores baseados na remuneração padrão do cargo. Podem variar conforme descontos individuais e presença.
      </p>
    </div>
  );
};

export const AgendaWidget = ({ agenda }: { agenda: LegislativeEvent[] }) => {
  if (!agenda || agenda.length === 0) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 animate-in fade-in mb-8">
      <h3 className="font-semibold text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <CalendarDays size={20} className="text-blue-500" /> Agenda legislativa
      </h3>

      <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-6">
        {agenda.map((event, i) => (
          <div key={event.id ?? i} className="relative pl-6">
            <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-800" />
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 self-start">
                {new Date(event.startTime).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })} • {new Date(event.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{event.endTime ? ` → ${new Date(event.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
              </span>
              {event.status && (
                <span className={`text-xs font-medium self-start ${event.status.includes('Convocada') ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {event.status}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-3">{event.title}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{event.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
              {event.location && <span className="flex items-center gap-1"><MapPin size={12} aria-hidden="true" /> {event.location}</span>}
              {event.type && <span className="flex items-center gap-1"><Tag size={12} aria-hidden="true" /> {event.type}</span>}
            </div>
            {event.organs && event.organs.length > 0 && (
              <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                Órgãos: {event.organs.join(', ')}
              </p>
            )}
            {(safeHttpUrl(event.agendaDocumentUrl) || safeHttpUrl(event.sourceUrl)) && (
              <div className="mt-1 flex flex-wrap gap-x-4">
                {safeHttpUrl(event.agendaDocumentUrl) && (
                  <a href={safeHttpUrl(event.agendaDocumentUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                    <FileText size={12} aria-hidden="true" /> Pauta oficial
                  </a>
                )}
                {safeHttpUrl(event.sourceUrl) && (
                  <a href={safeHttpUrl(event.sourceUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-gray-700 hover:underline dark:text-gray-300 focus-visible:ring-4 focus-visible:ring-blue-500/40">
                    <ExternalLink size={12} aria-hidden="true" /> Registro do evento
                  </a>
                )}
              </div>
            )}
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
    <div className="glass-panel rounded-2xl p-6 md:p-8 animate-in fade-in mb-8">
      <h3 className="font-semibold text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <Vote size={20} className="text-blue-500" /> Mapa de votos
      </h3>
      <div className="flex flex-wrap gap-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-gray-100 dark:border-white/10">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{key}</span>
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{value}</span>
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
        groups[dateKey] = { total: 0, count: 0, dateObj: parseLocalDate(dateKey) ?? new Date(0) };
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
    <div className="glass-panel rounded-2xl p-6 md:p-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 mb-6">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Calendar size={14} className="text-blue-600 dark:text-blue-400" /> Cronologia de gastos
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Últimos {groupedData.length} dias com gasto registrado</p>
        </div>
      </div>
      <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex items-end gap-2 h-40 min-w-max px-2">
          {groupedData.map(([dateStr, data]) => {
            const dayOfWeek = data.dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const heightPct = Math.max((data.total / maxVal) * 100, 5);
            const dateLabel = dateStr.split('-').reverse().join('/');
            const valueLabel = `R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            return (
              <div
                key={dateStr}
                tabIndex={0}
                role="img"
                aria-label={`${dateLabel}: ${valueLabel}${isWeekend ? ', final de semana' : ''}`}
                className="flex flex-col items-center gap-2 group relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-300"
              >
                <div aria-hidden="true" className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity bg-black/90 text-white text-xs font-medium py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-10">
                  <span className="block">{dateLabel}</span>
                  <span className="text-xs">{valueLabel}</span>
                  {isWeekend && <span className="block text-orange-200 text-xs mt-0.5">Final de semana</span>}
                </div>
                <div className={`w-3 md:w-4 rounded-t-full transition-all duration-500 relative ${isWeekend ? 'bg-orange-500' : 'bg-blue-600 dark:bg-blue-500'}`} style={{ height: `${heightPct}%` }}>
                </div>
                <div className="flex flex-col items-center">
                  <span className={`text-xs font-bold ${isWeekend ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>{data.dateObj.getDate()}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{data.dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
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
    <div className="glass-panel rounded-2xl p-6 md:p-10 animate-in fade-in mb-8">
      <h3 className="font-semibold text-blue-900 dark:text-white text-lg mb-6 border-b border-gray-100 dark:border-gray-700 pb-4 flex items-center gap-2">
        <MessageSquare size={20} className="text-blue-500" /> DNA do discurso
      </h3>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center">
        {words.map((word, i) => {
          const scale = 0.8 + ((word.value / maxVal) * 1.5);
          return (
            <span key={word.text} className={`font-bold tracking-tighter cursor-default ${i < 3 ? 'text-blue-800 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`} style={{ fontSize: `${scale}rem` }}>
              {word.text}
            </span>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-600 dark:text-gray-400 font-medium mt-6">Termos mais utilizados em plenário</p>
    </div>
  );
};

export const BioCard = ({ candidate, isLoading }: { candidate: Politician; isLoading: boolean }) => {
  const age = useMemo(() => {
    if (!candidate.birthDate) return null;
    const birth = parseLocalDate(candidate.birthDate);
    if (!birth) return null;
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) {
      years--;
    }
    return years;
  }, [candidate.birthDate]);

  const getZodiac = (dateStr: string) => {
    const d = parseLocalDate(dateStr);
    if (!d) return '';
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
  const matchScore = Number.isFinite(candidate.matchScore) && candidate.matchScore > 0 ? candidate.matchScore : null;
  const cabinetLocation = [
    candidate.cabinet?.room ? `Sala ${candidate.cabinet.room}` : null,
    candidate.cabinet?.floor ? `${candidate.cabinet.floor}º andar` : null,
    candidate.cabinet?.building || null
  ].filter(Boolean) as string[];
  const formatStaffStart = (value?: string) => {
    if (!value) return null;
    const parsed = parseLocalDate(value);
    if (!parsed) return value;
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
          <Contact size={20} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-none">Ficha parlamentar</h3>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 relative">
        {isLoading && !candidate.email && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-blue-500" size={24} />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 xl:col-span-2">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Calendar size={12} aria-hidden="true" /> Idade</p>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {isLoading ? <Skeleton className="h-4 w-12" /> : (age ? `${age} anos` : 'N/A')}
            </div>
            {candidate.birthDate && <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{getZodiac(candidate.birthDate)}</span>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={12} aria-hidden="true" /> Naturalidade</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{birthplace}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Users size={12} aria-hidden="true" /> Sexo</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{sexLabel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><GraduationCap size={12} aria-hidden="true" /> Escolaridade</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{candidate.education || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><BadgeCheck size={12} aria-hidden="true" /> Condição</p>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{conditionLabel}</p>
          </div>
          {candidate.civilName && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1.5"><Contact size={12} aria-hidden="true" /> Nome civil</p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{candidate.civilName}</p>
            </div>
          )}
        </div>

        {candidate.bio && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4 xl:border-t-0 xl:border-l xl:pl-6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2"><ScrollText size={12} /> Biografia</p>
            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{candidate.bio}</p>
          </div>
        )}

        {matchScore !== null && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4 xl:border-t-0 xl:border-l xl:pl-6">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2"><Award size={12} aria-hidden="true" /> Compatibilidade</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${Math.max(0, Math.min(100, matchScore))}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 tabular-nums">{Math.max(0, Math.min(100, matchScore))}%</span>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-white/5 pt-4 xl:border-t-0 xl:border-l xl:pl-6">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Contatos oficiais</p>
          <div className="space-y-3">
            {candidate.email && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"><Mail size={12} className="text-blue-600 dark:text-blue-400" aria-hidden="true" /> E-mail</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{candidate.email}</p>
              </div>
            )}
            {candidate.cabinet?.email && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"><Mail size={12} className="text-blue-600 dark:text-blue-400" aria-hidden="true" /> E-mail do gabinete</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{candidate.cabinet.email}</p>
              </div>
            )}
            {candidate.cabinet?.phone && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1"><Phone size={12} className="text-blue-600 dark:text-blue-400" aria-hidden="true" /> Telefone</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{candidate.cabinet.phone}</p>
              </div>
            )}
          </div>
        </div>

        {(cabinetLocation.length > 0 || candidate.cabinet?.address) && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2"><Building2 size={12} aria-hidden="true" /> Gabinete</p>
            {cabinetLocation.length > 0 && <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">{cabinetLocation.join(' · ')}</p>}
            {candidate.cabinet?.address && (
              <div className="flex items-start gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                <MapPin size={12} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" aria-hidden="true" />
                <span className="leading-relaxed">{candidate.cabinet.address}</span>
              </div>
            )}
          </div>
        )}

        {(candidate.parliamentaryBlock || candidate.isBoardMember || candidate.isLeader || candidate.participation || candidate.exerciseStart || candidate.exerciseEnd || candidate.website || candidate.officialPage) && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4 xl:col-span-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2"><Landmark size={12} aria-hidden="true" /> Vínculos oficiais</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {candidate.parliamentaryBlock && <p className="text-xs font-medium text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Bloco:</span> {candidate.parliamentaryBlock}</p>}
              {candidate.participation && <p className="text-xs font-medium text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Participação:</span> {candidate.participation}</p>}
              {(candidate.exerciseStart || candidate.exerciseEnd) && <p className="text-xs font-medium text-gray-700 dark:text-gray-300"><span className="text-gray-500 dark:text-gray-400">Exercício:</span> {candidate.exerciseStart || 'N/A'} a {candidate.exerciseEnd || 'atual'}</p>}
              {(candidate.isBoardMember || candidate.isLeader) && (
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{[candidate.isBoardMember && 'Mesa diretora', candidate.isLeader && 'Liderança'].filter(Boolean).join(' · ')}</p>
              )}
            </div>
            {(safeHttpUrl(candidate.website) || safeHttpUrl(candidate.officialPage)) && (
              <div className="mt-1 flex flex-wrap gap-x-4">
                {safeHttpUrl(candidate.officialPage) && <a href={safeHttpUrl(candidate.officialPage)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40"><ExternalLink size={12} aria-hidden="true" /> Página oficial</a>}
                {safeHttpUrl(candidate.website) && <a href={safeHttpUrl(candidate.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40"><Globe size={12} aria-hidden="true" /> Site</a>}
              </div>
            )}
          </div>
        )}

        {candidate.staff && candidate.staff.length > 0 && (
          <div className="border-t border-gray-100 dark:border-white/5 pt-4 xl:col-span-2">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Users size={12} aria-hidden="true" /> Gabinete digital
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {candidate.staff.map((sec, idx) => (
                <div key={`${sec.name}-${sec.role}-${idx}`} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 flex items-center justify-center text-xs font-semibold">
                      {sec.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">{sec.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{sec.role}</p>
                      {(sec.group || sec.start) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-1">
                          {sec.group && <span>{sec.group}</span>}
                          {sec.start && <span className="flex items-center gap-1"><Calendar size={12} aria-hidden="true" /> desde {formatStaffStart(sec.start)}</span>}
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
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Suplentes</p>
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{candidate.suplentes.join(', ')}</p>
          </div>
        )}

        {candidate.socials && candidate.socials.length > 0 && (
          <div className="pt-2 xl:self-end">
            <div className="flex flex-wrap gap-2">
              {candidate.socials.map((url, i) => <SocialIcon key={`${url}-${i}`} url={url} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const StatsCard = ({ displayStats, selectedYear, setSelectedYear, availableYears, commissionGroups, isLoading, mandateInfo, loadingStatus, hasSpendingData }: StatsCardProps) => {
  const sortedYears = [...availableYears].sort((a, b) => a - b);
  const currentYear = new Date().getFullYear();
  const fidelity = displayStats.partyFidelity;
  const hasPresence = Boolean(displayStats.plenary?.total);
  const hasFidelity = typeof fidelity === 'number';

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-700 dark:text-green-400">
          <BarChart3 size={20} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-none">Desempenho</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">Evolução do mandato</p>
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
          <div className="z-10 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-300 glass-panel p-6 rounded-2xl shadow-md">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full" />
              <div className="absolute inset-0 w-12 h-12 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Search size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 dark:text-white animate-pulse">
                {loadingStatus || 'Carregando...'}
              </p>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Consultando bases da Câmara</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 animate-in fade-in duration-500">
          <div className="bg-white/50 dark:bg-black/20 p-5 rounded-2xl border border-gray-200 dark:border-white/10 xl:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Clock size={12} aria-hidden="true" /> Linha do tempo
              </span>
              <button
                type="button"
                aria-pressed={selectedYear === 'total'}
                onClick={() => setSelectedYear('total')}
                className={`text-xs font-semibold px-4 min-h-[44px] rounded-lg transition-colors ${selectedYear === 'total' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'}`}
              >
                Mandato completo
              </button>
            </div>
            <div className="relative h-14 flex items-center justify-between px-2 mx-1">
              <div className="absolute left-0 right-0 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full top-1/2 -translate-y-1/2 z-0" />
              <div
                className="absolute left-0 h-1.5 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 z-0 transition-all duration-1000 ease-out"
                style={{ width: `${Math.max(0, Math.min(100, mandateInfo.percentage))}%` }}
              />
              {sortedYears.map((year) => {
                const isActive = selectedYear === year;
                const isCurrent = year === currentYear;
                const isPast = year <= currentYear;
                return (
                  <button
                    key={year}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`Ano ${year}`}
                    onClick={() => setSelectedYear(year)}
                    className={`group relative flex flex-col items-center justify-center w-11 h-11 rounded-full transition-colors z-10 active:scale-[0.98] ${
                      isActive
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200 dark:ring-blue-900/60'
                        : isPast
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-200 border-2 border-blue-600 dark:border-blue-300/60 hover:border-blue-400 dark:hover:border-blue-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isActive ? 'text-white' : ''}`}>{year}</span>
                    {isCurrent && !isActive && <span className="absolute -bottom-6 text-xs font-semibold text-blue-700 dark:text-blue-300">Atual</span>}
                    {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />}
                  </button>
                );
              })}
            </div>
          </div>

          {hasPresence && <PresenceBar
              label={`Presença em plenário (${selectedYear === 'total' ? 'Total' : selectedYear})`}
              present={displayStats.plenary?.present || 0}
              justified={displayStats.plenary?.justified || 0}
              unjustified={displayStats.plenary?.unjustified || 0}
              total={displayStats.plenary?.total || 0}
            />}

          {hasFidelity && <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/30">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Scale size={14} aria-hidden="true" /> Fidelidade partidária
              </span>
              <span className={`text-xs font-semibold ${
                fidelity! >= 90 ? 'text-green-700 dark:text-green-300' :
                fidelity! >= 60 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {fidelity! >= 90 ? 'Fiel à bancada' : fidelity! >= 60 ? 'Independente' : 'Rebelde'}
              </span>
            </div>
            <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${
                  fidelity! >= 90 ? 'bg-green-500' : fidelity! >= 60 ? 'bg-blue-500' : 'bg-red-500'
                }`}
                style={{ width: `${fidelity}%` }}
              />
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {Math.round(fidelity!)}% dos votos alinhados à orientação do partido. Critério: Fiel 90% ou mais, Independente de 60% a 89%, Rebelde abaixo de 60%.
            </p>
          </div>}

          {!hasPresence && !hasFidelity && (
            <div className="xl:col-span-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-4 text-sm font-medium text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-400">
              Presença consolidada e orientação partidária não estão disponíveis na fonte oficial consultada.
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-white/5 xl:col-span-2">
            <div className="bg-gray-50/50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Gastos de gabinete ({selectedYear === 'total' ? 'Total' : selectedYear})</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
                  {hasSpendingData ? `R$ ${displayStats.spending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Sem dados da fonte'}
                </p>
              </div>
              <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl">
                <Banknote size={24} aria-hidden="true" />
              </div>
            </div>
            {commissionGroups.titular.length > 0 && (
              <div className="mt-4 flex justify-between items-center text-xs font-medium text-gray-600 dark:text-gray-400 px-1">
                <span>Titular em comissões</span>
                <span className="font-semibold text-blue-700 dark:text-blue-300">{commissionGroups.titular.length} colegiados</span>
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
      <article className="glass-panel p-6 rounded-2xl flex flex-col gap-4 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors cursor-default animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-start">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(item.status)}`}>{item.status}</span>
          <span className="text-xs font-bold text-gray-500">{formatLocalDate(item.date, undefined, 'Data não informada')}</span>
        </div>
        <div>
          <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 block mb-2">Proposta de lei</span>
          <h4 className="font-semibold text-gray-900 dark:text-white leading-tight mb-2 text-lg line-clamp-3">{item.title}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">{item.description}</p>
        </div>
        <div className="flex gap-4 mt-auto">
          {safeHttpUrl(item.urlInteiroTeor) && (
            <a href={safeHttpUrl(item.urlInteiroTeor)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5 min-h-[44px] hover:underline rounded-lg focus-visible:ring-4 focus-visible:ring-blue-500/40">
              <FileText size={12} aria-hidden="true" /> Inteiro teor
            </a>
          )}
          {safeHttpUrl(item.externalLink) && (
            <a href={safeHttpUrl(item.externalLink)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5 min-h-[44px] hover:underline rounded-lg focus-visible:ring-4 focus-visible:ring-blue-500/40 ml-auto">
              Ver site <ExternalLink size={12} aria-hidden="true" />
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
    const hasOrientation = Boolean(item.partyOrientation?.trim());
    return (
      <article className="glass-panel p-6 rounded-2xl flex flex-col gap-4 transition-colors animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isSim ? 'bg-green-100/60 text-green-700 dark:text-green-300' : isNao ? 'bg-red-100/60 text-red-700 dark:text-red-300' : 'bg-gray-100/60 text-gray-700 dark:text-gray-300'}`}>
            <Vote size={28} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-black text-gray-500">Votação nominal</span>
              <span className="text-xs font-bold text-gray-500">{formatLocalDate(item.date, undefined, 'Data não informada')}</span>
            </div>
            <h4 className="font-semibold text-base text-gray-900 dark:text-white leading-tight mb-2 line-clamp-3" title={item.description}>{item.description}</h4>
          </div>
        </div>
        <div className="bg-gray-50/50 dark:bg-white/5 rounded-2xl p-3 border border-gray-100 dark:border-white/5 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Voto do deputado</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-md ${isSim ? 'bg-green-100/60 text-green-800 dark:text-green-300' : isNao ? 'bg-red-100/60 text-red-800 dark:text-red-300' : 'bg-gray-100/60 text-gray-800 dark:text-gray-300'}`}>
              {item.vote}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-white/5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Orientação do partido</span>
            <div className="flex items-center gap-2">
              {hasOrientation && isRebel === true && (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
                  <AlertTriangle size={12} aria-hidden="true" /> Rebelde
                </span>
              )}
              {hasOrientation && isRebel === false && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
                  <CheckCircle2 size={12} aria-hidden="true" /> Seguiu
                </span>
              )}
              {hasOrientation ? (
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.partyOrientation}</span>
              ) : (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Orientação não informada</span>
              )}
            </div>
          </div>
        </div>
        {item.propositionId && (
          <div className="flex justify-end">
            <a href={`https://www.camara.leg.br/propostas-legislativas/${item.propositionId}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5 min-h-[44px] hover:underline rounded-lg focus-visible:ring-4 focus-visible:ring-blue-500/40">
              Ver objeto da votação (PL/PEC) <Link size={12} aria-hidden="true" />
            </a>
          </div>
        )}
      </article>
    );
  }

  if (type === 'report') {
    return (
      <article className="glass-panel p-6 rounded-2xl flex flex-col gap-3 transition-colors animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-start">
          <span className="bg-purple-100/60 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-semibold px-3 py-1 rounded-full">Relatoria</span>
          <span className="text-xs font-bold text-gray-500">{formatLocalDate(item.date, undefined, 'Data não informada')}</span>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white leading-tight mb-1 text-lg line-clamp-3">{item.billTitle}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Comissão: {item.commission}</p>
        </div>
      </article>
    );
  }

  if (type === 'speech') {
    const hasAudio = !!item.urlAudio;
    const hasVideo = !!item.urlVideo;
    const phase = item.phase?.toLowerCase() || '';
    const isHighRelevance = phase.includes('ordem do dia') || phase.includes('grande expediente');

    return (
      <article className="glass-panel p-6 rounded-2xl transition-colors animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100/60 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-full">
              <Mic2 size={18} aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">Discurso</span>
              <span className="text-xs font-bold text-gray-500">{formatLocalDate(item.date, undefined, 'Data não informada')}</span>
            </div>
          </div>
          {item.phase && (
            <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${isHighRelevance ? 'bg-orange-100/60 text-orange-800 border-orange-200 dark:text-orange-300 dark:border-orange-900/50' : 'bg-gray-100/60 text-gray-700 border-gray-200 dark:text-gray-300 dark:border-white/10'}`}>
              {item.phase}
            </div>
          )}
        </div>
        <div className="relative mb-6">
          <p className={`text-sm md:text-base text-gray-700 dark:text-gray-300 italic leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {item.transcription || item.summary ? `"${item.transcription || item.summary}"` : 'Resumo não informado.'}
          </p>
          {item.transcription && !expanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-black/80 to-transparent pointer-events-none" />
          )}
        </div>
        {item.keywords && item.keywords.length > 0 && (
          <p className="mb-4 text-xs font-medium text-gray-600 dark:text-gray-400">{item.keywords.slice(0, 4).map((keyword: string) => `#${keyword}`).join(' ')}</p>
        )}
        <div className="flex flex-col gap-4">
          {hasVideo ? (
            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 bg-black relative">
              {showVideo ? (
                <div className="relative w-full aspect-video bg-black">
                  <video controls className="w-full h-full object-contain" src={safeHttpUrl(item.urlVideo)}>
                    Seu navegador não suporta o elemento de vídeo.
                  </video>
                  <button type="button" onClick={() => setShowVideo(false)} aria-label="Fechar vídeo" className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors focus-visible:ring-4 focus-visible:ring-white/60">
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowVideo(true)} className="focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/60 w-full h-48 md:h-64 bg-gray-900 relative flex flex-col items-center justify-center hover:bg-gray-800 transition-colors">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-3">
                      <PlayCircle size={32} className="text-white fill-white/20 ml-1" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-white/90">Assistir ao discurso</span>
                  </div>
                </button>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
              <MonitorOff size={14} aria-hidden="true" /> Vídeo indisponível: a Câmara não forneceu o registro visual.
            </p>
          )}
          {hasAudio ? (
            <div className="rounded-2xl p-4 border bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-white/10 rounded-full text-blue-700 dark:text-blue-300 shrink-0"><Volume2 size={20} aria-hidden="true" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Áudio oficial</p>
                <audio controls className="w-full h-8" src={safeHttpUrl(item.urlAudio)}>Seu navegador não suporta áudio.</audio>
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
              <VolumeX size={14} aria-hidden="true" /> Áudio não captado.
            </p>
          )}
          <div className="flex gap-4 flex-wrap pt-2 border-t border-gray-100 dark:border-white/5">
            {item.transcription && (
              <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="focus-visible:ring-4 focus-visible:ring-blue-500/40 inline-flex items-center gap-2 min-h-[44px] rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline">
                <FileSearch size={14} aria-hidden="true" /> {expanded ? 'Recolher texto' : 'Ler íntegra'}
              </button>
            )}
            {safeHttpUrl(item.externalLink) && (
              <a href={safeHttpUrl(item.externalLink)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[44px] rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:underline focus-visible:ring-4 focus-visible:ring-blue-500/40 ml-auto">
                <ExternalLink size={14} aria-hidden="true" /> Fonte oficial
              </a>
            )}
          </div>
        </div>
      </article>
    );
  }

  return null;
};
