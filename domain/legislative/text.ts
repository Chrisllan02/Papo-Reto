const NAME_PARTICLES = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

export const cleanText = (text?: string | null) => (text || '').replace(/\s+/g, ' ').trim();

export const formatPersonName = (text?: string | null) =>
  cleanText(text)
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((word, index) => index > 0 && NAME_PARTICLES.has(word)
      ? word
      : word.replace(/(^|[-'’])(\p{L})/gu, (_, separator: string, letter: string) => separator + letter.toLocaleUpperCase('pt-BR')))
    .join(' ');

export type SexCode = 'F' | 'M';

export const normalizeSex = (value?: string | null): SexCode | undefined => {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase();
  if (cleaned.startsWith('F')) return 'F';
  if (cleaned.startsWith('M')) return 'M';
  return undefined;
};

export const deputyRole = (sex?: SexCode) =>
  sex === 'F' ? 'Deputada Federal' : sex === 'M' ? 'Deputado Federal' : 'Deputado(a) Federal';

export const formatBrazilianDate = (value?: string | null, options?: { withYear?: boolean }): string | undefined => {
  if (!value) return undefined;
  const withYear = options?.withYear !== false;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return withYear ? `${iso[3]}/${iso[2]}/${iso[1]}` : `${iso[3]}/${iso[2]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('pt-BR', withYear ? undefined : { day: '2-digit', month: '2-digit' });
};

export const stableNegativeId = (value: string): number => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0;
  }
  return -(hash + 1);
};
