# Variáveis de ambiente na Vercel

Este projeto roda sem integrações opcionais, mas produção estável precisa destes segredos configurados no projeto da Vercel.

## Obrigatórias para operação protegida

| Variável | Ambiente | Uso |
| --- | --- | --- |
| `CRON_SECRET` | Production | Autentica o Vercel Cron em `/api/cron/refresh-legislative-data`. |
| `PROFILE_CACHE_WRITE_SECRET` | Production | Autoriza escritas manuais em `/api/profile-cache` via `PUT`. |

Quando `CRON_SECRET` está configurado, a Vercel envia automaticamente o cabeçalho:

```text
Authorization: Bearer <CRON_SECRET>
```

Sem `CRON_SECRET`, o endpoint de cron retorna `401` em produção por segurança.

## Opcionais

| Variável | Ambiente | Uso |
| --- | --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Production | Persiste bootstrap e cache de perfil no Vercel Blob. |
| `API_KEY` | Production | Ativa recursos opcionais de IA. |
| `VITE_PUBLIC_API_ORIGIN` | Production/Preview | Define a origem pública das APIs quando necessário. |
| `VITE_BOOTSTRAP_ENDPOINT` | Production/Preview | Sobrescreve o endpoint inicial de bootstrap. |
| `VITE_LEGISLATIVE_API_PROXY` | Production/Preview | Sobrescreve o proxy legislativo. |
| `VITE_PROFILE_CACHE_ENDPOINT` | Production/Preview | Sobrescreve o cache de perfil. |

## Validação depois de configurar

```bash
npm run smoke:prod
```

O smoke verifica app publicado, healthcheck, bootstrap com deputados, proxy restrito e proteção do cron.
