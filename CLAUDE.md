# CLAUDE.md

## Produto
Papo Reto é uma plataforma de transparência política: traduz dados do Congresso Nacional (Câmara e Senado) para linguagem simples e direta, para qualquer cidadão brasileiro. Produção: https://papo-reto-beige.vercel.app

## Regra de ouro
Nunca invente dado. Ausente é ausente. Sempre que possível, mostre o link para a fonte oficial.

## Arquitetura
- SPA React 18 + Vite + Tailwind (TypeScript), deploy na Vercel. Sem roteador.
- Estado global em `contexts/AppContext.tsx`; carga inicial em `hooks/useCamaraData.ts`.
- `services/camaraApi.ts`: APIs oficiais via proxy `/api/camara`, perfis via `/api/profile-cache`, cache local `paporeto_cache_v8_official_`.
- `services/ai.ts`: IA via `POST /api/ai` (Gemini). A chave existe só no servidor.
- `api/`: funções Vercel (`ai`, `bootstrap`, `camara`, `profile-cache`, `health`, `cron/`) e `api/lib/`.
- `domain/legislative/`: regras e classificação do domínio. `utils/`: tradução didática, datas, localização.
- `views/` (telas), `components/` (UI), `tests/` (Vitest), `scripts/` (smoke e README), `docs/operations/` (operação).

## Convenções
- Sem roteador: navegação por estado no AppContext.
- Regras de domínio em `domain/legislative`, não nas views.
- Segredos só em `api/` (variáveis em `docs/operations/vercel-environment.md`).
- Textos em pt-BR simples; acessibilidade WCAG AA (contraste 4.5:1, foco visível, teclado, sem bloquear zoom).

## Comandos
- `npm run dev` | `npm run build` | `npm run preview`
- `npm test` | `npm run lint`
- `npm audit --omit=dev`
- `npm run smoke:prod` | `npm run readme:widgets` | `npm run readme:preview`

## Checklist antes de PR
- [ ] `npm run lint -- --quiet`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm audit --omit=dev` sem vulnerabilidades
- [ ] Nenhum dado inventado; fontes oficiais linkadas
