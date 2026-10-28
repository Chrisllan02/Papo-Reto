import { describe, expect, it } from 'vitest';
import { detectCategory, formatCardTitle, getDidacticContext } from '../utils/legislativeTranslator';

describe('legislativeTranslator', () => {
  it('detects semantic categories from legislative text', () => {
    expect(detectCategory('Projeto sobre saúde pública e SUS')).toBe('health');
    expect(detectCategory('Debate sobre orçamento e imposto')).toBe('economy');
    expect(detectCategory('Ação de segurança contra crime')).toBe('security');
    expect(detectCategory('Pauta administrativa sem tema conhecido')).toBe('activity');
  });

  it('turns bureaucratic titles into short user-facing titles', () => {
    expect(formatCardTitle('Aprovado o Requerimento de Urgência nº 123/2024', 'voto')).toBe('Urgência Aprovada');
    expect(formatCardTitle('Institui o Programa Nacional de Educação Digital', 'proposicao')).toBe('Programa Nacional de Educação Digital');
  });

  it('adds didactic context and constitution references', () => {
    const context = getDidacticContext(
      'PL 123 sobre saúde',
      'Institui novas regras para o SUS',
      'proposicao'
    );

    expect(context.text).toContain('Cria um novo programa');
    expect(context.text).toContain('Projeto de Lei Ordinária');
    expect(context.constitution?.art).toBe('Art. 196');
  });
});

describe('legislativeTranslator: falsos positivos por substring', () => {
  it('não classifica "Aguardando Designação de Relator" como meio ambiente (agua)', () => {
    expect(detectCategory('Aguardando Designação de Relator')).toBe('activity');
  });

  it('não classifica "Suspensão" como saúde (sus), "apenas" como segurança (pena) nem "eleitoral" como justiça (lei)', () => {
    expect(detectCategory('Suspensão da sessão')).toBe('activity');
    expect(detectCategory('Debate apenas com convidados')).toBe('activity');
    expect(detectCategory('Reunião da comissão eleitoral')).toBe('activity');
  });

  it('classifica palavras inteiras e chaves sem acento ("salário")', () => {
    expect(detectCategory('Reajuste do salário mínimo')).toBe('work');
    expect(detectCategory('Reajuste do SALARIO minimo')).toBe('work');
    expect(detectCategory('Qualidade da água potável')).toBe('environment');
    expect(detectCategory('Pena de prisão para crimes')).toBe('security');
  });

  it('mantém derivados de termos de raiz (ambiental, educacional, orçamentárias)', () => {
    expect(detectCategory('Meio ambientes urbanos')).toBe('environment');
    expect(detectCategory('Licenciamento ambiental')).toBe('environment');
    expect(detectCategory('Política educacional')).toBe('education');
    expect(detectCategory('Diretrizes orçamentárias')).toBe('economy');
  });

  it('não confunde "PLEN" com PL nem "ESPECIAL" com PEC no contexto didático', () => {
    const plen = getDidacticContext('PLEN 12', 'Sessão no PLEN', 'voto');
    expect(plen.text).not.toContain('Projeto de Lei Ordinária');
    const especial = getDidacticContext('SESSÃO ESPECIAL', 'SESSÃO ESPECIAL DE HOMENAGEM', 'voto');
    expect(especial.text).not.toContain('Proposta de Emenda');
  });

  it('só liga "SUS" à Constituição como palavra inteira', () => {
    expect(getDidacticContext('Suspensão de sessão', 'Suspensão de sessão', 'voto').constitution).toBeNull();
    expect(getDidacticContext('Verba para o SUS', 'Verba para o SUS', 'voto').constitution?.art).toBe('Art. 198');
  });

  it('casa chaves acentuadas com texto sem acento', () => {
    expect(getDidacticContext('x', 'Projeto sobre educacao basica', 'voto').constitution?.art).toBe('Art. 205');
  });
});
