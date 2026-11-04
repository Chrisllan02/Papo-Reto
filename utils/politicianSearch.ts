import { Politician } from '../types';
import { PARTY_METADATA } from '../constants';
import { getIdeology } from '../services/camaraApi';
import { isSenator } from './numbersStats';

export type ChamberFilter = 'todos' | 'camara' | 'senado';
export type SortOrder = 'asc' | 'desc';

export interface PoliticianFilters {
  chamber: ChamberFilter;
  uf: string;
  party: string;
  ideology: string;
  search: string;
  order: SortOrder;
}

export const normalizeText = (value?: string | null) =>
  (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const partyKey = (pol: Politician) => (pol.party ? pol.party.trim().toUpperCase() : 'OUTROS');

const searchTokens = (search: string) => normalizeText(search).split(/\s+/).filter(Boolean);

const matchesTokens = (pol: Politician, tokens: string[]) => {
  if (tokens.length === 0) return true;
  const content = normalizeText(`${pol.name} ${pol.civilName ?? ''} ${pol.party} ${pol.partyShort ?? ''} ${pol.state} ${pol.role}`);
  return tokens.every(token => content.includes(token));
};

const compareNames = (a: Politician, b: Politician) => a.name.localeCompare(b.name, 'pt-BR');

export const filterPoliticians = (politicians: Politician[], filters: PoliticianFilters) => {
  const tokens = searchTokens(filters.search);
  const result = politicians.filter(pol => {
    if (filters.chamber === 'camara' && isSenator(pol)) return false;
    if (filters.chamber === 'senado' && !isSenator(pol)) return false;
    if (filters.uf && pol.state !== filters.uf) return false;
    if (filters.party && partyKey(pol) !== filters.party) return false;
    if (filters.ideology && getIdeology(pol.party) !== filters.ideology) return false;
    return matchesTokens(pol, tokens);
  });
  result.sort(compareNames);
  return filters.order === 'desc' ? result.reverse() : result;
};

export interface TabCounts {
  todos: number;
  deputados: number;
  senadores: number;
  partidos: number;
  estados: number;
}

export const tabCounts = (politicians: Politician[]): TabCounts => {
  const senators = politicians.filter(isSenator).length;
  return {
    todos: politicians.length,
    deputados: politicians.length - senators,
    senadores: senators,
    partidos: new Set(politicians.map(partyKey)).size,
    estados: new Set(politicians.map(pol => pol.state).filter(Boolean)).size,
  };
};

export interface CountEntry {
  key: string;
  count: number;
}

const countBy = (politicians: Politician[], keyOf: (pol: Politician) => string) => {
  const counts = new Map<string, number>();
  politicians.forEach(pol => {
    const key = keyOf(pol);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts, ([key, count]): CountEntry => ({ key, count })).sort((a, b) => a.key.localeCompare(b.key, 'pt-BR'));
};

export const partyCounts = (politicians: Politician[]) => countBy(politicians, partyKey);
export const stateCounts = (politicians: Politician[]) => countBy(politicians, pol => pol.state);

export interface SearchSuggestions {
  parties: { sigla: string; name: string; count: number }[];
  politicians: Politician[];
}

export const searchSuggestions = (query: string, politicians: Politician[], limit = 3): SearchSuggestions => {
  const normalized = normalizeText(query);
  if (normalized.length < 2) return { parties: [], politicians: [] };

  const parties = partyCounts(politicians)
    .filter(({ key }) => {
      const name = normalizeText(PARTY_METADATA[key]?.nome);
      return normalizeText(key).startsWith(normalized) || (normalized.length >= 3 && name.includes(normalized));
    })
    .map(({ key, count }) => ({ sigla: key, name: PARTY_METADATA[key]?.nome ?? key, count }))
    .slice(0, 2);

  const tokens = searchTokens(query);
  const startsWithQuery = (pol: Politician) => (normalizeText(pol.name).startsWith(tokens[0]) ? 0 : 1);
  const matches = politicians
    .filter(pol => matchesTokens(pol, tokens))
    .sort((a, b) => startsWithQuery(a) - startsWithQuery(b) || compareNames(a, b))
    .slice(0, limit);

  return { parties, politicians: matches };
};
