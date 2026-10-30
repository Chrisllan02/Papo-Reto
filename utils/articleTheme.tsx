import React from 'react';
import { Banknote, Lightbulb, ScrollText } from 'lucide-react';

export interface ArticleTheme {
  bg: string;
  text: string;
  icon: string;
  badge: string;
}

export const ARTICLE_THEMES: ArticleTheme[] = [
  { bg: 'bg-gradient-to-br from-picture to-midnight', text: 'text-picture', icon: 'bg-white/20', badge: 'bg-white/20' },
  { bg: 'bg-gradient-to-br from-nuit to-midnight', text: 'text-nuit', icon: 'bg-white/20', badge: 'bg-white/20' },
  { bg: 'bg-gradient-to-br from-blue-700 to-midnight', text: 'text-blue-600', icon: 'bg-white/20', badge: 'bg-white/20' },
  { bg: 'bg-gradient-to-br from-emerald-700 to-slate-950', text: 'text-emerald-700', icon: 'bg-white/20', badge: 'bg-white/20' },
  { bg: 'bg-gradient-to-br from-orange-700 to-orange-950', text: 'text-orange-600', icon: 'bg-white/20', badge: 'bg-white/20' },
  { bg: 'bg-gradient-to-br from-slate-800 to-midnight', text: 'text-slate-700', icon: 'bg-white/20', badge: 'bg-white/20' },
];

export const getArticleTheme = (topic: string | undefined, index: number): ArticleTheme => {
  const normalized = (topic || '').toLowerCase();
  if (normalized.includes('educ')) return ARTICLE_THEMES[1];
  if (normalized.includes('legis') || normalized.includes('lei') || normalized.includes('congresso')) return ARTICLE_THEMES[0];
  if (normalized.includes('econom') || normalized.includes('orçamento') || normalized.includes('tribut')) return ARTICLE_THEMES[2];
  if (normalized.includes('segurança')) return ARTICLE_THEMES[4];
  if (normalized.includes('saúde') || normalized.includes('ambiente')) return ARTICLE_THEMES[3];
  return ARTICLE_THEMES[Math.max(0, index) % ARTICLE_THEMES.length];
};

export const renderIcon = (iconName: string, size: number, className: string) => {
  switch (iconName) {
    case 'Banknote': return <Banknote size={size} className={className} aria-hidden="true" />;
    case 'ScrollText': return <ScrollText size={size} className={className} aria-hidden="true" />;
    default: return <Lightbulb size={size} className={className} aria-hidden="true" />;
  }
};
