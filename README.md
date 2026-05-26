# PapoReto

Aplicacao web de transparencia politica brasileira, com dados da Camara dos Deputados, Senado Federal e recursos de IA para resumo, chat, voz e conteudo educativo.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS via PostCSS
- Vercel Serverless Functions
- Gemini via `@google/genai`
- Vercel Blob para cache persistente opcional de perfis

## Comandos

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
npm audit --omit=dev
```

## Variaveis de Ambiente

Crie `.env.local` para desenvolvimento quando precisar usar recursos de IA ou caches persistentes.

```bash
API_KEY=...
# ou
GOOGLE_API_KEY=...

# Opcional: cache persistente de perfis no Vercel Blob
BLOB_READ_WRITE_TOKEN=...

# Opcional: sobrescreve o endpoint proxy legislativo no cliente
VITE_LEGISLATIVE_API_PROXY=/api/camara

# Opcional: sobrescreve o endpoint de cache de perfil no cliente
VITE_PROFILE_CACHE_ENDPOINT=/api/profile-cache
```

## Arquitetura

- `App.tsx` monta o shell principal e roteia as views internas.
- `contexts/AppContext.tsx` concentra estado global de navegacao, tema, acessibilidade e dados iniciais.
- `hooks/useCamaraData.ts` coordena carregamento inicial, cache local e enriquecimento progressivo de perfis.
- `services/camaraApi.ts` integra dados legislativos e usa o proxy serverless quando aplicavel.
- `services/ai.ts` conversa com `/api/ai` e mantem fallbacks/cache no navegador.
- `api/camara.ts` proxy restrito para hosts legislativos permitidos.
- `api/ai.ts` endpoint serverless para Gemini.
- `api/profile-cache.ts` cache de perfis com Vercel Blob e fallback em memoria.
- `api/health.ts` diagnostico simples das integracoes configuradas.

## Endpoints Serverless

- `GET /api/health`: status basico da aplicacao e disponibilidade de integracoes, sem expor segredos.
- `GET /api/camara?url=...`: proxy restrito para `dadosabertos.camara.leg.br` e `legis.senado.leg.br`.
- `POST /api/ai`: acoes de IA usadas pelo chat, imagens, voz, transcricao e conteudo educativo.
- `GET|PUT /api/profile-cache?type=politician&id=...`: cache de perfis politicos.

## Qualidade

O projeto tem uma baseline automatizada:

- TypeScript + build de producao: `npm run build`
- ESLint: `npm run lint`
- Testes unitarios/handlers: `npm test`
- Auditoria de dependencias de producao: `npm audit --omit=dev`

Os testes atuais cobrem:

- traducao/categorizacao legislativa
- proxy legislativo
- endpoint de health
- validacao basica do handler `/api/camara`

## Deploy

O deploy principal roda no Vercel:

https://papo-reto-beige.vercel.app/

Pushes para `main` disparam novo deploy no Vercel quando o projeto esta conectado ao repositorio.
