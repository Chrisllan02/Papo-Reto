# PapoReto

Transparência política brasileira em linguagem direta.

[![Deploy on Vercel](https://img.shields.io/badge/Vercel-online-000?logo=vercel&logoColor=white)](https://papo-reto-beige.vercel.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-build-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vercel Functions](https://img.shields.io/badge/API-Vercel_Functions-000?logo=vercel&logoColor=white)](https://vercel.com/)

<p align="center">
  <img src="docs/readme/status.svg" alt="Status de produção do PapoReto" width="32%" />
  <img src="docs/readme/data.svg" alt="Resumo dinâmico dos dados legislativos" width="32%" />
  <img src="docs/readme/quality.svg" alt="Resumo dinâmico de qualidade técnica" width="32%" />
</p>

## Acesso Rápido

| Ambiente | Link |
| --- | --- |
| Aplicação publicada | [papo-reto-beige.vercel.app](https://papo-reto-beige.vercel.app/) |
| Healthcheck | [`/api/health`](https://papo-reto-beige.vercel.app/api/health) |
| Bootstrap legislativo | [`/api/bootstrap`](https://papo-reto-beige.vercel.app/api/bootstrap) |

## O Que É

O PapoReto é uma aplicação web para acompanhar política brasileira com menos juridiquês técnico e mais contexto. Ela combina dados oficiais da Câmara dos Deputados e do Senado Federal com uma camada de tradução visual, filtros por tema, perfis parlamentares, feed legislativo, guia cidadão e recursos opcionais de IA.

O objetivo é responder perguntas simples:

- Quem são os parlamentares?
- O que está acontecendo no Congresso?
- Quais temas estão em destaque?
- Quanto custa um mandato?
- Como transformar dados oficiais em algo que qualquer pessoa entende?

## Principais Recursos

| Área | O que entrega |
| --- | --- |
| Mural legislativo | Feed com atividades recentes, filtros por tema, fonte oficial e resumo didático. |
| Perfis políticos | Dados de mandato, presença, custos, frentes parlamentares, votações e histórico. |
| Partidos | Visão de composição partidária e ideologia estimada por metadados internos. |
| Guia cidadão | Conteúdo educativo sobre regras, termos e instituições políticas. |
| Chat e IA | Chat, imagens, voz, transcrição e conteúdo educativo quando a chave de IA está configurada. |
| Acessibilidade | Tema escuro, alto contraste, controle de fonte, navegação mobile e onboarding. |
| Serverless BFF | Proxy seguro, bootstrap cacheado, healthcheck e cron de aquecimento. |

## Experiência Do Produto

```mermaid
flowchart LR
  A["Usuário abre o app"] --> B["Bootstrap server-side"]
  B --> C["Mural com dados recentes"]
  C --> D["Filtro por tema"]
  C --> E["Detalhe da atividade"]
  C --> F["Perfil parlamentar"]
  F --> G["Custos, presença e atuação"]
  C --> H["Guia cidadão"]
  C --> I["Chat/IA opcional"]
```

## Arquitetura

```mermaid
flowchart TB
  UI["React + Vite + Tailwind"] --> CTX["AppContext"]
  CTX --> HOOK["useCamaraData"]
  HOOK --> BOOT["/api/bootstrap"]
  HOOK --> PROXY["/api/camara"]
  HOOK --> CACHE["/api/profile-cache"]
  UI --> AI["/api/ai"]
  CRON["Vercel Cron"] --> JOB["/api/cron/refresh-legislative-data"]
  JOB --> BOOT
  BOOT --> CAMARA["Dados Abertos Câmara"]
  BOOT --> SENADO["Dados Abertos Senado"]
  PROXY --> CAMARA
  PROXY --> SENADO
  CACHE --> BLOB["Vercel Blob opcional"]
  AI --> GEMINI["Google Gemini opcional"]
```

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18, TypeScript, Vite |
| Estilo | Tailwind CSS via PostCSS |
| Ícones | Lucide React |
| API/BFF | Vercel Serverless Functions |
| Cache persistente opcional | Vercel Blob |
| IA opcional | `@google/genai` |
| Qualidade | Vitest, Testing Library, ESLint, TypeScript |

## Estrutura Do Projeto

```text
.
|-- api/                         # Serverless functions no Vercel
|   |-- ai.ts                    # Ações de IA com fallback sem chave
|   |-- bootstrap.ts             # Bootstrap/cache inicial
|   |-- camara.ts                # Proxy restrito para fontes oficiais
|   |-- health.ts                # Diagnóstico de integrações
|   |-- profile-cache.ts         # Cache de perfis
|   `-- cron/
|       `-- refresh-legislative-data.ts
|-- components/                  # UI reutilizável
|-- contexts/                    # Estado global e navegação
|-- domain/legislative/          # Regras puras de classificação
|-- hooks/                       # Carregamento e enriquecimento de dados
|-- services/                    # Integrações de Câmara, cache e IA
|-- tests/                       # Testes unitários e handlers
|-- utils/                       # Tradução legislativa e proxy client-side
`-- views/                       # Telas principais
```

## Como Rodar Localmente

Requisitos:

- Node.js 18+
- npm

```bash
npm install
npm run dev
```

Depois acesse:

```text
http://localhost:5173
```

### QA Local Com Dados De Produção

O Vite local não executa as functions de `/api`. Para testar o frontend local usando dados reais de produção:

```bash
VITE_BOOTSTRAP_ENDPOINT=https://papo-reto-beige.vercel.app/api/bootstrap npm run dev
```

Quando `VITE_BOOTSTRAP_ENDPOINT` aponta para produção, o frontend também usa a origem pública para proxy legislativo, cache de perfil e IA.

## Scripts

| Comando | Uso |
| --- | --- |
| `npm run dev` | Inicia o Vite em modo desenvolvimento. |
| `npm run build` | Roda TypeScript e build de produção. |
| `npm run lint` | Executa ESLint. |
| `npm test` | Executa Vitest. |
| `npm audit --omit=dev` | Audita dependências de produção. |

<details>
<summary><strong>Checklist rápido para novos contribuidores</strong></summary>

1. Rode `npm install`.
2. Rode `npm test` para validar a suíte.
3. Rode `npm run lint -- --quiet`.
4. Rode `npm run build`.
5. Para testar com dados reais, use `VITE_BOOTSTRAP_ENDPOINT=https://papo-reto-beige.vercel.app/api/bootstrap npm run dev`.
6. Antes de publicar, confirme `git diff --check`.

</details>

## Variáveis De Ambiente

Crie `.env.local` quando precisar ativar IA, cache persistente ou endpoints específicos.

```bash
# IA opcional
API_KEY=...
# ou
GOOGLE_API_KEY=...

# Cache persistente opcional no Vercel Blob
BLOB_READ_WRITE_TOKEN=...

# Proteção opcional para chamadas manuais do cron
CRON_SECRET=...

# Origem pública para APIs quando o frontend roda fora do Vercel
VITE_PUBLIC_API_ORIGIN=https://papo-reto-beige.vercel.app

# Bootstrap inicial
VITE_BOOTSTRAP_ENDPOINT=/api/bootstrap

# Proxy legislativo
VITE_LEGISLATIVE_API_PROXY=/api/camara

# Cache de perfil
VITE_PROFILE_CACHE_ENDPOINT=/api/profile-cache
```

### Degradação Segura

O app continua funcionando sem `API_KEY` e sem `BLOB_READ_WRITE_TOKEN`.

- Sem chave de IA: chat, áudio, imagem e transcrição retornam fallback controlado.
- Sem Blob: caches funcionam em memória por instância serverless.

## Endpoints

| Método | Endpoint | Descrição |
| --- | --- | --- |
| `GET` | `/api/health` | Status da aplicação e integrações configuradas. |
| `GET` | `/api/bootstrap` | Dados iniciais: parlamentares, feed, partidos e artigos. |
| `GET` | `/api/camara?url=...` | Proxy restrito para Câmara e Senado. |
| `GET` | `/api/cron/refresh-legislative-data` | Aquece o cache legislativo. |
| `POST` | `/api/ai` | Ações de IA usadas pelo app. |
| `GET`/`PUT` | `/api/profile-cache?type=politician&id=...` | Cache de perfis parlamentares. |

## Cron Jobs

O `vercel.json` agenda o refresh legislativo diário:

```text
0 11 * * *
```

No plano Hobby da Vercel, crons diários são o limite seguro. Para refresh mais frequente, use Vercel Pro e ajuste a expressão no `vercel.json`.

## Qualidade

Baseline atual:

- Build TypeScript + Vite
- ESLint
- Vitest
- Auditoria de dependências de produção
- Handlers serverless testados
- Fallbacks para IA e cache
- Validação de proxy legislativo

```bash
npm test
npm run lint -- --quiet
npm run build
npm audit --omit=dev
```

## README Dinâmico

Este README usa cartões SVG gerados pelo próprio repositório. Eles são atualizados pelo workflow [`README Widgets`](.github/workflows/readme-widgets.yml), que roda diariamente e também pode ser disparado manualmente pelo GitHub Actions.

O gerador consulta os endpoints públicos do projeto, consolida métricas e escreve:

- [`docs/readme/status.svg`](docs/readme/status.svg)
- [`docs/readme/data.svg`](docs/readme/data.svg)
- [`docs/readme/quality.svg`](docs/readme/quality.svg)
- [`docs/readme/metrics.json`](docs/readme/metrics.json)

Para atualizar localmente:

```bash
npm run readme:widgets
```

## Roadmap Sugerido

- Adicionar screenshots reais do produto no README.
- Criar testes E2E com Playwright no CI.
- Adicionar monitoramento com Sentry ou ferramenta equivalente.
- Persistir dados importantes em banco gerenciado se o volume crescer.
- Evoluir crons por domínio: feed, perfis populares, partidos e artigos.
- Melhorar comparativos: parlamentar vs partido, estado e média da Casa.

## Deploy

O deploy principal roda na Vercel:

[https://papo-reto-beige.vercel.app/](https://papo-reto-beige.vercel.app/)

Pushes para `main` disparam novo deploy quando o projeto está conectado ao repositório.

## Licença

Este repositório ainda não declara uma licença. Defina uma antes de liberar uso, cópia ou distribuição pública do código.
