import React from 'react';
import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';

type DataStateVariant = 'empty' | 'error' | 'loading';

interface DataStateProps {
  variant?: DataStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ICONS = {
  empty: SearchX,
  error: AlertTriangle,
  loading: RefreshCw,
};

const DataState: React.FC<DataStateProps> = ({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const Icon = ICONS[variant];

  return (
    <div className="glass-panel rounded-[2rem] px-6 py-10 md:px-10 md:py-12 text-center flex flex-col items-center border border-white/50 dark:border-white/10">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
        variant === 'error'
          ? 'bg-red-100/80 text-red-600 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-blue-50/90 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200'
      }`}>
        <Icon size={28} className={variant === 'loading' ? 'animate-spin' : ''} />
      </div>
      <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white mb-2">{title}</h3>
      <p className="text-sm md:text-base text-muted-strong max-w-md leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default DataState;
