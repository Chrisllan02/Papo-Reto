import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { purgeStaleKeys, safeGetItem, safeSetItem, safeSetItemWithEviction } from '../services/storage';

describe('storage seguro', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('não lança quando o acesso ao storage é bloqueado (Safari SecurityError)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError'); });

    expect(safeGetItem('a')).toBeNull();
    expect(safeSetItem('a', '1')).toBe(false);
  });

  it('libera as entradas mais antigas do prefixo quando a cota estoura', () => {
    const limit = 400;
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      let total = value.length;
      for (let i = 0; i < this.length; i++) {
        const k = this.key(i)!;
        if (k !== key) total += (this.getItem(k) || '').length;
      }
      if (total > limit) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, key, value);
    });

    const entry = (timestamp: number) => JSON.stringify({ data: 'x'.repeat(120), timestamp });
    safeSetItem('pre_old', entry(1));
    safeSetItem('pre_newer', entry(2));
    safeSetItem('other_key', 'keep-me');

    expect(safeSetItemWithEviction('pre_new', entry(3), 'pre_')).toBe(true);
    expect(localStorage.getItem('pre_new')).not.toBeNull();
    expect(localStorage.getItem('pre_old')).toBeNull();
    expect(localStorage.getItem('other_key')).toBe('keep-me');
  });

  it('não apaga o cache inteiro por um item que não cabe', () => {
    const limit = 400;
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      let total = value.length;
      for (let i = 0; i < this.length; i++) {
        const k = this.key(i)!;
        if (k !== key) total += (this.getItem(k) || '').length;
      }
      if (total > limit) throw new DOMException('full', 'QuotaExceededError');
      realSet.call(this, key, value);
    });

    const entry = (timestamp: number) => JSON.stringify({ data: 'x'.repeat(60), timestamp });
    safeSetItem('pre_a', entry(1));
    safeSetItem('pre_b', entry(2));

    expect(safeSetItemWithEviction('pre_huge', 'y'.repeat(1000), 'pre_')).toBe(false);
    expect(localStorage.getItem('pre_a')).toBe(entry(1));
    expect(localStorage.getItem('pre_b')).toBe(entry(2));
  });

  it('remove só as versões antigas de uma família de chaves', () => {
    localStorage.setItem('paporeto_cache_v7_a', '1');
    localStorage.setItem('paporeto_cache_v8_official_a', '1');
    localStorage.setItem('unrelated', '1');

    purgeStaleKeys(/^paporeto_cache_v\d+_/, key => key.startsWith('paporeto_cache_v8_official_'));

    expect(localStorage.getItem('paporeto_cache_v7_a')).toBeNull();
    expect(localStorage.getItem('paporeto_cache_v8_official_a')).toBe('1');
    expect(localStorage.getItem('unrelated')).toBe('1');
  });
});
