
export const getIdeologyTheme = (ideology: string) => {
    const ideo = ideology?.toLowerCase() || 'centro';
    
    if (ideo === 'esquerda') {
        return {
            bg: 'bg-rose-50/90 dark:bg-rose-900/35',
            border: 'border-rose-200 dark:border-rose-900/30',
            iconBg: 'bg-[#C41E3A]', // Vermelho Cardeal
            text: 'text-rose-950 dark:text-rose-100', // Escurecido para contraste
            badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
            badgeText: 'text-rose-900 dark:text-rose-300', // Escurecido
            label: 'ESQ',
            baseColor: '#F43F5E', // Rose 500
            activeClass: 'bg-rose-700 text-white shadow-md shadow-rose-700/20', // Mais escuro para contraste
            trackBg: 'bg-rose-100/50 dark:bg-rose-900/20',
            fillColorClass: 'bg-rose-600',
            textColorClass: 'text-rose-800 dark:text-rose-400'
        };
    }
    
    if (ideo === 'direita') {
        return {
            bg: 'bg-emerald-50/90 dark:bg-emerald-900/35',
            border: 'border-emerald-200 dark:border-emerald-900/30',
            iconBg: 'bg-[#15803D]',
            text: 'text-emerald-950 dark:text-emerald-100',
            badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            badgeText: 'text-emerald-900 dark:text-emerald-300',
            label: 'DIR',
            baseColor: '#16A34A',
            activeClass: 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20',
            trackBg: 'bg-emerald-100/50 dark:bg-emerald-900/20',
            fillColorClass: 'bg-emerald-600',
            textColorClass: 'text-emerald-800 dark:text-emerald-400'
        };
    }
    
    // Centro
    return {
        bg: 'bg-amber-50/90 dark:bg-amber-900/35',
        border: 'border-amber-200 dark:border-amber-900/30',
        iconBg: 'bg-[#D97706]', // Amber 600 (Mais escuro que o original para contraste do ícone)
        text: 'text-amber-950 dark:text-amber-100', // Muito escuro para leitura em fundo claro
        badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
        badgeText: 'text-amber-900 dark:text-amber-300', // Contraste corrigido
        label: 'CEN',
        baseColor: '#F59E0B', // Amber 500
        activeClass: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
        trackBg: 'bg-amber-100/50 dark:bg-amber-900/20',
        fillColorClass: 'bg-amber-500',
        textColorClass: 'text-amber-900 dark:text-amber-400'
    };
};
