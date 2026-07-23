# Auditoria Técnica — Papo Reto

> Varredura completa do projeto (frontend, backend/serverless, infraestrutura e CI) realizada em 23/07/2026.
> Escopo: bugs, gaps funcionais, riscos de segurança, pendências técnicas e oportunidades.

**Estado geral:** o projeto está saudável — build passa, os 31 testes passam, lint sem erros (139 warnings), arquitetura clara (SPA Vite/React + funções serverless Vercel + cache em Blob). Os pontos abaixo estão ordenados por prioridade dentro de cada seção.

---

## 1. Pendências urgentes

### 1.1 CI vai quebrar no próximo push — vulnerabilidades no `undici`
`npm audit --omit=dev` acusa **3 vulnerabilidades (2 high, 1 moderate)** no `undici` (dependência transitiva de `@vercel/blob`): DoS via fragment count, HTTP response queue poisoning e downgrade de SameSite. O CI roda esse audit como step obrigatório, então o próximo push em `main` ficará vermelho.
**Correção:** `npm audit fix` (resolve via override do lockfile) e commit do `package-lock.json`.

### 1.2 `/api/ai` é um proxy aberto para o Gemini (risco de custo)
`api/ai.ts` não exige autenticação nem valida origem. Qualquer pessoa com `curl` pode consumir geração de imagem, TTS e `gemini-3-pro-preview` com thinking budget de 32k tokens pela sua chave. O rate limit (20 req/5min) é um `Map` em memória **por instância serverless** — a cada cold start ou instância paralela o contador zera, tornando-o quase decorativo.
**Correção sugerida:** validar `Origin`/`Referer` contra o domínio de produção, ou exigir um token leve emitido pelo próprio app; considerar rate limit persistente (Upstash/KV) e um teto de gasto na conta Google.

### 1.3 `/api/profile-cache` POST sem autenticação
O `POST` dispara fetch à Câmara + escrita no Vercel Blob sem auth (o `PUT` exige secret, mas o `POST` não). Mesmo problema de rate limit em memória (12/5min por instância). Permite a terceiros gerar escrita arbitrária de blobs `politicians/{id}.json` em volume.

---

## 2. Bugs de comportamento

### 2.1 Falha transitória de API é cacheada por 24h no perfil
Em `services/camaraApi.ts` (`enrichPoliticianFast`), o `catch` interno retorna o `pol` sem enriquecimento — e como o fetcher "não falhou", o `fetchWithCache` grava esse resultado vazio no `localStorage` com TTL de 24h. Uma oscilação momentânea da API da Câmara deixa o perfil sem bio/gabinete/redes por um dia inteiro.
**Correção:** relançar o erro dentro do fetcher (o `fetchWithCache` já trata erro sem cachear) ou não gravar resultados sem enriquecimento.

### 2.2 O cache de perfil do servidor nunca recebe os dados ricos
Fluxo morto: `saveCachedPolitician(id, _data)` **descarta o payload** (`_data` ignorado) e faz um `POST` vazio; o servidor reconstrói apenas o perfil básico oficial. O `PUT`, que aceitaria o payload completo (despesas, discursos, frentes, agenda), exige um secret que o frontend não possui. Consequência: `hasProfileCacheData()` do cache remoto quase nunca é verdadeiro para os arrays, e **cada usuário refaz as 5 chamadas pesadas de enriquecimento** — o objetivo do cache compartilhado não se realiza.
**Correção:** ou o `POST` do servidor passa a buscar também despesas/discursos/frentes (server-side, confiável), ou remover o parâmetro morto e o código de merge que depende dele.

### 2.3 Resultado de enriquecimento perdido se o `localStorage` estourar
Em `enrichPoliticianData`, o `localStorage.setItem` final está dentro do `try` principal: se a quota estourar **após** todos os fetches terem funcionado, o `catch` descarta o `result` bom e retorna o perfil stale. Envolver só a escrita em try/catch próprio.

### 2.4 IDs instáveis/colidentes no feed e em senadores
- Senador sem `CodigoParlamentar` recebe `Math.floor(Math.random() * 1_000_000)` — o ID muda a cada sessão, quebrando dedup, cache e `key` do React.
- Em `fetchGlobalVotacoes`, IDs de votação no formato `"2390874-43"` passam por `parseInt`, que devolve só `2390874` — votações distintas da mesma proposição colidem; o fallback é `Date.now() + Math.random()`.

### 2.5 Datas do feed perdem a hora e ordenam mal
O feed converte a data para `dd/mm/aaaa` (`toLocaleDateString`) e depois re-parseia string invertida para ordenar. Itens do mesmo dia empatam e caem no desempate por ID (que pode ser aleatório — item 2.4). Manter o timestamp original no objeto e formatar apenas na renderização.

### 2.6 Prompt truncado em `getSearchContext`
`api/ai.ts:291`: `contents: \`Pesquise sobre: "${query}"...\`` — os `...` literais parecem placeholder esquecido de um prompt maior. O resultado da busca contextual está rodando com instrução mínima.

### 2.7 Override de gênero por ID hardcoded
`camaraApi.ts:397`: IDs `220560`/`220608` (Erika Hilton, Duda Salabert) forçados como `F`. A intenção é boa, mas é frágil (IDs mudam por legislatura, lista incompleta). Melhor confiar no campo oficial + cache do servidor, e documentar o fallback.

---

## 3. Segurança e infraestrutura

| Item | Situação | Recomendação |
| --- | --- | --- |
| CSP | Ausente | Adicionar `Content-Security-Policy` no `vercel.json` (o app não usa inline scripts de terceiros; só precisa liberar imagens do Unsplash/Câmara e `data:`) |
| HSTS | Ausente | `Strict-Transport-Security: max-age=63072000; includeSubDomains` |
| Referrer-Policy / Permissions-Policy | Ausentes | `strict-origin-when-cross-origin`; negar `camera`, `payment`, etc. |
| `X-XSS-Protection` | Presente, **deprecated** | Remover (substituído por CSP) |
| SSRF no `/api/camara` | **Bem protegido** (allowlist de hosts + https + limite de bytes + timeout) | — |
| XSS | Nenhum uso de `dangerouslySetInnerHTML`/`innerHTML` | — |
| Rate limiting | Em memória, por instância, `Map` sem limpeza (leak lento) | Mover para storage compartilhado ou aceitar como best-effort e documentar |
| URLs de produção hardcoded | `legislativeBootstrap.ts` e cron usam `papo-reto-beige.vercel.app` fixo | Usar `process.env.VERCEL_URL`/variável de ambiente — hoje previews e forks apontam para produção |
| Node engines | `>=18` (EOL desde abr/2025); CI e Vercel usam 20 | Subir para `>=20` |

---

## 4. Gaps de frontend

### 4.1 Sem roteamento por URL (maior gap de UX/SEO)
Toda navegação é estado em memória (`activeTab`, `selectedCandidate`...). Consequências:
- **Nenhuma tela é linkável/compartilhável** — não dá para mandar o link do perfil de um deputado, que é exatamente o tipo de conteúdo que viraliza num produto de transparência.
- **Botão voltar do navegador sai do app** em vez de voltar de tela.
- F5 sempre volta para o mural.
Adotar rotas (React Router ou até `history.pushState` manual: `/politico/:id`, `/partidos`, `/guia/:id`) é provavelmente a melhoria de maior impacto no produto.

### 4.2 SEO praticamente ausente
`index.html` não tem `meta description`, Open Graph/Twitter Card, JSON-LD, `robots.txt` nem `sitemap.xml`. Compartilhar o link hoje gera card vazio nas redes. Combinado com 4.1, o produto é invisível para busca — crítico para um app cujo objetivo é alcance cidadão.

### 4.3 Acessibilidade: zoom bloqueado
`<meta name="viewport" ... maximum-scale=1.0, user-scalable=no>` viola WCAG 1.4.4 e contradiz o investimento do app em acessibilidade (alto contraste, ajuste de fonte). Remover `maximum-scale` e `user-scalable=no`.

### 4.4 Sem Error Boundary
Nenhum `ErrorBoundary` no app: um erro de render em qualquer view derruba a árvore inteira para tela branca. Com tanta dependência de dados externos com shape imprevisível (`any` nos mappers), vale um boundary por view + fallback amigável.

### 4.5 Componentes criados durante render (14 ocorrências)
O lint aponta 14 `react-hooks/static-components` (ex.: `ProfileView.tsx`) — componentes definidos dentro do corpo de outro componente remontam a cada render, perdendo estado e animações. São bugs reais de performance/UX, não só estilo. Junto: 10 `set-state-in-effect`, 7 `no-empty` e 90 imports/vars não usados (sinal de código morto acumulado nas views grandes).

### 4.6 Views gigantes
`PartiesDashboardView` (1.086 linhas), `ProfileWidgets` (1.028), `ProfileView` (721), `ExploreView` (649). Difícil de manter e testar; os warnings de lint se concentram nelas. Extrair componentes/widgets por seção.

### 4.7 CSS de alto contraste inline no `App.tsx`
~120 linhas de CSS num `<style>` dentro do JSX (re-injetado a cada render). Mover para `styles.css`/arquivo dedicado.

### 4.8 Bundle: chunk `visuals` com 256 KB
`lucide-react` + `html2canvas` no mesmo chunk, mas `html2canvas` só é usado em `NewsHistoryView`. Trocar para `import()` dinâmico no clique de exportar imagem corta ~45 KB gzip do caminho comum.

### 4.9 Cliente refaz enriquecimento de sexo que o servidor já fez
`hydrateMissingSexMetadata` pode disparar centenas de chamadas individuais `GET /deputados/{id}` do navegador (em lotes de 8) para descobrir o campo `sexo`, sendo que o bootstrap do servidor já mantém `deputy-sex-cache-v1` no Blob. Expor esse cache no payload do bootstrap elimina esse tráfego do cliente.

### 4.10 Higiene do `localStorage`
Prefixos versionados (`v8`, `v24`, `v5`...) nunca são limpos — chaves de versões antigas acumulam até estourar quota (o handler de quota só remove 2 chaves específicas legadas). Implementar limpeza de qualquer chave `paporeto_*` de versão diferente da atual no boot.

---

## 5. Gaps de backend/dados

- **Senadores são perfis de segunda classe** (`hasApiIntegration: false`): sem despesas, discursos, votações ou agenda. A API do Senado oferece boa parte disso (`/dadosabertos/senador/{id}/...`). Hoje metade do Congresso não tem perfil real.
- **`votingHistory` nunca é preenchido**: o tipo existe, a UI (`ProfileView`) renderiza, o score de cache pontua — mas nenhum fetcher busca votos por parlamentar (endpoint `/votacoes/{id}/votos` existe). Feature prevista e não concluída.
- **Parser XML do Senado no servidor é regex** (`getXmlTag`/`getXmlBlocks` em `legislativeBootstrap.ts`) — frágil a mudanças de formato/CDATA aninhado. Avaliar `fast-xml-parser`.
- **Cron 1×/dia (11h UTC) vs. TTL de cache de 15 min**: o cache servidor fica frio na maior parte do dia; o primeiro visitante de cada janela paga o custo do rebuild completo. Se o plano Vercel permitir, aumentar frequência do cron (ou usar o smoke de 6h/6h para aquecer via `/api/bootstrap`).
- **`api/*.ts` redefinem `VercelRequest`/`VercelResponse` à mão em 5 arquivos** (com `status?:` opcional e `body?: any`). Usar `@vercel/node` como devDependency elimina a duplicação e o risco de divergência.
- **Duplicação cliente/servidor**: `formatText`, `normalizeSex`, `detectCategory` e mapeadores existem em `services/camaraApi.ts` e `api/lib/legislativeBootstrap.ts` com implementações levemente diferentes (ex.: `detectCategory`). Extrair para um módulo compartilhado.

## 6. Qualidade, testes e DevEx

- **Cobertura de testes desequilibrada**: os 31 testes cobrem bem os handlers serverless e utils, mas só 1 componente (`DataState`). Zero testes das views principais, do `AppContext` (navegação/tema/local) e dos hooks de dados. `playwright` já está em devDependencies e não há nenhum E2E — um smoke E2E (abrir mural → abrir perfil → voltar) pegaria regressões que os testes atuais não veem.
- **139 warnings de lint** — zerar e passar CI para `--max-warnings 0`, senão a contagem só cresce.
- **Histórico do git poluído**: os 10+ commits mais recentes de `main` são `Update README dynamic assets` do bot diário. Alternativas: commitar assets numa branch `readme-assets` referenciada pelo README, usar GitHub Pages/artifact, ou pelo menos `[skip ci]` na mensagem.
- **Sem CONTRIBUTING/CHANGELOG/licença** definidos no repositório.
- **`alert()`** usado para erro de geolocalização (`AppContext`) — trocar por toast consistente com a UI.

## 7. Oportunidades de produto

1. **Rotas + compartilhamento de perfil** (4.1/4.2): perfis linkáveis com OG image (o app já tem `html2canvas` e geração de imagem via Gemini — dá para gerar cards de compartilhamento "quanto gastou seu deputado").
2. **PWA**: manifest + service worker. O app já é local-first (localStorage pesado, fallbacks estáticos) — está a um passo de funcionar offline e ser instalável, ótimo para o público mobile.
3. **Paridade do Senado** (item 5) — dobra o valor do produto.
4. **Busca global** (parlamentar, proposição, tema) — hoje a busca existe só dentro de Explore.
5. **Acompanhar/seguir parlamentar**: `ProfileView` já recebe `isFollowing`/`onToggleFollow`, mas o `App.tsx` passa stubs vazios (`() => {}`). Implementar com localStorage é barato e cria recorrência de uso.
6. **Votações por parlamentar** (item 5, `votingHistory`) — "como votou meu deputado" é a pergunta nº 1 de transparência.
7. **Comparador de parlamentares/partidos** (despesas, presença, produção) — os dados já estão no cache.

---

## Priorização sugerida

| # | Ação | Esforço | Impacto |
| --- | --- | --- | --- |
| 1 | `npm audit fix` (undici) antes do próximo push | XS | CI verde |
| 2 | Proteger `/api/ai` (origem/token) | S | Custo/abuso |
| 3 | Corrigir cache de falha de 24h (2.1) e fluxo morto do profile-cache (2.2) | S | Dados/performance |
| 4 | Headers de segurança + viewport com zoom | XS | Segurança/A11y |
| 5 | Rotas por URL + meta tags/OG | M | Alcance do produto |
| 6 | Error Boundary + zerar warnings de lint | S | Estabilidade |
| 7 | Perfis do Senado + votingHistory | M/L | Valor do produto |
| 8 | PWA + follow de parlamentar | M | Retenção |
