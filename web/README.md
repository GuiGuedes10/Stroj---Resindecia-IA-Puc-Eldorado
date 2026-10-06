# Stroj — front-end

As telas da seção 3 do arquivo de design (`Stroj Frames.html`): entrada da
notícia e os três resultados, mais os estados de carregamento e de erro.

Vite + React + TypeScript, CSS puro. O design system Nocturne está em
`src/styles/nocturne.css`, copiado do arquivo de design.

## Como rodar

```bash
cd web
pnpm install
pnpm dev            # com o mock ligado: http://localhost:5173
```

Mais dois comandos, quando precisar:

```bash
pnpm test           # os testes das funções puras
pnpm build          # typecheck + build de produção em dist/
```

## Mock ou backend

`.env.development` já vem com `VITE_STROJ_MOCK=1`: o app responde com as três
respostas dos frames 3b, 3c e 3d, sem backend nenhum.

Para falar com o FastAPI, ponha `VITE_STROJ_MOCK=0` e ajuste
`VITE_STROJ_API_URL` (veja `.env.example`).

Com o mock ligado, o que volta depende da entrada:

| Entrada | Resposta |
| --- | --- |
| qualquer link | frame 3b — classificação clara, 87% / 13% |
| texto com "imposto" | frame 3c — probabilidades próximas, 54% / 46% |
| texto com "prefeitura" | frame 3d — sem conteúdo relacionado, 9% / 91% |
| outro texto | alterna entre 3b, 3c e 3d |

E os estados de erro, incluindo na entrada: `#erro-rede`, `#erro-pagina`,
`#erro-classificacao`.

## Onde mexer quando o backend mudar

`src/api/contract.ts`, e só ele. Os tipos da resposta, a normalização e a
tradução dos erros vivem lá; o resto do app conhece apenas o tipo `Analysis`.
