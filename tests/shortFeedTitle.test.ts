import { describe, expect, it } from 'vitest';
import { formatBrazilianDate, shortFeedTitle } from '../domain/legislative/text';

describe('shortFeedTitle', () => {
  it('abrevia o tipo e tira o ano', () => {
    expect(shortFeedTitle('Projeto de Lei nº 5.960/2025')).toBe('PL 5.960');
    expect(shortFeedTitle('PL nº 5.802/2025')).toBe('PL 5.802');
    expect(shortFeedTitle('Projeto de Lei Complementar nº 108/2024')).toBe('PLP 108');
    expect(shortFeedTitle('Proposta de Emenda à Constituição nº 45/2019')).toBe('PEC 45');
  });

  it('tira o artigo inicial e mantém o assunto sem inventar', () => {
    expect(shortFeedTitle('O Projeto de Lei 5.960, de 2025, que institui o Marco de Fomento à Economia'))
      .toBe('PL 5.960: institui o Marco de Fomento à Economia');
    expect(shortFeedTitle('O PL nº 5.802/2025 que institui instrumentos transitórios para a desconcent...'))
      .toBe('PL 5.802: institui instrumentos transitórios para a desconcent...');
  });

  it('devolve o título original quando não reconhece o padrão', () => {
    const original = 'Aprovado, por unanimidade, o requerimento de urgência (art. 155 do ricd).';
    expect(shortFeedTitle(original)).toBe(original);
    expect(shortFeedTitle('Contribuições do Brasil à COP 31')).toBe('Contribuições do Brasil à COP 31');
    expect(shortFeedTitle('Plano de trabalho da comissão')).toBe('Plano de trabalho da comissão');
  });
});

describe('formatBrazilianDate', () => {
  it('não inverte dia e mês quando a data já vem em dd/mm/aaaa', () => {
    expect(formatBrazilianDate('04/11/2026', { withYear: false })).toBe('04/11');
    expect(formatBrazilianDate('2026-11-04', { withYear: false })).toBe('04/11');
  });
});
