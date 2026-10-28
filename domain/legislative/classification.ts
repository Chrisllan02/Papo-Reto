import type { FeedCategory } from '../../types';

export const normalizeForMatch = (text: string) =>
  (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Termos sem acento. Termo terminado em "*" casa como prefixo de palavra; os demais, como palavra inteira.
export const compileTerms = (terms: string[]): RegExp => {
  const alternatives = terms.map(term => (
    term.endsWith('*') ? `${escapeRegExp(term.slice(0, -1))}[a-z0-9]*` : escapeRegExp(term)
  ));
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`);
};

const CATEGORY_RULES: Array<{ category: FeedCategory; pattern: RegExp }> = [
  { category: 'education', pattern: compileTerms(['educacao*', 'escola*', 'ensino*', 'fundeb']) },
  { category: 'health', pattern: compileTerms(['saude', 'sus', 'medic*', 'hospital*', 'vacina*']) },
  { category: 'economy', pattern: compileTerms(['economia', 'tribut*', 'imposto*', 'dinheiro', 'orcamento*', 'fiscal', 'fiscais']) },
  { category: 'security', pattern: compileTerms(['seguranca', 'policia*', 'crime*', 'criminal*', 'pena', 'penas', 'penal', 'penais', 'arma', 'armas']) },
  { category: 'work', pattern: compileTerms(['trabalh*', 'emprego*', 'salario*', 'clt']) },
  { category: 'environment', pattern: compileTerms(['ambiente', 'floresta*', 'animal', 'animais', 'clima*', 'agua', 'aguas']) },
  { category: 'justice', pattern: compileTerms(['justica', 'lei', 'leis', 'direito*', 'codigo*', 'constituicao', 'constitucional']) },
];

export const detectLegislativeCategory = (text: string): FeedCategory => {
  const t = normalizeForMatch(text);
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(t)) return rule.category;
  }
  return 'activity';
};
