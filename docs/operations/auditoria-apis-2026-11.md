# Auditoria das APIs públicas (02/11/2026)

Escopo: só leitura e testes com `curl` (sem dado pessoal). Nenhum código foi alterado. Medições feitas em 02/11/2026 a partir de um Mac no Brasil; tempos são de uma única chamada, não são SLA.

## 1. Inventário de endpoints externos

| # | Endpoint | Onde é usado | Timeout | Retry | Cache | Fallback / falha |
|---|---|---|---|---|---|---|
| 1 | Câmara `GET /deputados` (513, sem paginar: o padrão já devolve todos) | `api/lib/legislativeBootstrap.ts:492` (servidor); `services/camaraApi.ts:274` (cliente) | 15 s | servidor: 1 retry sem espera + proxy próprio; cliente: 3 retries, 1/2/4 s sem jitter | Blob `legislative-bootstrap-v2` (TTL 15 min, stale sem limite); localStorage 12 h (`useCamaraData.ts:46`) e 24 h por chave | Servidor: lista vazia => 503 ou stale. Cliente: lista vazia => erro na tela |
| 2 | Câmara `GET /legislaturas/{id}` | `legislativeBootstrap.ts:424` | 2,5 s | 1 retry | só dentro do bootstrap | vazio vira `mandate` em branco |
| 3 | Câmara `GET /deputados/{id}` (sexo, 1 chamada por deputado) | `legislativeBootstrap.ts:416` (orçamento 9 s, 24 em paralelo); `useCamaraData.ts:150` (cliente, em lotes) | 2,5 s (servidor), 12 s (cliente) | 1 (servidor) | Blob `deputy-sex-cache-v1`; localStorage | falha é ignorada, deputado fica sem sexo |
| 4 | Câmara `GET /partidos?itens=100` | `legislativeBootstrap.ts:591`; `camaraApi.ts:408` | 15 s | idem 1 | idem 1 | tabela estática `PARTY_FALLBACK` (bom) |
| 5 | Câmara `GET /votacoes`, `/proposicoes`, `/eventos` (feed, `itens` 10 a 20) | `legislativeBootstrap.ts:621`; `camaraApi.ts:873` | 15 s | idem 1 | idem 1; cliente 15 min | cada falha vira um `warning`; feed vazio nunca é gravado como bom (servidor), mas o cliente grava feed parcial (ver 2.4) |
| 6 | Câmara perfil: `/deputados/{id}/despesas` (paginado até 20 págs), `/frentes`, `/ocupacoes`, `/discursos`, `/eventos?deputadoId` | `camaraApi.ts:617-621` | 15 s cada | 3 retries | localStorage 24 h fresco, 7 d stale; Blob via `/api/profile-cache` | cada subfetch é independente (`safeFetch`), campo com falha não sobrescreve nem grava vazio (bom) |
| 7 | Câmara `/proposicoes/{id}`, `/proposicoes/{id}/autores`, `/eventos/{id}` | `camaraApi.ts:768-835` | 15 s | 3 retries | `fetchWithCache` | `null` |
| 8 | Senado `GET /senador/lista/atual` (XML) | servidor `legislativeBootstrap.ts:526`; cliente `camaraApi.ts:310` | 12 s (servidor), 15 s (cliente) | servidor: nenhum; cliente: 2 | Blob/ localStorage (cliente só grava lista não vazia) | lista vazia => `warning senado_senadores_unavailable` |
| 9 | Proxy próprio `/api/camara?url=` (allowlist Câmara + Senado) | `utils/legislativeApiProxy.ts`; `api/camara.ts` | 15 s, 2 MB | nenhum | CDN `s-maxage=300, swr=3600` só para 2xx | erro de upstream vira 502/504 sem stale |
| 10 | `/api/bootstrap` (Blob) | `useCamaraData.ts:111` | `BOOTSTRAP_FETCH_TIMEOUT_MS` | nenhum | CDN 300 s + Blob 15 min | `null` => cliente refaz tudo direto nas APIs |
| 11 | `/api/profile-cache` (Blob, GET/PUT/POST) | `camaraApi.ts:92` | 10 s | nenhum | Blob, memo 30 s | 404 => cliente busca na Câmara |
| 12 | `api.bigdatacloud.net` reverse geocode (coordenadas arredondadas a 2 casas) | `utils/location.ts:110` | 8 s | nenhum | nenhum | retorna `''` |
| 13 | Imagens: `upload.wikimedia.org` (logos de partidos, `constants.ts:47-82`), Unsplash (`services/ai.ts:79-87`), `urlFoto` da Câmara e do Senado | navegador | n/a | n/a | n/a | sem verificação de fallback nesta auditoria |
| 14 | Gemini via `/api/ai` | `services/ai.ts` | n/a | n/a | n/a | fora do escopo (não é API pública de dados). `/api/health` mostra `ai:false` em produção |

Resumo do desenho: o caminho feliz é bom (bootstrap em Blob com stale e refresh em background, `mergeWithPreviousBootstrap`, `safeFetch` por campo no perfil). Os problemas estão nos cantos descritos abaixo.

## 2. Correções de estabilidade (da mais grave para a menos grave)

### 2.1 Senado: `Accept: text/xml` puro devolve 406 (causa provável do bug dos 81 senadores)
- Testado hoje: `Accept: text/xml` => **406** `application/problem+json` ("Acceptable representations: application/xml, application/json, text/csv"). Com `application/xml`, `*/*`, `application/json` ou `text/xml, application/xml;q=0.9, */*;q=0.8` => 200.
- Quem manda `text/xml` puro: `api/camara.ts:27` (proxy do Senado) e `services/camaraApi.ts:398` (cliente, `accept = 'text/xml'`). No localhost o cliente fala direto com o Senado (`legislativeApiProxy.ts`), então 406 => `retryable = false` (`camaraApi.ts:192`) => `fetchWithCache` joga o erro => `.catch(() => [])` => zero senadores. Isso explica o cache local só com deputados.
- Observação: em produção o proxy respondeu 200 para o Senado no meu teste; ou a versão no ar difere do código, ou a negociação do Senado é inconsistente. Conferir o deploy.
- Correção: trocar para `application/xml, application/json;q=0.5` (ou, melhor, usar JSON, ver 2.7) nos dois pontos e tratar 406 como erro explícito no log.
- Plano B gratuito: manter o último snapshot bom de senadores no Blob (já existe via `mergeWithPreviousBootstrap`) e adicionar um `data/senadores.snapshot.json` versionado no repo, atualizado pelo cron/CI.

### 2.2 Blob não está ativo em produção
- `GET /api/health` (02/11): `"profileBlobCache": false`. `/api/bootstrap` respondeu `source: "refresh:memory"` na primeira chamada e `"cache"` nas seguintes (memória da instância, não persistente). `readServerCache`/`writeServerCache` (`api/lib/serverCache.ts:26,48`) retornam `null`/`persisted:false` sem `BLOB_READ_WRITE_TOKEN`.
- Efeito: todo cold start refaz o bootstrap inteiro (513 + 81 + feed) e o plano B "último snapshot bom" não existe de verdade; o cron das 11h (`vercel.json`) só aquece a instância que o executou.
- Correção: configurar `BLOB_READ_WRITE_TOKEN` em Production (`docs/operations/vercel-environment.md:31` já lista) e conferir `profileBlobCache:true`. Adicionar ao `/api/health` o campo `bootstrapBlob` com idade do snapshot.
- Plano B gratuito se o Blob estourar a cota: snapshot estático em `public/` gerado por GitHub Actions agendada (grátis) e lido como último recurso.

### 2.3 Dependência de um único caminho no servidor, sem snapshot de fábrica
- Se Blob vazio e Câmara fora do ar, `api/bootstrap.ts` devolve 503 e o cliente cai em `POLITICIANS_DB` (lista estática de `constants.ts`) com a mensagem de erro. Não há snapshot completo versionado.
- Correção: commitar `public/snapshots/bootstrap.json` (gerado no build ou por Action) e servi-lo quando `hasDeputies` falhar.

### 2.4 Cache local grava resultado parcial por 12 h
- `hooks/useCamaraData.ts:246` (`fetchSenadores().catch(() => [])`) e `:260-267`: a condição de gravar é só `feeds.length > 0 && parts.length > 0`; **não exige senadores nem deputados completos**. Resultado: cache de 12 h (`:46`) só com deputados. Idem `fetchGlobalVotacoes` (`camaraApi.ts:873`): com `allSettled`, se votações falham mas eventos ok, o feed parcial é gravado 15 min como se fosse completo.
- No ramo do servidor (`:208-235`) o guarda `!serverBootstrap.partial` protege, mas `partial` fica `true` quando só `senado_senadores_unavailable`, então nunca grava (correto) e também nunca se recupera: usuário refaz a carga completa a cada visita enquanto o Senado falhar.
- Correção: gravar com `completo = deputados>=500 && senadores>=79 && feed>0`; se incompleto, gravar com TTL curto (5 min) e marcar `complete:false`; na leitura, ignorar entradas incompletas e mesclar com o último cache bom (como `mergeWithPreviousBootstrap` faz no servidor). Validar contagem mínima (`513`/`81`, ±10%).

### 2.5 Retry sem jitter e sem disjuntor (circuit breaker)
- Cliente `camaraApi.ts:181-207`: backoff dobra (1/2/4 s) mas é determinístico; milhares de clientes sincronizam. 429 só liga `rateLimitedUntil` (60 s) e quase nada consulta (`isApiRateLimited` é usado só no prefetch, `:728`); `fetchAPI` continua batendo.
- Servidor `legislativeBootstrap.ts:360-388`: retry imediato, sem espera, sem `Retry-After`; o "fallback por proxy" chama o **próprio** `/api/camara` (`CAMARA_PROXY_BASE_URL`), que bate no mesmo upstream pelo mesmo egress: não é plano B real e pode somar até 3 x 15 s = 45 s dentro de `maxDuration: 60`.
- Perfil: 5 chamadas por deputado em paralelo + prefetch (`camaraApi.ts:726`) multiplicam carga. Todo tráfego passa pelo IP de saída da Vercel, então a Câmara limita o conjunto de usuários.
- Correção: `backoff = base * 2^n * random(0.5..1.5)`, respeitar `Retry-After`, disjuntor por host (abre após 3 falhas em 30 s, meia-abertura em 60 s) e orçamento de tempo total por requisição. Remover o "proxy próprio" como fallback do servidor.

### 2.6 Proxy `/api/camara` não serve stale em erro
- `api/camara.ts:143`: só respostas 2xx têm `s-maxage`; erro vira `no-store`. Em instabilidade do upstream, cada clique vai ao upstream de novo.
- Correção: `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600, stale-if-error=86400` (conferir suporte do CDN da Vercel a `stale-if-error`); guardar a última resposta boa em Blob por URL para endpoints estáveis (perfil, partidos). Plano B grátis: cache em memória da instância já existente.
- Também: o rate limit do proxy (`RATE_LIMIT = 600` por 5 min) é em memória por instância (`createRateLimiter`), ineficaz com várias instâncias; ok como defesa leve, não conte com ele.

### 2.7 Senado: formato muda entre objeto e array; parsing de XML por regex
- O Senado JSON devolve **objeto quando há 1 item e array quando há vários** (padrão histórico do serviço; hoje os endpoints testados voltaram arrays, inclusive com 1 item, mas a documentação não garante). O servidor usa regex em XML (`legislativeBootstrap.ts:526-589`) e o cliente usa `DOMParser` (`camaraApi.ts:310-395`): dois parsers com resultados diferentes (ex.: mandato em `Mandato` vs `PrimeiraLegislaturaDoMandato`, `role` com ou sem "Senador(a)").
- Correção: um único módulo `domain/legislative/senado.ts` com `asArray()` e validação (zod) e, de preferência, consumir `application/json` (testado: 81 senadores, 129 KB, 0,2 s; XML tem 195 KB). Regex quebra com atributos ou CDATA aninhado.
- Endpoint de votações do Senado está **deprecado**: `plenario/lista/votacao/{ini}/{fim}` informa `DataDesativacaoCompleta: 2026-02-01` e substituto `/dadosabertos/votacao`. O app ainda não usa; ao implementar, usar só o novo.

### 2.8 Paginação e limites que podem truncar sem avisar
- Feed: `itens=10/15/20` fixos e só a 1ª página; ok para "últimas", mas `votacoes` por `dataInicio` 30 dias com `itens=15` pode omitir votações relevantes. Não há aviso de truncamento.
- Despesas: `MAX_EXPENSE_PAGES = 20` x 100 = 2.000 linhas (`camaraApi.ts:511`). Deputado com mais linhas fica `complete:false` e **o gasto total nem aparece** (fail-closed correto, mas sem mensagem). Corrigir buscando por ano (`ano=` + `mes=`) e somando; ou usar o arquivo em lote `despesas/ano` (ver seção 3).
- Câmara limita intervalo de datas a 3 meses em `/votacoes` (testado: 400 "diferença entre as datas não pode ser maior que 3 meses"). Qualquer janela maior precisa ser fatiada.
- Erros da Câmara chegam em dois formatos (`problem+json` com `detail` e JSON `{status,title,code}` sem `type`); o proxy filtra por content-type e transforma tudo em 502, perdendo o motivo. Repassar `status` + `detail` curto (sem vazar URL interna).

### 2.9 Outros achados menores
- `api/cron/refresh-legislative-data.ts` roda 1 vez por dia (`vercel.json`: `0 11 * * *`) e só refaz o bootstrap; não pré-aquece perfis. Com TTL de 15 min, o cron serve só como rede de segurança.
- `enrichDeputiesSexMetadata` faz até 513 chamadas na 1ª carga fria (budget 9 s); como a Câmara já devolve `sexo` em `/deputados/{id}` e não na lista, vale persistir o mapa em Blob (já feito) e pré-popular por snapshot.
- Geocoding via `api.bigdatacloud.net` (terceiro, não oficial) envia coordenadas a uma empresa fora do ecossistema. Alternativa gratuita e oficial para UF por coordenada: malha IBGE (`servicodados.ibge.gov.br/api/v3/malhas/estados?formato=application/vnd.geo+json`) com ponto-em-polígono no cliente; IBGE respondeu 200 em 0,1 s.
- Logos hotlinkados do Wikimedia: sujeitos a bloqueio e a mudança de URL; copiar para `public/` (com a licença de cada arquivo).
- CSP em `vercel.json` ainda está em `Report-Only` e `connect-src` lista hosts que o navegador não usa diretamente em produção (tudo passa pelo proxy); vale revisar quando promover a enforce.

## 3. Oportunidades (priorizadas por valor e esforço)

Legenda: valor A (alto) / M / B; esforço P (pequeno, até 1 dia) / M / G.

| Prioridade | Oportunidade | Valor | Esforço |
|---|---|---|---|
| 1 | **Como a bancada de cada estado votou** (Câmara + Senado) | A | M |
| 2 | **Votações da semana** (Câmara + Senado) | A | P |
| 3 | Pauta do plenário e orientação de bancada em cada votação | A | P |
| 4 | Arquivos em lote da Câmara para tirar carga do dia a dia | M | M |
| 5 | Proposições por tema e frentes parlamentares | M | P |
| 6 | TSE: bens declarados e candidaturas | M | M |
| 7 | Assembleias estaduais (começar por MG) | M | G |
| 8 | Senado: matérias, comissões e agenda | M | M |

### 3.1 Bancada do estado: votos por deputado e por senador
- **Câmara**: `GET /api/v2/votacoes/{id}/votos` devolve TODOS os votos numa chamada, sem paginação (testado: votação `2611313-31`, 396 votos, 0,22 s, 1 link `self`). Campos: `tipoVoto` (Sim, Não, Abstenção, Obstrução, Artigo 17...), `dataRegistroVoto`, e o objeto **`deputado_`** (com underscore) contendo `id`, `nome`, `siglaPartido`, `siglaUf`, `urlFoto`. Agregar por `siglaUf` no servidor e mostrar só contagens (Sim/Não/Abstenção/Ausente), sem adjetivos nem ordenação por partido. Ausentes = `/deputados` (513) menos quem votou.
  - Cuidados: votação simbólica volta `dados: []` (testado: `2620905-56`); mostrar "votação simbólica, sem voto individual". `GET /votacoes/{id}/orientacoes` traz orientação por partido/bloco (`orientacaoVoto`, `siglaPartidoBloco`; pode vir string vazia).
  - Para achar votações nominais: `GET /votacoes?idOrgao=180&dataInicio&dataFim&itens=100` (180 = Plenário; `siglaOrgao` NÃO é filtro válido, devolve 400; janela máxima de 3 meses). Observação de calendário: em outubro de 2026 só houve votações de comissões (período eleitoral); a última votação nominal de plenário que achei foi 03/09/2026.
  - Estabilidade observada: 200 em todas as chamadas, 0,13 a 0,99 s. Não há limite de taxa documentado; tratar como limitado.
  - Tela: `ProfileView` (votos do deputado), `FeedView` (cartão de votação com "Como o seu estado votou") e `RegionPicker`.
- **Senado**: `GET /dadosabertos/votacao?dataInicio=YYYY-MM-DD&dataFim=YYYY-MM-DD` (também `?ano=2026`, `?codigoSessao=`) devolve array com `votos[]` (`codigoParlamentar`, `nomeParlamentar`, `siglaPartidoParlamentar`, `siglaUFParlamentar`, `siglaVotoParlamentar`), totais (`totalVotosSim/Nao/Abstencao`), `votacaoSecreta`, `resultadoVotacao`, `identificacao`, `ementa`. Testado: 38 KB por mês, 0,22 s; `?ano=2026` = 510 KB, 0,44 s.
  - **Atenção: votação secreta** (`votacaoSecreta`/`Secreta: "S"`) traz `siglaVotoParlamentar: "Votou"` sem o sentido do voto. Nunca exibir como voto individual; exibir "voto secreto, apenas total".
  - Formato de data: este endpoint usa `YYYY-MM-DD`; o deprecado usava `YYYYMMDD`.
- Regra de ouro: cada cartão com link para a fonte (`https://www.camara.leg.br/evento-legislativo/{idEvento}` e a página da matéria no Senado).

### 3.2 Votações da semana
- Câmara: `GET /votacoes?dataInicio=<segunda>&dataFim=<domingo>&idOrgao=180&ordem=DESC&ordenarPor=dataHoraRegistro&itens=100` + detalhe `GET /votacoes/{id}` (traz `descUltimaAberturaVotacao`, `ultimaApresentacaoProposicao`, `proposicoesAfetadas`, `aprovacao`, `idEvento`, 7,8 KB, 0,18 s). Senado: `GET /votacao?dataInicio&dataFim`.
- Pré-calcular no cron (hoje diário) e gravar `weekly-votes-v1` no Blob; o front só lê. Tela: aba do `FeedView`.
- Pauta futura: `GET /eventos/{id}/pauta` (testado: 16,7 KB, 0,18 s; campos `ordem`, `topico`, `regime`, `titulo`, `proposicao_` com `ementa`). Combinado com `GET /eventos?dataInicio&dataFim` dá "o que vai a plenário esta semana". Senado: `plenario/agenda/{data}` retornou 404 nos meus testes; não usar sem descobrir o caminho vigente na documentação (swagger em `legis.senado.leg.br/dadosabertos`).

### 3.3 Lotes oficiais da Câmara (reduzem chamadas e viram plano B)
- A Câmara publica arquivos anuais em `https://dadosabertos.camara.leg.br/arquivos/<conjunto>/{json,csv,xlsx}/<conjunto>-<ano>.<ext>`. Testado: `votacoesVotos-2026.csv` existe (HEAD 200, 17,6 MB). Também existem conjuntos de votações, orientações, proposições, despesas e discursos (nomes a confirmar em `dadosabertos.camara.leg.br/swagger/api.html` e na página "Arquivos").
- Uso: ingestão no cron/Action (stream, sem carregar tudo em memória) para montar o agregado "votos por UF por votação" e "despesas totais por deputado/ano", em vez de 20 páginas por deputado.
- Estabilidade: servidor estático (envoy), atualização diária; tamanho grande, então rodar fora da request (Action grátis ou cron com `maxDuration` ampliado).

### 3.4 Temas, frentes, comissões
- `GET /referencias/proposicoes/codTema` (lista de temas fixa, 2,6 KB) + `GET /proposicoes?codTema=40` (testado, 0,99 s; é o mais lento do conjunto) para "projetos por tema".
- `GET /frentes?idLegislatura=57` (títulos), `GET /blocos` (blocos e federações, útil para explicar orientação de bancada), `GET /orgaos` e `GET /deputados/{id}/orgaos` (comissões do deputado; hoje o app não mostra).
- Telas: perfil (comissões e frentes), filtro de categorias no feed.

### 3.5 TSE e transparência federal
- TSE dados abertos (CKAN): `https://dadosabertos.tse.jus.br/api/3/action/package_search?q=candidatos` => 200, 0,2 s, 44 pacotes. Arquivos de candidatos, bens declarados e prestação de contas são ZIPs por eleição (processar offline). Tela: aba "Patrimônio declarado" no perfil (somente quem foi candidato).
- `divulgacandcontas.tse.jus.br` respondeu **403** ao `curl` (barra cliente automatizado), não é confiável como API pública; preferir os ZIPs do CKAN.
- Portal da Transparência (`api.portaldatransparencia.gov.br/api-de-dados`): 401 sem chave; exige cadastro e chave grátis (limites de 90 req/min conforme a documentação). Se entrar, a chave fica só em `api/`. Valor: emendas parlamentares por autor, viagens a serviço, cartão corporativo. Esforço M.
- IBGE (`servicodados.ibge.gov.br/api/v1/localidades/estados`) => 200 em 0,1 s: nomes e códigos de UF/municípios oficiais; útil para trocar o geocoding de terceiros.

### 3.6 Assembleias estaduais (qualidade observada)
| Casa | Resultado do teste de hoje | Qualidade |
|---|---|---|
| ALMG (MG) | `https://dadosabertos.almg.gov.br/api/v2/deputados/em_exercicio?formato=json` => 200, 0,33 s, JSON com `id`, `nome`, `partido`, `tagLocalizacao`; site de documentação 200 | **Boa**: API REST, JSON, documentada. Melhor candidata para piloto |
| ALESP (SP) | Página de dados abertos 200 (HTML, ISO-8859-1); os endpoints XML que tentei deram 404 | Existe portal, mas não confirmei endpoint estável |
| ALERJ (RJ) | `/dados-abertos` redirecionou (302), sem API verificada | Não confirmado |
| ALEGO, CLDF | Portais de transparência (HTML) abrem; sem API JSON confirmada | Não confirmado |
| ALEP (PR), ALESC (SC) | Hosts testados não resolveram/ responderam do meu ambiente (código 000) | Sem dado; testar de novo |
| ALERS, ALBA | Caminhos testados deram 404 | Sem dado |

Recomendação: não prometer cobertura estadual ampla. Entregar MG como piloto atrás de uma interface `AssembleiaProvider` (lista de deputados, votações quando existirem), com marca "fonte: ALMG" e `Cache` em Blob de 24 h. Cada nova casa só entra após teste de estabilidade documentado aqui.

### 3.7 Senado além dos senadores
- Matérias: `GET /materia/pesquisa/lista?ano=2026&sigla=PL` => 200, 280 KB, 0,31 s (grande demais para o front; filtrar no servidor). Comissões: `/comissao/lista/colegiados` respondeu **301** (redirect), seguir a URL nova antes de usar. Agenda: ver 3.2 (404 no caminho tentado).

## 4. Ordem sugerida de execução
1. 2.1 (header do Senado) e 2.2 (token do Blob em produção): minutos de trabalho e removem a causa raiz do incidente.
2. 2.4 (guardas de cache parcial) e 2.5 (jitter + disjuntor).
3. Oportunidade 3.2 (votações da semana) e 3.1 (bancada por estado), ambas sobre o mesmo cron e o mesmo Blob.
4. Snapshot versionado (2.3) e lotes oficiais (3.3) como plano B de fábrica.

Limites desta auditoria: o ambiente de produção não foi alterado; `/api/health` e `/api/bootstrap` foram só lidos. Comportamento de limite de taxa da Câmara e do Senado não foi levado ao limite (evitei carga). Itens marcados "não confirmado" precisam de teste adicional antes de entrar no produto.
