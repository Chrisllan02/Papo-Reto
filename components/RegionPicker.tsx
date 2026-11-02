import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Loader2, LocateFixed, X } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { useDialog } from '../hooks/useDialog';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { getRegionByUF, Region, REGION_STATES } from '../utils/regions';
import { STATE_NAMES } from '../utils/location';

interface RegionPickerProps {
  triggerClassName: string;
  triggerLabel: string;
  align?: 'left' | 'right';
  children: React.ReactNode;
}

const REGIONS = Object.keys(REGION_STATES) as Region[];
const OPTION_BASE = 'flex h-11 w-full items-center rounded-full px-3.5 text-left text-sm cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-nuit dark:focus-visible:ring-spring';

const nextIndex = (key: string, index: number, length: number) => {
  if (key === 'ArrowDown') return (index + 1) % length;
  if (key === 'ArrowUp') return (index - 1 + length) % length;
  if (key === 'Home') return 0;
  if (key === 'End') return length - 1;
  return -1;
};

interface PanelProps {
  isDesktop: boolean;
  align: 'left' | 'right';
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

const RegionPanel: React.FC<PanelProps> = ({ isDesktop, align, anchorRef, onClose }) => {
  const { state, actions } = useAppContext();
  const { userLocation, isLocating } = state;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const regionRefs = useRef<Partial<Record<Region, HTMLDivElement | null>>>({});
  const stateRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [region, setRegion] = useState<Region>(getRegionByUF(userLocation) ?? REGIONS[0]);
  const [step, setStep] = useState<'regions' | 'states'>('regions');
  const states = REGION_STATES[region];
  const tabbableState = states.includes(userLocation) ? userLocation : states[0];
  const showRegions = isDesktop || step === 'regions';
  const showStates = isDesktop || step === 'states';

  useDialog(panelRef, { onClose });

  useEffect(() => {
    if (!isDesktop) return;
    const handlePointer = (event: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [isDesktop, anchorRef, onClose]);

  const openStates = () => {
    setStep('states');
    requestAnimationFrame(() => stateRefs.current[tabbableState]?.focus());
  };

  const backToRegions = () => {
    setStep('regions');
    requestAnimationFrame(() => regionRefs.current[region]?.focus());
  };

  const chooseState = (uf: string) => {
    actions.updateUserLocation(uf);
    onClose();
  };

  const detectCurrent = async () => {
    await actions.detectLocation();
    onClose();
  };

  const handleRegionKey = (event: React.KeyboardEvent, index: number) => {
    const target = nextIndex(event.key, index, REGIONS.length);
    if (target >= 0) {
      event.preventDefault();
      setRegion(REGIONS[target]);
      regionRefs.current[REGIONS[target]]?.focus();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openStates();
    }
  };

  const handleStateKey = (event: React.KeyboardEvent, index: number, uf: string) => {
    const target = nextIndex(event.key, index, states.length);
    if (target >= 0) {
      event.preventDefault();
      stateRefs.current[states[target]]?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseState(uf);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      backToRegions();
    }
  };

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={isDesktop
        ? `absolute top-full mt-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'} w-[min(460px,calc(100vw-2rem))] rounded-[28px] border border-white/95 bg-white/[0.92] backdrop-blur-xl p-3.5 shadow-[0_20px_50px_rgba(0,39,118,0.25)] text-midnight dark:bg-slate-900/90 dark:border-white/10 dark:text-white dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-2.5`
        : 'fixed inset-x-0 bottom-0 z-[70] max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-white/95 backdrop-blur-xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-midnight shadow-[0_-10px_40px_rgba(0,39,118,0.25)] dark:bg-slate-900/95 dark:text-white flex flex-col gap-3'}
    >
      <div className={isDesktop ? 'sr-only' : 'flex items-center justify-between gap-2'}>
        {!isDesktop && step === 'states' ? (
          <button
            type="button"
            onClick={backToRegions}
            className="flex h-11 items-center gap-1.5 rounded-full px-3 -ml-1 text-sm font-bold hover:bg-midnight/[0.06] dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuit dark:focus-visible:ring-spring"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            Regiões
          </button>
        ) : null}
        <h2 id={titleId} className="text-lg font-black">
          {!isDesktop && step === 'states' ? region : 'Escolher estado'}
        </h2>
        {!isDesktop && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-midnight/[0.06] dark:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuit dark:focus-visible:ring-spring"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {showRegions && (
        <button
          type="button"
          onClick={() => void detectCurrent()}
          disabled={isLocating}
          className="flex h-12 items-center gap-2.5 rounded-full bg-midnight/[0.06] px-4 text-sm font-extrabold hover:bg-midnight/10 disabled:opacity-80 dark:bg-white/10 dark:hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nuit dark:focus-visible:ring-spring"
        >
          {isLocating ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
          {isLocating ? 'Localizando...' : 'Usar localização atual'}
        </button>
      )}

      <div className={isDesktop ? 'grid grid-cols-2 gap-2' : 'flex flex-col'}>
        {showRegions && (
          <div
            role="listbox"
            aria-label="Regiões"
            className={isDesktop ? 'flex flex-col gap-0.5 border-r border-midnight/[0.08] pr-2 dark:border-white/10' : 'flex flex-col gap-0.5'}
          >
            {REGIONS.map((name, index) => {
              const active = name === region;
              return (
                <div
                  key={name}
                  ref={el => { regionRefs.current[name] = el; }}
                  role="option"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onMouseEnter={() => isDesktop && setRegion(name)}
                  onFocus={() => setRegion(name)}
                  onClick={() => (isDesktop ? setRegion(name) : openStates())}
                  onKeyDown={event => handleRegionKey(event, index)}
                  className={`${OPTION_BASE} justify-between ${active ? 'bg-midnight text-white font-bold dark:bg-spring dark:text-midnight' : 'font-semibold hover:bg-midnight/[0.06] dark:hover:bg-white/10'}`}
                >
                  {name}
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              );
            })}
          </div>
        )}

        {showStates && (
          <div role="listbox" aria-label={`Estados da região ${region}`} className="flex flex-col gap-0.5 max-h-[60vh] overflow-y-auto">
            {states.map((uf, index) => {
              const selected = uf === userLocation;
              return (
                <div
                  key={uf}
                  ref={el => { stateRefs.current[uf] = el; }}
                  role="option"
                  aria-selected={selected}
                  tabIndex={uf === tabbableState ? 0 : -1}
                  onClick={() => chooseState(uf)}
                  onKeyDown={event => handleStateKey(event, index, uf)}
                  className={`${OPTION_BASE} gap-2.5 ${selected ? 'bg-spring/40 font-bold dark:bg-spring/20' : 'font-semibold hover:bg-midnight/[0.06] dark:hover:bg-white/10'}`}
                >
                  <span className="w-[30px] text-xs font-black text-[#4A5A70] dark:text-slate-300">{uf}</span>
                  {STATE_NAMES[uf] ?? uf}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (isDesktop) return panel;
  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-0 z-[65] bg-black/60" onClick={onClose} />
      {panel}
    </>,
    document.body,
  );
};

const RegionPicker: React.FC<RegionPickerProps> = ({ triggerClassName, triggerLabel, align = 'right', children }) => {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const anchorRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClassName}
      >
        {children}
      </button>
      {open && <RegionPanel key={isDesktop ? 'popover' : 'sheet'} isDesktop={isDesktop} align={align} anchorRef={anchorRef} onClose={close} />}
    </div>
  );
};

export default RegionPicker;
