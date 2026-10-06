# Stroj — Residência IA PUC Eldorado

Classificação de notícias em português: o texto (ou o link da notícia) passa
pelo BERTimbau, um classificador estima se ele se parece mais com notícias
falsas ou verdadeiras, e uma busca traz outras coberturas do mesmo assunto.

| Pasta | O que tem |
| --- | --- |
| `app/` | Backend em FastAPI (`POST /news/check`) |
| `web/` | Frontend em Vite + React + TypeScript |
| `model/` | Notebooks de treino (`supervised/`, `unsupervised/`) |
| `training_data/` | Datasets e notebooks de preparação e EDA |

## Como rodar

São dois processos: o backend em `:8000` e o frontend em `:5173`.

### Backend

Precisa de Python 3.12, 3.13 ou 3.14 (o `numpy==2.5.2` exige 3.12+; o
`torch==2.14.0` ainda não tem versão para 3.15).

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp app/.env.example app/.env       # opcional: sem ele valem os padrões
cd app
python main.py                     # http://127.0.0.1:8000 — documentação em /docs
```

Na primeira execução o BERTimbau (`neuralmind/bert-base-portuguese-cased`,
cerca de 400 MB) é baixado do Hugging Face.

### Frontend

Precisa de Node 20.19+ ou 22.12+ (exigência do Vite 7) e pnpm.

```bash
cd web
pnpm install
pnpm dev                           # http://localhost:5173, falando com o backend
pnpm dev:mock                      # sem backend, com respostas de exemplo
```

## API

`POST /news/check`, com o texto ou o link no mesmo campo:

```json
{ "request": "https://g1.globo.com/... ou o texto da notícia" }
```

Resposta:

```json
{
  "text": "texto analisado (o da página, quando a entrada é link)",
  "prediction": 0,
  "probabilities": [0.87, 0.13],
  "related": [{ "title": "...", "url": "...", "snippet": "..." }]
}
```

`prediction` segue os rótulos do dataset: `0` = falsa, `1` = verdadeira.
`probabilities` vem na mesma ordem: `[falsa, verdadeira]`.

Erros vêm como `{"error": {"code": "...", "message": "..."}}`:

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `text_too_short` | `request` ausente ou vazio |
| 400 | `invalid_request` | corpo não é JSON |
| 413 | `text_too_long` | mais de 20.000 caracteres |
| 429 | `rate_limited` | passou do `RATE_LIMIT` (padrão: 5 por minuto por IP) |
| 502 | `page_unreachable` | o link não abriu ou a página não tinha texto |
| 500 | `classification_failed` | erro no modelo |

Se a busca de conteúdos relacionados falhar, a resposta sai com `related: []`
em vez de erro.

## Configuração do backend

Tudo em `app/.env` (veja `app/.env.example`). Por padrão o backend usa o
modelo final da documentação (seção 7.5), a Regressão Logística de
`model/supervised/results/`, com as 4 features de texto padronizadas pelo
`app/model/scaler.pkl` (seção 5.4). Para usar o SVM, baseline do estudo:

```dotenv
CLASSIFICATION_MODEL="model/svm_(rbf)_model.pkl"
```

O backend aceita modelos com 768 features (só o BERT) ou 772 (BERT + as 4
features de texto) e decide pelo `n_features_in_` do modelo. `SCALER_MODEL`
vazio desliga a padronização das 4 features.

## Testes

```bash
python -m pytest app/tests         # contrato da API, sem rede e sem baixar o BERT
cd web && pnpm test                # funções puras do front
```
