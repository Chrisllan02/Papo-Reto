import React, { useMemo } from 'react';
import { Users, Scale, ShieldCheck, Info, Globe, Building2, Landmark, ArrowDown } from 'lucide-react';
import { Politician, Party } from '../types';
import { computePartyStats } from '../utils/partyStats';
import { useCongressNumbers } from '../hooks/useCongressNumbers';
import { formatInteger, formatNumbersDate, formatPercent, seatsByRegion, womenShare, isSenator } from '../utils/numbersStats';
import SeatsByParty from '../components/numbers/SeatsByParty';
import IdeologyCard from '../components/numbers/IdeologyCard';
import WomenCard from '../components/numbers/WomenCard';
import RegionSeatsCard from '../components/numbers/RegionSeatsCard';
import PresenceCard from '../components/numbers/PresenceCard';
import QuotaCard from '../components/numbers/QuotaCard';
import { CARD_SURFACE, LINK_FOCUS, MUTED } from '../components/numbers/NumCard';

interface PartiesDashboardViewProps {
  politicians: Politician[];
  parties?: Party[];
  onSelectCandidate?: (pol: Politician) => void;
}

const GovernmentStructureFlow = () => {
    const powers = [
        {
            title: 'Poder Executivo',
            lead: 'Presidente e ministérios',
            description: 'Administra o governo, executa as leis e conduz políticas públicas.',
            icon: Building2,
            accent: 'text-blue-700 dark:text-blue-300',
            iconStyle: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
            borderStyle: 'border-blue-200/80 dark:border-blue-500/20',
        },
        {
            title: 'Poder Legislativo',
            lead: 'Câmara e Senado',
            description: 'Cria leis, aprova o orçamento e fiscaliza as ações do Executivo.',
            icon: Landmark,
            accent: 'text-emerald-700 dark:text-emerald-300',
            iconStyle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
            borderStyle: 'border-emerald-200/80 dark:border-emerald-500/20',
        },
        {
            title: 'Poder Judiciário',
            lead: 'Tribunais e STF',
            description: 'Aplica as leis, resolve conflitos e protege a Constituição.',
            icon: Scale,
            accent: 'text-slate-700 dark:text-slate-200',
            iconStyle: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
            borderStyle: 'border-slate-200/80 dark:border-white/10',
        },
    ];

    return (
        <section className="glass-panel rounded-2xl p-6 md:p-8 overflow-hidden" aria-labelledby="government-structure-title">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                    <p className="text-sm font-black text-blue-600 dark:text-blue-300 mb-2">Mapa do Estado brasileiro</p>
                    <h2 id="government-structure-title" className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                        Como o Brasil funciona
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">
                        O poder político parte do povo e é exercido por instituições com responsabilidades diferentes.
                    </p>
                </div>
                <div className="flex max-w-md items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-bold leading-relaxed text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
                    <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>O presidente lidera o Executivo, mas não é chefe dos outros poderes.</span>
                </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
                <div className="flex min-w-[220px] items-center justify-center gap-3 rounded-2xl bg-blue-700 px-6 py-4 text-white dark:bg-blue-600">
                    <Users size={22} aria-hidden="true" />
                    <div>
                        <p className="text-base font-black leading-none">Povo</p>
                        <p className="mt-1 text-sm font-bold text-blue-100">Origem do poder político</p>
                    </div>
                </div>

                <div className="flex h-14 flex-col items-center justify-center text-blue-400 dark:text-blue-300" aria-hidden="true">
                    <div className="h-7 w-px bg-blue-300 dark:bg-blue-500/50" />
                    <ArrowDown size={18} strokeWidth={2.5} />
                </div>

                <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
                    {powers.map(({ title, lead, description, icon: Icon, accent, iconStyle, borderStyle }) => (
                        <article key={title} className={`rounded-2xl border bg-white/70 p-5 dark:bg-white/5 ${borderStyle}`}>
                            <div className="flex items-start gap-4">
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
                                    <Icon size={21} aria-hidden="true" />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-black ${accent}`}>{title}</h3>
                                    <p className="mt-1 text-base font-black text-gray-900 dark:text-white">{lead}</p>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-300">{description}</p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="mt-5 flex w-full items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-4 py-3 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm font-bold leading-relaxed">
                        Os três poderes são independentes e se fiscalizam por meio de freios e contrapesos.
                    </p>
                </div>
            </div>

            <div className="mt-6 border-t border-gray-200/70 pt-5 dark:border-white/10">
                <div className="flex items-center gap-2 text-sm font-black text-gray-600 dark:text-gray-300">
                    <Globe size={15} aria-hidden="true" />
                    Onde as decisões chegam
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ['União', 'Questões nacionais'],
                        ['Estados e DF', 'Questões regionais'],
                        ['Municípios', 'Serviços locais'],
                    ].map(([title, description]) => (
                        <div key={title} className="rounded-xl bg-gray-100/80 px-4 py-3 dark:bg-white/5">
                            <p className="text-sm font-black text-gray-900 dark:text-white">{title}</p>
                            <p className="mt-1 text-sm font-bold text-gray-600 dark:text-gray-400">{description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const StatCard: React.FC<{ value: string; label: string; detail: string; highlight?: boolean }> = ({ value, label, detail, highlight }) => (
  <div className={`flex min-w-0 flex-col gap-0.5 rounded-3xl px-4 py-3.5 md:px-[18px] md:py-4 ${highlight ? 'border border-midnight bg-midnight text-white shadow-[0_1px_2px_rgba(0,39,118,0.12),0_10px_30px_rgba(0,39,118,0.25)]' : `${CARD_SURFACE} text-midnight dark:text-white`}`}>
    <span className="text-[26px] font-black leading-tight tracking-tight md:text-[30px]">{value}</span>
    <span className="text-sm font-extrabold">{label}</span>
    <span className={`text-sm font-semibold ${highlight ? 'text-white/80' : MUTED}`}>{detail}</span>
  </div>
);

const PartiesDashboardView: React.FC<PartiesDashboardViewProps> = ({ politicians }) => {
  const numbers = useCongressNumbers();
  const { partyStats, ideologyStats } = useMemo(() => computePartyStats(politicians), [politicians]);
  const women = useMemo(() => womenShare(politicians), [politicians]);
  const units = useMemo(() => seatsByRegion(politicians).states.length, [politicians]);
  const senators = useMemo(() => politicians.filter(isSenator).length, [politicians]);
  const date = numbers.data ? formatNumbersDate(numbers.data.generatedAt) : '';

  return (
    <div className="w-full h-full bg-gradient-to-b from-praxeti via-[#EEF3FA] to-[#E6F3EA] dark:bg-none dark:bg-transparent font-sans overflow-y-auto pb-24 md:pb-12">
      <div className="px-4 md:px-8 py-6 md:py-10 max-w-[1800px] mx-auto flex flex-col gap-4 md:gap-5 px-safe">
        <div>
          <h1 className="text-[26px] md:text-4xl font-black tracking-tight text-midnight dark:text-white">Números do Congresso</h1>
          <p className={`text-sm md:text-base font-semibold ${MUTED}`}>Quem ocupa as cadeiras hoje</p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard highlight value={formatInteger(politicians.length)} label="parlamentares" detail={`${formatInteger(politicians.length - senators)} Câmara · ${formatInteger(senators)} Senado`} />
          <StatCard value={formatInteger(partyStats.length)} label="partidos" detail="no Congresso" />
          <StatCard value={formatInteger(women.women)} label="mulheres" detail={women.pct === null ? 'sem dados' : formatPercent(women.pct)} />
          <StatCard value={formatInteger(units)} label="unidades" detail="estados e DF" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr] lg:items-stretch">
          <SeatsByParty politicians={politicians} />
          <div className="flex flex-col gap-4">
            <IdeologyCard counts={{ Esquerda: ideologyStats.Esquerda, Centro: ideologyStats.Centro, Direita: ideologyStats.Direita }} total={politicians.length} />
            <WomenCard politicians={politicians} />
          </div>
        </div>

        <RegionSeatsCard politicians={politicians} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
          <PresenceCard numbers={numbers} />
          <QuotaCard numbers={numbers} />
        </div>

        <p className={`text-sm font-semibold ${MUTED}`}>
          Fonte:{' '}
          <a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center rounded-lg font-bold underline underline-offset-4 ${LINK_FOCUS}`}>Câmara</a>
          {' '}e{' '}
          <a href="https://www12.senado.leg.br/dados-abertos" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center rounded-lg font-bold underline underline-offset-4 ${LINK_FOCUS}`}>Senado</a>
          {date && ` · ${date}`}
        </p>

        <GovernmentStructureFlow />
      </div>
    </div>
  );
};

export default PartiesDashboardView;
