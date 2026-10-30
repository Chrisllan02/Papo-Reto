import { describe, expect, it } from 'vitest';
import { buildActivityAudioScript } from '../utils/audioNarration';
import type { FeedItem } from '../types';

const item = (title: string): FeedItem => ({ id: 1, type: 'voto', title });

describe('audioNarration', () => {
  it('só troca "nº"/"no." por "número" quando seguido de dígito', () => {
    expect(buildActivityAudioScript(item('Requerimento nº 123/2024'))).toContain('Requerimento número 123/2024');
    expect(buildActivityAudioScript(item('Requerimento no. 45'))).toContain('Requerimento número 45');
  });

  it('não corrompe palavras como "no", "nova" e "Nordeste"', () => {
    const script = buildActivityAudioScript(item('Debate no Senado sobre nova política para o Nordeste'));
    expect(script).toContain('Debate no Senado sobre nova política para o Nordeste');
    expect(script).not.toContain('número');
  });
});
