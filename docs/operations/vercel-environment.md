# Variáveis de ambiente na Vercel

Este projeto roda sem integrações opcionais, mas produção estável precisa destes segredos configurados no projeto da Vercel.

## Obrigatórias para operação protegida

| Variável | Ambiente | Uso |
| --- | --- | --- |
| `CRON_SECRET` | Production | Autentica o Vercel Cron em `/api/cron/refresh-legislative-data` e o `?refresh=1` de `/api/bootstrap`. |
| `PROFILE_CACHE_WRITE_SECRET` | Production | Autoriza escritas manuais em `/api/profile-cache` via `PUT`. |

Quando `CRON_SECRET` está configurado, a Vercel envia automaticamente o cabeçalho:

```text
Authorization: Bearer <CRON_SECRET>
```

Sem `CRON_SECRET`, o endpoint de cron retorna `401` em produção por segurança.

### Refresh do bootstrap

- O cron chama `refreshLegislativeBootstrap()` diretamente (sem fazer requisição HTTP à URL pública).
- `GET /api/bootstrap?refresh=1` só reconstrói o cache com `Authorization: Bearer <CRON_SECRET>`. Sem o cabeçalho (ou com token inválido), o parâmetro é ignorado e o cache normal é servido. Sem `CRON_SECRET` em produção, o refresh também é ignorado.
- Quando o TTL (15 min) expira, a API serve o cache antigo (`source: "stale-cache"`) e reconstrói em segundo plano, com uma única reconstrução simultânea por instância.
- Um resultado parcial nunca sobrescreve um cache bom: se Senado ou feed falharem na nova coleta, as partes boas do cache anterior são preservadas.

## Opcionais

| Variável | Ambiente | Uso |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Production | Persiste bootstrap e cache de perfil no Vercel Blob. |
| `API_KEY` | Production | Ativa recursos opcionais de IA. |
| `APP_PUBLIC_URL` | Production | Origem pública usada no `User-Agent` e no proxy de fallback do servidor. Padrão: `https://papo-reto-beige.vercel.app`. |
| `VITE_PUBLIC_API_ORIGIN` | Production/Preview | Define a origem pública das APIs quando necessário. |
| `VITE_BOOTSTRAP_ENDPOINT` | Production/Preview | Sobrescreve o endpoint inicial de bootstrap. |
| `VITE_LEGISLATIVE_API_PROXY` | Production/Preview | Sobrescreve o proxy legislativo. |
| `VITE_PROFILE_CACHE_ENDPOINT` | Production/Preview | Sobrescreve o cache de perfil. |

## Validação depois de configurar

```bash
npm run smoke:prod
```

O smoke verifica app publicado, healthcheck, bootstrap com deputados, proxy restrito e proteção do cron (que deve responder exatamente `401` sem token).
