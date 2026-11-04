import { describe, expect, it } from 'vitest';
import { filterPoliticians, searchSuggestions, tabCounts, PoliticianFilters } from '../utils/politicianSearch';
import { stateWithPreposition } from '../utils/location';
import { Politician } from '../types';

const pol = (id: number, name: string, party: string, state: string, senator = false): Politician =>
  ({ id, name, party, partyShort: party, state, role: senator ? 'Senador' : 'Deputado Federal', hasApiIntegration: !senator }) as Politician;

const all = [
  pol(1, 'Célio Silveira', 'MDB', 'GO'),
  pol(2, 'Ana Souza', 'PT', 'GO'),
  pol(3, 'Zeca Dias', 'MDB', 'SP'),
  pol(4, 'Bia Lima', 'PL', 'GO', true),
  pol(5, 'Dr. Zacharias Calil', 'MDB', 'GO'),
];

const base: PoliticianFilters = { chamber: 'todos', uf: '', party: '', ideology: '', search: '', order: 'asc' };
const names = (list: Politician[]) => list.map(p => p.name);

describe('filtro de políticos', () => {
  it('combina estado e partido e ordena de A a Z ignorando acento', () => {
    expect(names(filterPoliticians(all, { ...base, uf: 'GO', party: 'MDB' }))).toEqual(['Célio Silveira', 'Dr. Zacharias Calil']);
  });

  it('separa Câmara e Senado e inverte a ordem', () => {
    expect(names(filterPoliticians(all, { ...base, chamber: 'senado' }))).toEqual(['Bia Lima']);
    expect(names(filterPoliticians(all, { ...base, chamber: 'camara', order: 'desc' }))[0]).toBe('Zeca Dias');
  });

  it('busca sem acento nem caixa, por todas as palavras', () => {
    expect(names(filterPoliticians(all, { ...base, search: 'celio silv' }))).toEqual(['Célio Silveira']);
    expect(filterPoliticians(all, { ...base, search: 'celio zeca' })).toHaveLength(0);
  });

  it('conta as abas a partir dos dados', () => {
    expect(tabCounts(all)).toEqual({ todos: 5, deputados: 4, senadores: 1, partidos: 3, estados: 2 });
  });
});

describe('sugestões da busca do topo', () => {
  it('não sugere nada com menos de 2 letras', () => {
    expect(searchSuggestions('m', all)).toEqual({ parties: [], politicians: [] });
  });

  it('agrupa partido e políticos, com contagem real', () => {
    const result = searchSuggestions('MDB', all);
    expect(result.parties).toEqual([{ sigla: 'MDB', name: 'Movimento Democrático Brasileiro', count: 3 }]);
    expect(names(result.politicians)).toEqual(['Célio Silveira', 'Dr. Zacharias Calil', 'Zeca Dias']);
  });

  it('limita os políticos e prioriza nome que começa com o texto', () => {
    const result = searchSuggestions('ze', all, 1);
    expect(names(result.politicians)).toEqual(['Zeca Dias']);
  });
});

describe('preposição do estado', () => {
  it('usa do, da ou de conforme o estado', () => {
    expect(stateWithPreposition('GO')).toBe('de Goiás');
    expect(stateWithPreposition('BA')).toBe('da Bahia');
    expect(stateWithPreposition('RJ')).toBe('do Rio de Janeiro');
  });
});
