# Copilot instructions for Papo-Reto

## Visão geral e arquitetura
- SPA em React + Vite (sem roteador): a navegação é controlada por estado no AppContext e decisões condicionais em App.tsx.
- Fluxo de dados principal: AppProvider → `useInitialData()` → `services/camaraApi.ts` (API da Câmara + cache) e `services/ai.ts` (conteúdo educacional/IA) → views/components.
- Tipos centrais ficam em `types.ts` e são usados em todo o app (ex.: `Politician`, `FeedItem`, `EducationalArticle`).

## Estrutura e padrões do projeto
- Estado global e ações ficam em `contexts/AppContext.tsx`. A UI de tema/acessibilidade (dark mode, alto contraste, zoom) é aplicada via `document.documentElement`.
- Carregamento inicial usa “Big Bang load” em `hooks/useCamaraData.ts` com `Promise.all` e depois enriquecimento progressivo de perfis.
- `services/camaraApi.ts` usa cache via `localStorage` com prefixo `paporeto_cache_v7_complete_` e TTL (15min dinâmico / 24h estático). Reaproveite `fetchWithCache`.
- `services/ai.ts` tem cache próprio e usa `process.env.API_KEY` (definido no Vite). Em caso de ausência de chave, ativa fallback.
- Conteúdo didático e categorização de feed são feitos em `utils/legislativeTranslator.tsx` (ex.: `detectCategory`, `getDidacticContext`).
- `constants.ts` contém fallback data e metadados de partidos (logos/ideologia) usados quando a API falha.

## Integrações e variáveis de ambiente
- API da Câmara: `https://dadosabertos.camara.leg.br/api/v2` em `services/camaraApi.ts`.
- IA (Gemini): Vite injeta `process.env.API_KEY` em `vite.config.ts`. O README menciona `GEMINI_API_KEY`; siga o valor realmente lido no código.

## Conveções específicas
- Sem React Router: não adicione rotas; use `AppContext` e switches em App.tsx.
- Preferir computar categorias semânticas na camada de dados (API/serviços) e usar helpers visuais na renderização.
- Os componentes exibem acessibilidade (alto contraste) via classes no `<html>` e estilos globais injetados em `App.tsx`.

## Comandos de desenvolvimento
- `npm install`
- `npm run dev` (Vite em 3000)
- `npm run build` (TypeScript + Vite build)
- `npm run preview`

## Arquivos-chave para referência
- App root: `App.tsx`
- Estado global: `contexts/AppContext.tsx`
- Carregamento inicial: `hooks/useCamaraData.ts`
- API/Caches: `services/camaraApi.ts`
- IA/Conteúdo: `services/ai.ts`
- Tradução/Glossário: `utils/legislativeTranslator.tsx`
- Tipos e mocks: `types.ts`, `constants.ts`
