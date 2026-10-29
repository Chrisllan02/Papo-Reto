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
