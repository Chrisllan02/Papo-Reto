import { Banknote, Calendar, Landmark, Lightbulb, type LucideIcon } from 'lucide-react';
import type { FeedItem } from '../types';

export interface FeedTypeMeta {
  label: string;
  Icon: LucideIcon;
  /** Chip claro usado em cards e listas. */
  chipClass: string;
  /** Fundo do cabeçalho do detalhe. */
  headerClass: string;
  /** Cor do ícone sobre fundo claro. */
  iconClass: string;
}

const FEED_TYPE_META: Record<FeedItem['type'], FeedTypeMeta> = {
  voto: {
    label: 'Votação',
    Icon: Landmark,
    chipClass: 'bg-nuit/10 text-nuit dark:bg-blue-900/30 dark:text-blue-200',
    headerClass: 'bg-nuit',
    iconClass: 'text-nuit',
  },
  despesa: {
    label: 'Despesa',
    Icon: Banknote,
    chipClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    headerClass: 'bg-orange-600',
    iconClass: 'text-orange-600',
  },
  evento: {
    label: 'Evento',
    Icon: Calendar,
    chipClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    headerClass: 'bg-purple-600',
    iconClass: 'text-purple-600',
  },
  educacao: {
    label: 'Educação',
    Icon: Lightbulb,
    chipClass: 'bg-spring/30 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
    headerClass: 'bg-spring',
    iconClass: 'text-yellow-600',
  },
};

export const getFeedTypeMeta = (type: FeedItem['type'] | string): FeedTypeMeta =>
  FEED_TYPE_META[type as FeedItem['type']] ?? FEED_TYPE_META.educacao;
