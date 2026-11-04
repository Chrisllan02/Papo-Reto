export type IdeologyKey = 'Esquerda' | 'Centro' | 'Direita' | 'Sem classificação';

export const IDEOLOGY_COLORS: Record<IdeologyKey, string> = {
  Esquerda: '#E11D48',
  Centro: '#F59E0B',
  Direita: '#059669',
  'Sem classificação': '#64748B',
};

export const IDEOLOGY_TEXT: Record<IdeologyKey, string> = {
  Esquerda: 'text-[#BE123C] dark:text-rose-300',
  Centro: 'text-[#B45309] dark:text-amber-300',
  Direita: 'text-[#047857] dark:text-emerald-300',
  'Sem classificação': 'text-[#475569] dark:text-slate-300',
};

export const ideologyKey = (ideology?: 'Esquerda' | 'Centro' | 'Direita'): IdeologyKey => ideology ?? 'Sem classificação';
