import React, { useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { Politician } from '../../types';
import { getIdeology } from '../../services/camaraApi';
import { computePartyStats } from '../../utils/partyStats';
import { layoutHemicycle, HEMICYCLE_HEIGHT, HEMICYCLE_WIDTH } from '../../utils/hemicycle';
import { Chamber, filterByChamber, formatInteger } from '../../utils/numbersStats';
import { IDEOLOGY_COLORS, IDEOLOGY_TEXT, IdeologyKey, ideologyKey } from './ideology';
import { LINK_FOCUS, MUTED, NumCard, TEXT_LINK } from './NumCard';

const VISIBLE_PARTIES = 12;
const TABS: { id: Chamber; label: string }[] = [
  { id: 'congresso', label: 'Congresso' },
  { id: 'camara', label: 'Câmara' },
  { id: 'senado', label: 'Senado' },
];
const GROUP_ORDER: IdeologyKey[] = ['Esquerda', 'Centro', 'Direita', 'Sem classificação'];

const SeatsByParty: React.FC<{ politicians: Politician[] }> = ({ politicians }) => {
  const [chamber, setChamber] = useState<Chamber>('congresso');
  const [selected, setSelected] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const subset = useMemo(() => filterByChamber(politicians, chamber), [politicians, chamber]);
  const parties = useMemo(
    () => computePartyStats(subset).partyStats.map(party => ({ name: party.name, seats: party.totalMembers, group: ideologyKey(getIdeology(party.name)) })),
    [subset],
  );
  const total = subset.length;

  const bySeats = useMemo(() => [...parties].sort((a, b) => b.seats - a.seats || a.name.localeCompare(b.name)), [parties]);
  const dotParty = useMemo(() => {
    const ordered = [...parties].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || b.seats - a.seats || a.name.localeCompare(b.name));
    return ordered.flatMap(party => Array.from({ length: party.seats }, () => party));
  }, [parties]);
  const dots = useMemo(() => layoutHemicycle(total), [total]);

  const groupSeats = GROUP_ORDER.map(group => ({ group, seats: parties.filter(p => p.group === group).reduce((sum, p) => sum + p.seats, 0) }));
  const description = `${total} cadeiras: ${groupSeats.filter(g => g.seats > 0).map(g => `${g.seats} ${g.group === 'Sem classificação' ? 'sem classificação' : `de ${g.group.toLowerCase()}`}`).join(', ')}`;
  const selectedParty = selected ? parties.find(party => party.name === selected) : undefined;
  const maxSeats = bySeats[0]?.seats || 1;
  const visible = showAll ? bySeats : bySeats.slice(0, VISIBLE_PARTIES);

  const changeChamber = (next: Chamber) => {
    setChamber(next);
    setSelected(null);
    setShowAll(false);
  };

  const tabs = (
    <div role="group" aria-label="Escolher casa" className="inline-flex gap-1 rounded-full bg-midnight/[0.07] p-1 dark:bg-white/10">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          aria-pressed={chamber === tab.id}
          onClick={() => changeChamber(tab.id)}
          className={`min-h-11 rounded-full px-4 text-sm transition-colors ${LINK_FOCUS} ${
            chamber === tab.id
              ? 'bg-white font-extrabold text-midnight shadow-[0_2px_8px_rgba(0,39,118,0.12)] dark:bg-spring'
              : 'bg-transparent font-semibold text-midnight dark:text-white'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <NumCard icon={Landmark} title="Cadeiras por partido" subtitle="Clique num partido" action={tabs}>
      {total === 0 ? (
        <p className="text-base font-bold text-midnight dark:text-white">Dados ainda não disponíveis.</p>
      ) : (
        <>
          <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative w-full max-w-[680px]">
                <svg viewBox={`0 0 ${HEMICYCLE_WIDTH} ${HEMICYCLE_HEIGHT}`} width="100%" role="img" aria-label={description}>
                  {dots.map((dot, index) => {
                    const party = dotParty[index];
                    const dimmed = selected !== null && party?.name !== selected;
                    return (
                      <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={IDEOLOGY_COLORS[party?.group ?? 'Sem classificação']} opacity={dimmed ? 0.18 : 1} />
                    );
                  })}
                </svg>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center leading-none" aria-hidden="true">
                  <span className="text-[32px] font-black text-midnight dark:text-white">{formatInteger(selectedParty ? selectedParty.seats : total)}</span>
                  <span className={`mt-1 text-sm font-bold ${MUTED}`}>{selectedParty ? selectedParty.name : 'cadeiras'}</span>
                </div>
              </div>
              <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {groupSeats.filter(item => item.seats > 0).map(item => (
                  <li key={item.group} className="flex items-center gap-1.5 text-sm font-bold text-midnight dark:text-white">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: IDEOLOGY_COLORS[item.group] }} aria-hidden="true" />
                    {item.group}
                    <span className={IDEOLOGY_TEXT[item.group]}>{formatInteger(item.seats)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <ul
              id="lista-partidos"
              className={`flex flex-col ${showAll ? 'max-h-[30rem] overflow-y-auto' : ''}`}
              {...(showAll ? { tabIndex: 0, 'aria-label': 'Lista de todos os partidos' } : {})}
            >
              {visible.map(party => (
                <li key={party.name} className="flex flex-1">
                  <button
                    type="button"
                    aria-pressed={selected === party.name}
                    onClick={() => setSelected(selected === party.name ? null : party.name)}
                    className={`flex min-h-11 w-full flex-1 items-center gap-2.5 rounded-2xl px-2 py-1.5 text-left text-midnight transition-colors dark:text-white ${LINK_FOCUS} ${selected === party.name ? 'bg-midnight/[0.08] dark:bg-white/15' : 'hover:bg-midnight/[0.04] dark:hover:bg-white/10'}`}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: IDEOLOGY_COLORS[party.group] }} aria-hidden="true" />
                    <span className="min-w-[7.5rem] shrink-0 whitespace-nowrap text-sm font-extrabold">{party.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-midnight/[0.07] dark:bg-white/10" aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${(party.seats / maxSeats) * 100}%`, backgroundColor: IDEOLOGY_COLORS[party.group] }} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-sm font-extrabold">{formatInteger(party.seats)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {bySeats.length > VISIBLE_PARTIES && (
            <button type="button" aria-expanded={showAll} aria-controls="lista-partidos" onClick={() => setShowAll(!showAll)} className={`${TEXT_LINK} self-end`}>
              {showAll ? 'Ver menos partidos' : `Ver os ${bySeats.length} partidos`}
            </button>
          )}
        </>
      )}
    </NumCard>
  );
};

export default SeatsByParty;
