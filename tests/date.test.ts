import { describe, expect, it } from 'vitest';
import { parseLocalDate } from '../utils/date';

describe('parseLocalDate', () => {
  it('mantém o dia de AAAA-MM-DD sem deslocar pelo fuso', () => {
    const d = parseLocalDate('2024-03-05')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 2, 5]);
    expect(d.getHours()).toBe(0);
  });

  it('usa a data do texto em ISO com horário', () => {
    const d = parseLocalDate('2024-12-31T23:30:00')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2024, 11, 31]);
  });

  it('aceita DD/MM/AAAA', () => {
    const d = parseLocalDate('09/02/2025')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2025, 1, 9]);
  });

  it('retorna null para vazio ou inválido, nunca "hoje"', () => {
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate('')).toBeNull();
    expect(parseLocalDate('abc')).toBeNull();
    expect(parseLocalDate('2024-02-31')).toBeNull();
  });
});
