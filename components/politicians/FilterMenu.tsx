import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FILTER_BUTTON = 'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-white/90 bg-white/75 px-3.5 md:px-4 text-sm font-semibold text-midnight shadow-[0_1px_3px_rgba(0,39,118,0.08)] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-spring';

export interface FilterOption {
  value: string;
  label: string;
  ariaLabel?: string;
}

interface FilterMenuProps {
  label: string;
  ariaLabel: string;
  valueLabel: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  gridClassName?: string;
  panelClassName?: string;
}

const FilterMenu: React.FC<FilterMenuProps> = ({ label, ariaLabel, valueLabel, value, options, onChange, gridClassName = 'grid-cols-1', panelClassName = 'md:w-80' }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = value !== '';

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="md:relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={active ? `${ariaLabel}: ${valueLabel}` : ariaLabel}
        className={FILTER_BUTTON}
      >
        <span aria-hidden="true">
          <span className="hidden md:inline">{active ? `${label}: ${valueLabel}` : label}</span>
          <span className="md:hidden">{active ? valueLabel : label}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" className={`opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={ariaLabel}
          className={`absolute left-0 top-full z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-2.5 shadow-[0_12px_40px_rgba(0,39,118,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-midnight/95 ${panelClassName}`}
        >
          <div className={`grid gap-1 ${gridClassName}`}>
            {options.map(option => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value || 'todos'}
                  type="button"
                  aria-pressed={selected}
                  aria-label={option.ariaLabel}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`min-h-11 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-nuit dark:focus-visible:ring-spring ${
                    selected
                      ? 'bg-midnight text-white dark:bg-white dark:text-midnight'
                      : 'bg-midnight/[0.05] text-midnight hover:bg-midnight/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterMenu;
