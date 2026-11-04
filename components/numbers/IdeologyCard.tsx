import React, { useId, useState } from 'react';
import { Info, SlidersHorizontal } from 'lucide-react';
import { formatInteger, formatPercent } from '../../utils/numbersStats';
import { IDEOLOGY_COLORS, IDEOLOGY_TEXT, IdeologyKey } from './ideology';
import { MUTED, NumCard, TEXT_LINK } from './NumCard';

interface IdeologyCardProps {
  counts: Record<'Esquerda' | 'Centro' | 'Direita', number>;
  total: number;
}

const KEYS: IdeologyKey[] = ['Esquerda', 'Centro', 'Direita'];

const IdeologyCard: React.FC<IdeologyCardProps> = ({ counts, total }) => {
  const [open, setOpen] = useState(false);
  const noteId = useId();
  const classified = KEYS.reduce((sum, key) => sum + counts[key as keyof typeof counts], 0);
  const unclassified = Math.max(total - classified, 0);
  const items: { key: IdeologyKey; seats: number }[] = [
    ...KEYS.map(key => ({ key, seats: counts[key as keyof typeof counts] })),
    ...(unclassified > 0 ? [{ key: 'Sem classificação' as IdeologyKey, seats: unclassified }] : []),
  ];

  return (
    <NumCard icon={SlidersHorizontal} title="Espectro político" subtitle="Esquerda, centro ou direita" className="flex-1">
      {total === 0 ? (
        <p className="text-base font-bold text-midnight dark:text-white">Dados ainda não disponíveis.</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={items.map(item => `${item.key} ${item.seats}`).join(', ')}
            className="flex h-[18px] gap-[3px] overflow-hidden rounded-full"
          >
            {items.map(item => (
              <span key={item.key} style={{ flex: `${item.seats} 1 0`, backgroundColor: IDEOLOGY_COLORS[item.key], minWidth: 3 }} />
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {items.map(item => (
              <li key={item.key} className={`flex flex-col ${item.key === 'Sem classificação' ? 'col-span-3 flex-row items-baseline gap-2' : ''}`}>
                <span className={`text-[22px] font-black ${IDEOLOGY_TEXT[item.key]}`}>{formatPercent((item.seats / total) * 100)}</span>
                <span className={`text-sm font-bold ${MUTED}`}>{item.key} · {formatInteger(item.seats)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" aria-expanded={open} aria-controls={noteId} onClick={() => setOpen(!open)} className={`${TEXT_LINK} self-start`}>
        <Info size={15} aria-hidden="true" />
        Como classificamos
      </button>
      {open && (
        <p id={noteId} className={`text-base font-medium leading-relaxed ${MUTED}`}>
          Cada partido entra em esquerda, centro ou direita numa lista fixa do Papo Reto. Partido que ainda não está na lista aparece como sem classificação.
        </p>
      )}
    </NumCard>
  );
};

export default IdeologyCard;
