import { describe, expect, it } from 'vitest';
import { nextFacesCursor, pickRotatingFaces } from '../domain/legislative/rotation';

const visit = (ids: number[], count: number, visits: number) => {
  let cursor = 0;
  const windows: number[][] = [];
  for (let i = 0; i < visits; i++) {
    windows.push(pickRotatingFaces(ids, count, cursor));
    cursor = nextFacesCursor(cursor, count, ids.length);
  }
  return windows;
};

describe('pickRotatingFaces', () => {
  const ids = [730, 12, 455, 98, 301, 64, 210];

  it.each([3, 5])('mostra todos uma vez antes de repetir (N=%i)', (count) => {
    const windows = visit(ids, count, Math.ceil(ids.length / count));
    const firstCycle = windows.flat().slice(0, ids.length);
    expect(new Set(firstCycle).size).toBe(ids.length);
    expect([...firstCycle].sort((a, b) => a - b)).toEqual([...ids].sort((a, b) => a - b));
  });

  it('usa ordem neutra por id, independente da ordem de entrada', () => {
    expect(pickRotatingFaces(ids, 3, 0)).toEqual([12, 64, 98]);
    expect(pickRotatingFaces([...ids].reverse(), 3, 0)).toEqual([12, 64, 98]);
  });

  it('volta ao início da lista ao chegar no fim', () => {
    expect(pickRotatingFaces(ids, 3, 6)).toEqual([730, 12, 64]);
    expect(nextFacesCursor(6, 3, ids.length)).toBe(2);
  });

  it('cursor inválido cai para o início e lista curta não repete', () => {
    expect(pickRotatingFaces(ids, 3, Number.NaN)).toEqual([12, 64, 98]);
    expect(pickRotatingFaces([5, 3], 5, 1)).toEqual([5, 3]);
    expect(pickRotatingFaces([], 5, 4)).toEqual([]);
  });
});
