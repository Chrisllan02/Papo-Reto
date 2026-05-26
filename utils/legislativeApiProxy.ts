const PROXYABLE_LEGISLATIVE_HOSTS = new Set([
  'dadosabertos.camara.leg.br',
  'legis.senado.leg.br',
]);

export const getLegislativeApiUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!PROXYABLE_LEGISLATIVE_HOSTS.has(parsed.hostname)) {
      return url;
    }

    const configuredEndpoint = import.meta.env?.VITE_LEGISLATIVE_API_PROXY;
    if (!configuredEndpoint && typeof window !== 'undefined') {
      const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
      if (localHosts.has(window.location.hostname)) {
        return url;
      }
    }

    const endpoint = configuredEndpoint || '/api/camara';
    return `${endpoint}?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
};
