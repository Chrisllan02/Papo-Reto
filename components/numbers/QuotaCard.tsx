import React from 'react';
import { Banknote } from 'lucide-react';
import type { CongressNumbersState } from '../../hooks/useCongressNumbers';
import { formatMillions, formatPercent, formatThousands, SOURCE_PAGES } from '../../utils/numbersStats';
import { MUTED, NumbersSkeleton, NumbersUnavailable, NumCard, SourceLink } from './NumCard';

const QuotaCard: React.FC<{ numbers: CongressNumbersState }> = ({ numbers }) => {
  const quota = numbers.data?.quota ?? null;
  const subtitle = quota ? `Gasto dos deputados em ${quota.year}` : 'Gasto dos deputados';

  return (
    <NumCard icon={Banknote} title="Cota parlamentar" subtitle={subtitle}>
      {numbers.status === 'loading' && <NumbersSkeleton />}
      {numbers.status !== 'loading' && !quota && (
        <NumbersUnavailable href={SOURCE_PAGES.quota} label="cota parlamentar" />
      )}
      {quota && numbers.data && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[28px] font-black leading-tight text-midnight dark:text-white">{formatMillions(quota.total)}</span>
            <span className={`text-base font-bold ${MUTED}`}>≈ {formatThousands(quota.perSeatMonthly)} por deputado ao mês</span>
          </div>
          <ul className="flex flex-1 flex-col justify-between gap-2.5">
            {quota.topCategories.map(category => (
              <li key={category.key} className="flex flex-col gap-1">
                <div className="flex justify-between text-sm font-extrabold text-midnight dark:text-white">
                  <span>{category.label}</span>
                  <span>{formatPercent(category.pct)}</span>
                </div>
                <span className="h-2.5 overflow-hidden rounded-full bg-midnight/[0.07] dark:bg-white/10" aria-hidden="true">
                  <span className="block h-full rounded-full bg-midnight dark:bg-spring" style={{ width: `${category.pct}%` }} />
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <SourceLink href={SOURCE_PAGES.quota} label="cota parlamentar" />
          </div>
        </>
      )}
    </NumCard>
  );
};

export default QuotaCard;
