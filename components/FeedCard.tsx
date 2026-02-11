import React from 'react';
import { Landmark, ArrowRight, Sparkles } from 'lucide-react';
import { FeedItem, Politician } from '../types';
import AudioPlayer from './AudioPlayer';
import { getCategoryIcon, formatCardTitle, getDidacticContext } from '../utils/legislativeTranslator';

interface FeedCardProps {
    item: FeedItem;
    politicians: Politician[];
    onClick: (item: FeedItem) => void;
}

const FeedCard: React.FC<FeedCardProps> = ({ item, politicians, onClick }) => {
    // Usa a categoria pré-calculada ou fallback para 'activity'
    const category = getCategoryIcon(item.category || 'activity');
    const politician = item.candidateId ? politicians.find(p => p.id === item.candidateId) : null;
    const isExpense = item.type === 'despesa';
    
    // Contexto Didático para uso no Card
    const didactic = getDidacticContext(item.title, item.description, item.type);
    // Show snippet only if meaningful text exists and isn't just repetition
    const showSnippet = didactic.text && didactic.text.length > 10 && !didactic.text.startsWith(item.title.substring(0,20));

    return (
        <article 
            onClick={() => onClick(item)}
            className="group relative glass-surface p-6 md:p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full justify-between"
        >
            <div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${category.bg} ${category.color} text-xs font-black uppercase tracking-wider`}>
                        <category.icon size={14} />
                        {category.label}
                    </div>
                    <span className="text-xs font-bold text-subtle flex items-center gap-1.5">
                        {item.date}
                    </span>
                </div>

                <h3 className="text-lg md:text-xl font-black text-midnight dark:text-white leading-tight mb-3 group-hover:text-nuit dark:group-hover:text-blue-400 transition-colors line-clamp-3">
                    {formatCardTitle(item.title, item.type)}
                </h3>

                {/* Micro-Tradução Exposta */}
                {showSnippet && !isExpense && (
                    <div className="flex items-start gap-2 mb-3 bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                        <Sparkles size={12} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 leading-tight line-clamp-2">
                            {didactic.text}
                        </p>
                    </div>
                )}

                {isExpense && item.amount && (
                    <div className="mb-4">
                        <p className="text-3xl font-black text-midnight dark:text-white tracking-tighter">{item.amount}</p>
                        <p className="text-xs text-subtle uppercase font-bold truncate tracking-wide">{item.provider}</p>
                    </div>
                )}

                {!isExpense && item.description && (
                    <p className="text-sm text-muted font-medium leading-relaxed line-clamp-3 mb-6">
                        {item.description}
                    </p>
                )}
            </div>

            {politician ? (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={politician.photo} className="w-10 h-10 rounded-full object-cover border border-white dark:border-gray-700 shadow-sm" alt="" loading="lazy" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-midnight dark:text-white truncate">{politician.name}</p>
                            <p className="text-xs font-bold text-subtle uppercase tracking-wide">{politician.party} • {politician.state}</p>
                        </div>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={`${item.title}. ${didactic.text}`} isDarkText={false} compact={true} />
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 relative z-10 mt-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <Landmark size={18} className="text-subtle"/>
                        </div>
                        <span className="text-xs font-bold text-subtle uppercase tracking-widest">Congresso Nacional</span>
                    </div>
                    {/* Audio Button on Card */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <AudioPlayer text={`${item.title}. ${didactic.text}`} isDarkText={false} compact={true} />
                    </div>
                </div>
            )}
            
            {/* Hover Action Arrow (Hidden on Touch/Mobile usually, visible on desktop hover) */}
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 hidden md:block">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-subtle flex items-center justify-center">
                    <ArrowRight size={14} />
                </div>
            </div>
        </article>
    );
};

export default FeedCard;