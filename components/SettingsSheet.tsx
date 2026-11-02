import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';
import AccessibilityControls from './AccessibilityControls';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

const DESKTOP_QUERY = '(min-width: 768px)';

const SettingsSheet: React.FC<SettingsSheetProps> = ({ open, onClose }) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (sheetRef.current) (sheetRef.current as HTMLDivElement & { inert: boolean }).inert = !open;
  }, [open]);

  useEffect(() => {
      if (!open || typeof window.matchMedia !== 'function') return;
      const media = window.matchMedia(DESKTOP_QUERY);
      if (media.matches) {
          onClose();
          return;
      }
      const handleChange = (event: MediaQueryListEvent) => {
          if (event.matches) onClose();
      };
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
  }, [open, onClose]);

  useDialog(sheetRef, { onClose, active: open });

  return (
    <>
        <div
            id="menu-movel"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-movel-titulo"
            aria-hidden={!open}
            className={`md:hidden fixed inset-x-0 bottom-0 z-[60] glass-panel rounded-t-3xl transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-[110%]'}`}
            style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 id="menu-movel-titulo" className="text-lg font-black text-midnight dark:text-white">Acessibilidade</h3>
                    <button type="button" onClick={onClose} aria-label="Fechar acessibilidade" className="w-11 h-11 flex items-center justify-center bg-slate-100 dark:bg-white/10 rounded-full text-muted-strong focus-visible:ring-4 focus-visible:ring-blue-500/40">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <div className="h-px bg-slate-200/70 dark:bg-white/10 w-full"></div>

                <AccessibilityControls onStartTour={onClose} />
            </div>
        </div>

        {open && (
            <div
                aria-hidden="true"
                className="md:hidden fixed inset-0 z-[55] bg-black/60 transition-opacity"
                onClick={onClose}
            />
        )}
    </>
  );
};

export default SettingsSheet;
