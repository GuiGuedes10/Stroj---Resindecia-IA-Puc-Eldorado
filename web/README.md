# Stroj — front-end

As telas da seção 3 do arquivo de design (`Stroj Frames.html`): entrada da
notícia e os três resultados, mais os estados de carregamento e de erro.

Vite + React + TypeScript, CSS puro. O design system Nocturne está em
`src/styles/nocturne.css`, copiado do arquivo de design.

## Como rodar

```bash
cd web
pnpm install
pnpm dev            # http://localhost:5173, falando com o backend em :8000
pnpm dev:mock       # http://localhost:5173, com o mock e sem backend
```

Para subir o backend, veja o README da raiz do repositório.

Mais dois comandos, quando precisar:

```bash
pnpm test           # os testes das funções puras
pnpm build          # typecheck + build de produção em dist/
```

## Mock ou backend

`pnpm dev` usa `.env.development`, que aponta para o FastAPI em
`http://localhost:8000` (`POST /news/check`). O backend precisa estar no ar e
liberar a origem do front no CORS (`CORS_ORIGINS` em `app/.env`; o padrão já
inclui `http://localhost:5173`).

`pnpm dev:mock` usa `.env.mock`: o app responde com as três respostas dos
frames 3b, 3c e 3d, sem backend nenhum.

Com o mock ligado, o que volta depende da entrada:

| Entrada | Resposta |
| --- | --- |
| qualquer link | frame 3b — classificação clara, 87% / 13% |
| texto com "imposto" | frame 3c — probabilidades próximas, 54% / 46% |
| texto com "prefeitura" | frame 3d — sem conteúdo relacionado, 9% / 91% |
| outro texto | alterna entre 3b, 3c e 3d |
| link com `#pouco-texto` | extração pobre: a classificação some |

E os estados de erro, incluindo numa entrada válida (link, ou texto com 30+
caracteres e 4+ palavras): `#erro-rede`, `#erro-pagina`,
`#erro-classificacao`, `#erro-limite`.

## Onde mexer quando o backend mudar

`src/api/contract.ts` para o formato da resposta e dos erros, e
`src/api/client.ts` para o endpoint (`/news/check`). O resto do app conhece
apenas o tipo `Analysis`.
