// Remove chaves de versões antigas do app do localStorage. Os prefixos são
// versionados (v8, v24...) e sem esta limpeza as versões anteriores acumulam
// até estourar a quota do navegador.
const CURRENT_KEYS = new Set([
  'paporeto_bootstrap_v5',
  'paporeto_dark_mode',
  'paporeto_education_articles_v1',
  'paporeto_font_size',
  'paporeto_font_size_set',
  'paporeto_followed_v1',
  'paporeto_high_contrast',
  'paporeto_location_auto_prompted_at',
  'paporeto_news_history_v5_ids',
  'paporeto_news_v24_compact_agenda_cards',
  'paporeto_onboarding_done',
  'paporeto_prefetched_profiles_v1',
  'paporeto_sex_cache_v1',
  'paporeto_user_location',
]);

const CURRENT_PREFIXES = ['paporeto_cache_v8_official_'];

export const cleanupLegacyStorage = () => {
  try {
    const staleKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('paporeto_')) continue;
      if (CURRENT_KEYS.has(key)) continue;
      if (CURRENT_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
      staleKeys.push(key);
    }
    staleKeys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Storage indisponível (modo privado etc.) não deve quebrar o boot.
  }
};
