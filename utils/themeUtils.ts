
export const getIdeologyTheme = (ideology: string) => {
    const ideo = ideology?.toLowerCase() || 'centro';
    
    if (ideo === 'esquerda') {
        return {
            bg: 'bg-rose-50/80 dark:bg-rose-900/10',
            border: 'border-rose-100 dark:border-rose-900/30',
            iconBg: 'bg-[#C41E3A]', // Vermelho Cardeal
            text: 'text-rose-900 dark:text-rose-100',
            badgeBg: 'bg-rose-100 dark:bg-rose-900/40',
            badgeText: 'text-[#C41E3A] dark:text-rose-300',
            label: 'ESQ',
            baseColor: '#F43F5E', // Rose 500
            activeClass: 'bg-rose-600 text-white shadow-md shadow-rose-600/20',
            trackBg: 'bg-rose-100/50 dark:bg-rose-900/20',
            fillColorClass: 'bg-rose-500',
            textColorClass: 'text-rose-600 dark:text-rose-400'
        };
    }
    
    if (ideo === 'direita') {
        return {
            bg: 'bg-indigo-50/80 dark:bg-indigo-900/10',
            border: 'border-indigo-100 dark:border-indigo-900/30',
            iconBg: 'bg-[#2E3192]', // Azul Marinho Conservador
            text: 'text-indigo-900 dark:text-indigo-100',
            badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40',
            badgeText: 'text-[#2E3192] dark:text-indigo-300',
            label: 'DIR',
            baseColor: '#4F46E5', // Indigo 600
            activeClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20',
            trackBg: 'bg-indigo-100/50 dark:bg-indigo-900/20',
            fillColorClass: 'bg-indigo-600',
            textColorClass: 'text-indigo-600 dark:text-indigo-400'
        };
    }
    
    // Centro
    return {
        bg: 'bg-amber-50/80 dark:bg-amber-900/10',
        border: 'border-amber-100 dark:border-amber-900/30',
        iconBg: 'bg-[#E69138]', // Laranja/Ouro Moderado
        text: 'text-amber-900 dark:text-amber-100',
        badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
        badgeText: 'text-[#E69138] dark:text-amber-300',
        label: 'CEN',
        baseColor: '#FBBF24', // Amber 400
        activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
        trackBg: 'bg-amber-100/50 dark:bg-amber-900/20',
        fillColorClass: 'bg-amber-400',
        textColorClass: 'text-amber-600 dark:text-amber-400'
    };
};
