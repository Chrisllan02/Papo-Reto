import React, { useEffect, useRef } from 'react';
import { ArrowRight, ChevronRight, Heart } from 'lucide-react';
import { Politician } from '../../types';
import { prefetchPoliticianProfile } from '../../services/camaraApi';
import { CARD_SURFACE, LINK_FOCUS, MUTED } from '../numbers/NumCard';

interface PoliticianCardProps {
  pol: Politician;
  onSelect: (pol: Politician) => void;
  isFollowing: boolean;
  variant: 'card' | 'row';
  showState: boolean;
}

const PREFETCH_DELAY_MS = 250;

const PoliticianCard: React.FC<PoliticianCardProps> = ({ pol, onSelect, isFollowing, variant, showState }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPrefetch = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const schedulePrefetch = () => {
    cancelPrefetch();
    timerRef.current = setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => prefetchPoliticianProfile(pol));
      } else {
        prefetchPoliticianProfile(pol);
      }
    }, PREFETCH_DELAY_MS);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handlers = {
    onClick: () => onSelect(pol),
    onMouseEnter: schedulePrefetch,
    onMouseLeave: cancelPrefetch,
    onFocus: schedulePrefetch,
    onBlur: cancelPrefetch,
  };
  const label = `Ver perfil de ${pol.name}, ${pol.party} do ${pol.state}${isFollowing ? ', você segue' : ''}`;

  const photo = (size: string) => (
    <span className={`relative shrink-0 ${size}`}>
      <img src={pol.photo} alt="" loading="lazy" className="h-full w-full rounded-full border-2 border-white bg-slate-200 object-cover object-top shadow-[0_4px_12px_rgba(0,39,118,0.18)] dark:border-white/20" />
      {isFollowing && (
        <span className="absolute -left-1 -top-1 rounded-full border-2 border-white bg-orange-700 p-1 dark:border-slate-900">
          <Heart size={12} className="fill-white text-white" aria-hidden="true" />
        </span>
      )}
    </span>
  );

  if (variant === 'row') {
    return (
      <button
        type="button"
        aria-label={label}
        {...handlers}
        className={`flex h-full w-full items-center gap-3 px-3 text-left text-midnight dark:text-white ${LINK_FOCUS} focus-visible:ring-inset`}
      >
        {photo('h-12 w-12')}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-extrabold">{pol.name}</span>
          <span className={`truncate text-sm font-semibold ${MUTED}`}>
            {[pol.party, showState ? pol.state : '', pol.role].filter(Boolean).join(' · ')}
          </span>
        </span>
        <ChevronRight size={18} aria-hidden="true" className="shrink-0 opacity-60" />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      {...handlers}
      className={`flex h-full w-full items-center gap-3 rounded-3xl px-3.5 text-left text-midnight transition-shadow hover:shadow-[0_12px_32px_rgba(0,39,118,0.16)] dark:text-white ${CARD_SURFACE} ${LINK_FOCUS}`}
    >
      {photo('h-[52px] w-[52px]')}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-extrabold">{pol.name}</span>
        <span className="flex gap-1.5">
          <span className="inline-flex h-7 items-center rounded-full bg-midnight/[0.07] px-2.5 text-sm font-extrabold dark:bg-white/10">{pol.party}</span>
          {showState && <span className="inline-flex h-7 items-center rounded-full bg-midnight/[0.07] px-2.5 text-sm font-extrabold dark:bg-white/10">{pol.state}</span>}
        </span>
      </span>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight/[0.07] dark:bg-white/10">
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </button>
  );
};

export default PoliticianCard;
