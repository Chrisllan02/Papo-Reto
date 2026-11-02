import { BarChart3, BookOpen, ScrollText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavTab {
  id: 'feed' | 'explore' | 'parties' | 'articles';
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_TABS: NavTab[] = [
  { id: 'feed', label: 'Hoje no Congresso', shortLabel: 'Hoje', icon: ScrollText },
  { id: 'explore', label: 'Políticos', shortLabel: 'Políticos', icon: Users },
  { id: 'parties', label: 'Números', shortLabel: 'Números', icon: BarChart3 },
  { id: 'articles', label: 'Entenda a política', shortLabel: 'Entenda', icon: BookOpen },
];
