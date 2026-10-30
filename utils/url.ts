/**
 * Devolve a URL apenas se for http ou https. Qualquer outro esquema
 * (javascript:, data:, etc.) ou texto inválido resulta em undefined.
 */
export const safeHttpUrl = (url?: string | null): string | undefined => {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? trimmed : undefined;
  } catch {
    return undefined;
  }
};
