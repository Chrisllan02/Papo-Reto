# Auditoria completa (29/10/2026)

Quatro frentes auditadas (api, camada de dados, interface, CI/config) e corrigidas nos commits e238db7, b3397c4, db78a27 e 1e53fd2. Lint, tipos, 173 testes, build e audit passam.

## Pendente (decisão ou infraestrutura)

- Rate limit ainda em memória por instância (`api/lib/rateLimit.ts`). Saída grátis: regra de rate limit no Vercel Firewall ou Upstash Redis grátis.
- CSP em `vercel.json` segue `Report-Only` com `'unsafe-inline'`; endurecer exige teste em produção.
- Localização (`utils/location.ts`) envia coordenadas com ~1 km a api.bigdatacloud.net; reduzir a precisão erra a UF perto de divisa (decisão de produto).
- Imagem gerada por IA nas notícias (`services/ai.ts`) não aparece em nenhuma tela; decidir se continua.
- PCdoB, PV, Rede, Solidariedade, PRD, Cidadania e Missão não têm ideologia com fonte e passam a aparecer como "Não classificado".
- Alvo de build do Vite inclui Safari 14; não auditado se há API nova sem tradução.

## Depois do deploy

- Conferir que `api/` empacota os imports de `domain/legislative/*.js` (não testado na Vercel).
- Os nomes em minúsculo e o rótulo "Proposição" só se corrigem quando o bootstrap for regenerado pelo código novo.
