import React, { useId, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Politician } from '../../types';
import { STATE_NAMES } from '../../utils/location';
import { formatInteger, formatPercent, seatsByRegion } from '../../utils/numbersStats';
import { MUTED, NumCard, TEXT_LINK } from './NumCard';

const REGION_TONES = ['#002776', '#1D4FA8', '#3F7AD6', '#7FA8E8', '#BFD3F4'];
const SWATCH = 'h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/40';

const RegionSeatsCard: React.FC<{ politicians: Politician[] }> = ({ politicians }) => {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { total, regions, states } = useMemo(() => seatsByRegion(politicians), [politicians]);

  return (
    <NumCard icon={MapPin} title="Cadeiras por região" subtitle="Onde estão as cadeiras">
      {total === 0 ? (
        <p className="text-base font-bold text-midnight dark:text-white">Dados ainda não disponíveis.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`Cadeiras por região: ${regions.map(item => `${item.region} ${item.seats}`).join(', ')}`}
            className="my-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
          >
            {regions.map((item, index) => (
              <span key={item.region} style={{ flex: `${item.seats} 1 0`, backgroundColor: REGION_TONES[index] }} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-5 md:gap-x-8">
            {regions.map((item, index) => (
              <li key={item.region} className="flex min-w-0 flex-col gap-1.5">
                <span className="flex items-center gap-2 text-sm font-extrabold text-midnight dark:text-white">
                  <span className={SWATCH} style={{ backgroundColor: REGION_TONES[index] }} aria-hidden="true" />
                  {item.region}
                </span>
                <span className="text-[28px] font-extrabold leading-tight text-midnight dark:text-white">{formatInteger(item.seats)}</span>
                <span className={`text-sm font-bold ${MUTED}`}>{formatPercent(item.pct)}</span>
              </li>
            ))}
          </ul>
          {open && (
            <ul id={listId} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {states.map(state => (
                <li key={state.uf} className="flex items-center justify-between gap-2 rounded-2xl bg-midnight/[0.05] px-3 py-2 text-sm font-bold text-midnight dark:bg-white/10 dark:text-white">
                  <span className="truncate">{STATE_NAMES[state.uf] ?? state.uf}</span>
                  <span className="font-black">{formatInteger(state.seats)}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" aria-expanded={open} aria-controls={open ? listId : undefined} onClick={() => setOpen(!open)} className={`${TEXT_LINK} self-end`}>
            {open ? 'Esconder cadeiras por estado' : 'Ver cadeiras por estado'}
          </button>
        </>
      )}
    </NumCard>
  );
};

export default RegionSeatsCard;
