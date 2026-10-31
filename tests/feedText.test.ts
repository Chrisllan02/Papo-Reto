import { describe, expect, it } from 'vitest';
import { distinctSummary, isUnknownPlace, resolveFeedTitle } from '../utils/feedText';

describe('feedText', () => {
  it('título só com código usa a descrição oficial', () => {
    expect(resolveFeedTitle('PLEN 2647742-7', 'Aprovado o requerimento de urgência')).toBe('Aprovado o requerimento de urgência');
    expect(resolveFeedTitle('PLEN 2647742-7', '')).toBe('PLEN 2647742-7');
    expect(resolveFeedTitle('Reforma tributária', 'Outro texto')).toBe('Reforma tributária');
  });

  it('resumo igual ao título não duplica e o que é novo permanece', () => {
    expect(distinctSummary('Reforma tributária', 'reforma  tributária')).toBe('');
    expect(distinctSummary('Reforma tributária', 'Reforma tributária: muda a cobrança de impostos')).toBe('muda a cobrança de impostos');
    expect(distinctSummary('Reforma tributária', 'Outro texto')).toBe('Outro texto');
  });

  it('local "A Definir" é tratado como não informado', () => {
    expect(isUnknownPlace('A Definir')).toBe(true);
    expect(isUnknownPlace(' ')).toBe(true);
    expect(isUnknownPlace('Plenário 2')).toBe(false);
  });
});

describe('distinctSummary com prefixo genérico', () => {
  it('oculta o resumo que só envolve o título', () => {
    const title = 'Discussão e votação de propostas legislativas da LOA';
    expect(distinctSummary(title, `Discussão pública sobre ${title}. Ac...`)).toBe('');
  });
});
