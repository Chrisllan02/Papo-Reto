import React, { useEffect, useRef, useState } from 'react';
import { Accessibility } from 'lucide-react';
import AccessibilityControls from './AccessibilityControls';

interface AppearancePopoverProps {
  buttonClassName: string;
}

const AppearancePopover: React.FC<AppearancePopoverProps> = ({ buttonClassName }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
      if (!open) return;
      const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
              setOpen(false);
          }
      };
      const handleEscape = (event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          setOpen(false);
          buttonRef.current?.focus();
      };
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          document.removeEventListener('keydown', handleEscape);
      };
  }, [open]);

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget as Node | null;
      if (next && !event.currentTarget.contains(next)) setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative" onBlur={handleBlur}>
        <button
            type="button"
            ref={buttonRef}
            onClick={() => setOpen(prev => !prev)}
            className={`${buttonClassName} ${open ? 'bg-white/15' : ''}`}
            aria-label="Acessibilidade"
            aria-expanded={open}
            aria-controls={open ? 'menu-aparencia' : undefined}
        >
            <Accessibility size={20} aria-hidden="true" />
        </button>

        {open && (
            <div id="menu-aparencia" className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] glass-panel rounded-2xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2 fade-in z-50 max-h-[70vh] overflow-y-auto overflow-x-hidden overscroll-contain text-midnight dark:text-praxeti">
                <div className="pb-2 border-b border-gray-100 dark:border-white/10">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Acessibilidade</span>
                    <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-400">Tamanho do texto, contraste, tema e ajuda.</p>
                </div>
                <AccessibilityControls onStartTour={() => setOpen(false)} />
            </div>
        )}
    </div>
  );
};

export default AppearancePopover;
