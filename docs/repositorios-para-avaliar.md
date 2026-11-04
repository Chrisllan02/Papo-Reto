# Repositórios avaliados

Indicados pelo Chris e avaliados em 04/11/2026. Endpoints testados de verdade, a partir do Mac, nessa data.

## Veredito

| Repositório | Decisão | Motivo |
|---|---|---|
| `mcp-brasil/mcp-brasil` (MIT, push em 19/09/2026) | Usar como mapa de fontes | É Python e foi feito para agentes de IA, não entra no app. Serve para descobrir endpoints oficiais. |
| `BrasilAPI/BrasilAPI` (MIT) | Não adotar | Só intermedia dados que não são do Congresso. A rota de UF deu 504 duas vezes; a API oficial do IBGE respondeu 200. |
| `dadosgovbr` | Não adotar | Repositórios parados (o mais recente é de 2021) e voltados à infraestrutura CKAN. |
| `ApiBR` | Não adotar | Bancos, esportes e vagas: fora do tema. |

## Fontes que valem trazer

1. **Presença do Senado**: `https://legis.senado.leg.br/dadosabertos/votacao?dataInicio=AAAA-MM-DD&dataFim=AAAA-MM-DD`. Sem chave, JSON, com o voto de cada senador (3 votações e 81 votos por votação em outubro de 2026). Completa o bloco Presença da tela Números.
2. **Cota do Senado**: `https://www.senado.gov.br/transparencia/LAI/verba/despesa_ceaps_2026.csv`. Sem chave, 3,8 MB, atualizado em 04/11/2026. Separador `;`, texto fora de UTF-8, e a primeira linha é a data de atualização. Recusa pedido com `Accept: application/json` (406). Completa o bloco Cota.
3. **Emendas Pix**: `https://api.transferegov.gestao.gov.br/transferenciasespeciais/plano_acao_especial`. Sem chave, com nome e código do parlamentar, beneficiário, UF e valores. Novidade para o perfil de cada político; o app ainda não mostra emendas por parlamentar.

## Depende de algo fora do código

- **Portal da Transparência** (`api.portaldatransparencia.gov.br`): respondeu 401 sem chave. A chave é gratuita, mas o cadastro é do Chris.
- **TSE DivulgaCand** (`divulgacandcontas.tse.jus.br/divulga/rest/v1`): respondeu 403 mesmo com User-Agent de navegador. Para bens e contas de campanha, testar os arquivos em massa do TSE; ainda não testado.
