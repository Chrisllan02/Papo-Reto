import React, { useId } from 'react';
import { Sun, Moon, HelpCircle, Eye, Type, ChevronRight, Plus, Minus } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
    <div aria-hidden="true" className={`w-8 h-4 rounded-full relative transition-colors ${on ? 'bg-nuit' : 'bg-gray-300 dark:bg-white/20'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`}></div>
    </div>
);

const FONT_BUTTON = 'min-h-11 min-w-11 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-lg disabled:opacity-30 transition-all focus-visible:ring-4 focus-visible:ring-blue-500/40';
const ROW = 'flex items-center justify-between p-3 rounded-xl transition-colors w-full text-left focus-visible:ring-4 focus-visible:ring-blue-500/40';

interface AccessibilityControlsProps {
  onStartTour: () => void;
}

const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({ onStartTour }) => {
  const { state, actions } = useAppContext();
  const { darkMode, highContrast, fontSizeLevel } = state;
  const isDarkModeOn = darkMode && !highContrast;
  const darkModeReasonId = useId();

  return (
    <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between p-3 rounded-xl w-full">
            <div className="flex items-center gap-3">
                <Type size={18} className="text-nuit dark:text-blue-400" aria-hidden="true" />
                <span className="text-sm font-bold text-gray-800 dark:text-white">Fonte</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-1">
                <button type="button" onClick={actions.decreaseFontSize} disabled={fontSizeLevel <= 0.9} className={FONT_BUTTON} aria-label="Diminuir fonte">
                    <Minus size={16} aria-hidden="true" />
                </button>
                <span className="text-xs font-semibold w-10 text-center tabular-nums text-gray-600 dark:text-gray-300">
                    {Math.round(fontSizeLevel * 100)}%
                </span>
                <button type="button" onClick={actions.increaseFontSize} disabled={fontSizeLevel >= 1.5} className={FONT_BUTTON} aria-label="Aumentar fonte">
                    <Plus size={16} aria-hidden="true" />
                </button>
            </div>
        </div>

        <button type="button" role="switch" aria-checked={highContrast} onClick={actions.toggleHighContrast} className={`${ROW} hover:bg-gray-100 dark:hover:bg-white/5`}>
            <div className="flex items-center gap-3">
                <Eye size={18} className="text-nuit dark:text-blue-400" aria-hidden="true" />
                <span className="text-sm font-bold text-gray-800 dark:text-white">Alto contraste</span>
            </div>
            <Toggle on={highContrast} />
        </button>

        <button type="button" role="switch" aria-checked={isDarkModeOn} aria-disabled={highContrast} aria-describedby={highContrast ? darkModeReasonId : undefined} onClick={highContrast ? undefined : actions.toggleDarkMode} className={`${ROW} hover:bg-gray-100 dark:hover:bg-white/5 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent`}>
            <div className="flex items-center gap-3">
                {isDarkModeOn ? <Moon size={18} className="text-nuit dark:text-blue-400" aria-hidden="true" /> : <Sun size={18} className="text-orange-500" aria-hidden="true" />}
                <span className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800 dark:text-white">Modo escuro</span>
                    {highContrast && <span id={darkModeReasonId} className="text-xs font-medium text-gray-600 dark:text-gray-300">Indisponível com o alto contraste ligado</span>}
                </span>
            </div>
            <Toggle on={isDarkModeOn} />
        </button>

        <button type="button" onClick={() => { actions.setShowOnboarding(true); onStartTour(); }} className={`${ROW} bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 mt-1`}>
            <div className="flex items-center gap-3">
                <HelpCircle size={18} className="text-nuit dark:text-blue-400" aria-hidden="true" />
                <span className="text-sm font-bold text-midnight dark:text-blue-100">Iniciar tour guiado</span>
            </div>
            <ChevronRight size={14} className="text-blue-400" aria-hidden="true" />
        </button>
    </div>
  );
};

export default AccessibilityControls;
