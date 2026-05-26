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
