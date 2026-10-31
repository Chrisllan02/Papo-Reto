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
    <div
      role={variant === 'error' ? 'alert' : variant === 'loading' ? 'status' : undefined}
      className="glass-panel rounded-2xl px-6 py-10 md:px-10 md:py-12 text-center flex flex-col items-center border border-slate-200/70 dark:border-white/10"
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
        variant === 'error'
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
      }`}>
        <Icon size={28} className={variant === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />
      </div>
      <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white mb-2">{title}</h3>
      <p className="text-sm md:text-base text-muted-strong max-w-md leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 min-h-11 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 active:scale-[0.98] transition-colors focus-visible:ring-4 focus-visible:ring-blue-500/40"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default DataState;
