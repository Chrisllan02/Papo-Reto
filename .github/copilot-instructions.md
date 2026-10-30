# Instruções para o Copilot no Papo-Reto

Veja também `CLAUDE.md` na raiz (regras do produto e checklist de PR).

## Visão geral
- SPA React + Vite hospedada na Vercel, sem roteador: a navegação é estado no `contexts/AppContext.tsx` e a escolha de tela fica em `App.tsx`.
- Dados legislativos vêm da Câmara (`dadosabertos.camara.leg.br`) e do Senado (`legis.senado.leg.br`), sempre por proxy próprio (BFF) em `api/`.

## Fluxo de dados
- `AppProvider` chama `useInitialData()` (`hooks/useCamaraData.ts`), que busca `/api/bootstrap` e depois enriquece perfis.
- `services/camaraApi.ts` acessa as APIs oficiais via `/api/camara` (ver `utils/legislativeApiProxy.ts`) e lê/grava perfis em `/api/profile-cache`.
- Cache local em `localStorage` com prefixo `paporeto_cache_v8_official_` (constante `CACHE_PREFIX` em `services/camaraApi.ts`). Se mudar o formato dos dados, suba a versão do prefixo.
- IA (Gemini): `services/ai.ts` chama `POST /api/ai`. A chave (`API_KEY` ou `GOOGLE_API_KEY`) é lida só no servidor, em `api/ai.ts`. Nunca coloque segredo no front.
- Backend (funções Vercel): `api/ai.ts`, `api/bootstrap.ts`, `api/camara.ts`, `api/profile-cache.ts`, `api/health.ts`, `api/cron/refresh-legislative-data.ts` e helpers em `api/lib/`.
- Regras de domínio e classificação: `domain/legislative/`; tradução didática: `utils/legislativeTranslator.tsx`.

## Convenções
- Não adicione React Router; use o AppContext.
- Nunca invente dado: o que falta na fonte aparece como ausente, com link para a fonte oficial.
- Textos em pt-BR simples; acessibilidade WCAG AA (contraste, foco, teclado).
- Variáveis de ambiente: ver `docs/operations/vercel-environment.md`.

## Comandos
- `npm run dev` (porta 3000), `npm run build` (tsc + vite), `npm run preview`
- `npm test` (Vitest, testes em `tests/`), `npm run lint`
- `npm run smoke:prod` (verifica produção), `npm run readme:widgets` e `npm run readme:preview` (assets do README, em `scripts/`)
