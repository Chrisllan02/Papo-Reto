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
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  if (br) return withYear ? `${br[1]}/${br[2]}/${br[3]}` : `${br[1]}/${br[2]}`;
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

const PROPOSITION_TYPES: Array<[string, string]> = [
  ['projeto\\s+de\\s+lei\\s+complementar', 'PLP'],
  ['projeto\\s+de\\s+lei', 'PL'],
  ['proposta\\s+de\\s+emenda\\s+(?:à|a)\\s+constitui(?:ç|c)(?:ã|a)o', 'PEC'],
  ['medida\\s+provis(?:ó|o)ria', 'MPV'],
  ['projeto\\s+de\\s+decreto\\s+legislativo', 'PDL'],
  ['PLP|PL|PEC|MPV|PDL|PLN|PRC', ''],
];

const PROPOSITION_TITLE = new RegExp(
  `^(?:[OA]\\s+)?(${PROPOSITION_TYPES.map(([pattern]) => pattern).join('|')})`
  + '\\s+(?:n(?:º|°|o|\\.)\\.?\\s*)?(\\d[\\d.]*)'
  + '(?:\\s*\\/\\s*\\d{2,4}|\\s*,\\s*de\\s+\\d{4})?'
  + '(?=[\\s,:;–-]|$)[\\s,:;–-]*(?:que\\s+)?(.*)$',
  'iu',
);

const propositionAcronym = (type: string) => {
  const found = PROPOSITION_TYPES.find(([pattern]) => new RegExp(`^(?:${pattern})$`, 'iu').test(type));
  return found ? found[1] || type.toUpperCase() : undefined;
};

export const shortFeedTitle = (title: string) => {
  const match = PROPOSITION_TITLE.exec(cleanText(title));
  const acronym = match && propositionAcronym(cleanText(match[1]));
  if (!match || !acronym) return title;
  const number = match[2].replace(/\.$/, '');
  const rest = cleanText(match[3]);
  return rest ? `${acronym} ${number}: ${rest}` : `${acronym} ${number}`;
};
