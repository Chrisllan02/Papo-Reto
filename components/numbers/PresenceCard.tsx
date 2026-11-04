import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { CongressNumbersState } from '../../hooks/useCongressNumbers';
import { formatInteger, monthLabel, SOURCE_PAGES } from '../../utils/numbersStats';
import { MUTED, NumbersSkeleton, NumbersUnavailable, NumCard, SourceLink } from './NumCard';

const RING_RADIUS = 50;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const BAR_AREA = 'h-[120px]';

const PresenceCard: React.FC<{ numbers: CongressNumbersState }> = ({ numbers }) => {
  const presence = numbers.data?.presence ?? null;
  const subtitle = presence ? `Câmara, em ${presence.year}` : 'Câmara';
  const average = presence ? Math.round(presence.averagePct) : 0;

  return (
    <NumCard icon={CheckCircle2} title="Presença nas votações" subtitle={subtitle}>
      {numbers.status === 'loading' && <NumbersSkeleton />}
      {numbers.status !== 'loading' && !presence && (
        <NumbersUnavailable href={SOURCE_PAGES.presence} label="presença nas votações" />
      )}
      {presence && numbers.data && (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row">
            <div className="relative h-[140px] w-[140px] shrink-0">
              <svg viewBox="0 0 120 120" width="140" height="140" role="img" aria-label={`${average}% de presença média`}>
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="12" stroke="currentColor" className="text-[#E3EAF6] dark:text-white/15" />
                <circle
                  cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="12" stroke="currentColor" strokeLinecap="round"
                  strokeDasharray={`${(presence.averagePct / 100) * RING_LENGTH} ${RING_LENGTH}`}
                  transform="rotate(-90 60 60)" className="text-midnight dark:text-spring"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[32px] font-black leading-none text-midnight dark:text-white">{average}%</span>
                <span className={`mt-1 text-center text-sm font-bold leading-tight ${MUTED}`}>média<br />do ano</span>
              </div>
            </div>
            <div
              role="img"
              aria-label={`Presença média por mês, de 0% a 100%: ${presence.months.map(item => `${monthLabel(item.month)} ${Math.round(item.pct)}%`).join(', ')}`}
              className="flex w-full min-w-0 flex-1 gap-1 self-center overflow-x-auto"
            >
              {presence.months.map(item => (
                <div key={item.month} className="flex min-w-[34px] flex-1 flex-col items-center gap-1">
                  <span className="whitespace-nowrap text-sm font-extrabold tracking-tight text-midnight dark:text-white">{formatInteger(Math.round(item.pct))}%</span>
                  <div className={`flex w-full items-end ${BAR_AREA}`}>
                    <span className="block w-full rounded-t-md bg-midnight dark:bg-spring" style={{ height: `${Math.min(Math.max(item.pct, 0), 100)}%` }} />
                  </div>
                  <span className="text-sm font-extrabold text-midnight dark:text-white">{monthLabel(item.month)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <SourceLink href={SOURCE_PAGES.presence} label="presença nas votações" />
          </div>
        </>
      )}
    </NumCard>
  );
};

export default PresenceCard;
