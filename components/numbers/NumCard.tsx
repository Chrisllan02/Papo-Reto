import React, { useId } from 'react';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { Skeleton } from '../Skeleton';

export const MUTED = 'text-[#4A5A70] dark:text-slate-300';
export const LINK_FOCUS = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:focus-visible:ring-spring';
export const CARD_SURFACE = 'bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_1px_2px_rgba(0,39,118,0.06),0_8px_24px_rgba(0,39,118,0.08)] dark:bg-white/5 dark:border-white/10 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.45)]';
export const TEXT_LINK = `inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-extrabold text-midnight underline underline-offset-4 hover:text-picture dark:text-white dark:hover:text-spring ${LINK_FOCUS}`;

interface NumCardProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const NumCard: React.FC<NumCardProps> = ({ icon: Icon, title, subtitle, action, className = '', children }) => {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`rounded-[28px] p-[18px] md:p-[22px] flex flex-col gap-3.5 min-w-0 ${CARD_SURFACE} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-midnight/[0.07] text-midnight dark:bg-white/10 dark:text-white">
            <Icon size={18} aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col">
            <h2 id={titleId} className="text-[17px] font-black leading-tight text-midnight dark:text-white">{title}</h2>
            {subtitle && <span className={`text-base font-semibold ${MUTED}`}>{subtitle}</span>}
          </span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
};

export const SourceLink: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Ver a fonte: ${label} (abre em nova aba)`} className={TEXT_LINK}>
    <ExternalLink size={15} aria-hidden="true" />
    Ver a fonte
  </a>
);

export const UNAVAILABLE_TEXT = 'Dados ainda não disponíveis.';

export const NumbersUnavailable: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <div className="flex flex-1 flex-col items-start justify-center gap-1">
    <p className="text-base font-bold text-midnight dark:text-white">{UNAVAILABLE_TEXT}</p>
    <SourceLink href={href} label={label} />
  </div>
);

export const NumbersSkeleton: React.FC = () => (
  <div role="status" className="flex flex-1 flex-col gap-3">
    <span className="sr-only">Carregando</span>
    <Skeleton className="h-10 w-1/2" />
    <Skeleton className="h-28 w-full" />
  </div>
);
