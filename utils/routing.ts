// Mapeamento entre o estado de navegação do app e o pathname da URL,
// permitindo deep links (ex.: /politico/204554) e uso do botão voltar.
export type AppRoute = {
  tab: string;
  candidateId: number | null;
  educationId: number | null;
  fullFeed: boolean;
  newsHistory: boolean;
};

const TAB_TO_PATH: Record<string, string> = {
  feed: '/',
  explore: '/explorar',
  parties: '/partidos',
  articles: '/guia',
  chat: '/chat',
};

const PATH_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab])
);

export const buildAppPath = (route: AppRoute): string => {
  if (route.candidateId) return `/politico/${route.candidateId}`;
  if (route.educationId) return `/guia/${route.educationId}`;
  if (route.fullFeed) return '/mural';
  if (route.newsHistory) return '/noticias';
  return TAB_TO_PATH[route.tab] || '/';
};

export const parseAppPath = (pathname: string): AppRoute => {
  const route: AppRoute = {
    tab: 'feed',
    candidateId: null,
    educationId: null,
    fullFeed: false,
    newsHistory: false,
  };

  const normalized = pathname.replace(/\/+$/, '') || '/';

  const candidateMatch = normalized.match(/^\/politico\/(\d+)$/);
  if (candidateMatch) {
    route.candidateId = Number(candidateMatch[1]);
    return route;
  }

  const educationMatch = normalized.match(/^\/guia\/(\d+)$/);
  if (educationMatch) {
    route.tab = 'articles';
    route.educationId = Number(educationMatch[1]);
    return route;
  }

  if (normalized === '/mural') {
    route.fullFeed = true;
    return route;
  }

  if (normalized === '/noticias') {
    route.newsHistory = true;
    return route;
  }

  route.tab = PATH_TO_TAB[normalized] || 'feed';
  return route;
};
