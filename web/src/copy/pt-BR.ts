/**
 * Toda a copy da interface, num lugar só.
 *
 * As strings sem marca vêm palavra por palavra do arquivo de design
 * (Stroj Frames.html, seção 3 e frames 2b/2c). As marcadas com COPY NOVA
 * foram propostas na Fase 1 e aprovadas: o arquivo não as tem.
 */

export const copy = {
  brand: 'Stroj',

  input: {
    title: 'Cole o texto ou o link da notícia',
    subtitle: 'Um endereço de página ou o texto completo do post.',
    /** COPY NOVA — o arquivo trazia "https://…"; "URL" é mais direto. */
    placeholder: 'URL ou o texto da notícia',
    /** Rótulo do campo, invisível: o título já é o rótulo visual da tela. */
    fieldLabel: 'Cole o texto ou o link da notícia',
    submit: 'Analisar texto',
    /** COPY NOVA — adaptada de "Buscando cobertura…" (frame 2b). */
    submitLoading: 'Analisando texto…',
    /** Frame 2c, palavra por palavra. */
    submitRetry: 'Tentar de novo',
    privacy: 'O conteúdo enviado é usado apenas para esta consulta.',
    /**
     * COPY NOVA — adaptada de "Lendo a página e procurando outros veículos.
     * Costuma levar alguns segundos." (frame 2b), com o vocabulário da seção 3.
     */
    loadingHintLink:
      'Lendo a página, classificando o texto e buscando conteúdos relacionados. Costuma levar alguns segundos.',
    /** COPY NOVA — a mesma dica quando a entrada é texto colado, sem a leitura da página. */
    loadingHintText:
      'Classificando o texto e buscando conteúdos relacionados. Costuma levar alguns segundos.',
  },

  steps: [
    {
      kicker: '1 · Lemos',
      body: 'Se você enviar um link, extraímos o texto da página. Se colar o texto, usamos ele como está.',
    },
    {
      kicker: '2 · Classificamos',
      /**
       * COPY NOVA — "compara a forma como o texto é escrito" no lugar de
       * "estima a probabilidade": é o que o modelo faz de fato (padrões
       * linguísticos sobre embeddings do BERTimbau, seção 3.2 da
       * documentação) e já prepara o leitor para a frase do resultado sobre
       * não conferir fatos.
       */
      body: 'Um modelo treinado com milhares de notícias em português compara a forma como o texto é escrito com a de notícias já classificadas como falsas ou verdadeiras.',
    },
    {
      kicker: '3 · Relacionamos',
      /**
       * COPY NOVA — descreve o crawler como a seção 2.5 da documentação:
       * busca por termos-chave em veículos de imprensa e mecanismos de
       * busca, para identificar quem já cobriu o mesmo evento.
       */
      body: 'Procuramos os termos-chave da notícia em veículos de imprensa e buscadores, para você ver quem mais cobriu o mesmo fato — e comparar.',
    },
  ],

  errors: {
    /** Frame 2c, palavra por palavra. */
    pageUnreachable:
      'Não conseguimos abrir essa página. Ela pode exigir login ou ter sido removida. Você pode colar o texto da notícia no lugar do link.',
    /** COPY NOVA */
    network: 'Não foi possível falar com o servidor. Verifique sua conexão e tente de novo.',
    /** COPY NOVA — texto definido por você. */
    textTooShort: 'Esse texto é curto demais para analisar. Cole um trecho maior da notícia.',
    /** COPY NOVA */
    textTooLong:
      'Esse texto é longo demais. Cole no máximo 20.000 caracteres — cerca de uma matéria inteira.',
    /** COPY NOVA — o backend limita as consultas por minuto (RATE_LIMIT em app/.env). */
    rateLimited: 'Muitas consultas em pouco tempo. Aguarde um minuto e tente de novo.',
    /** COPY NOVA */
    classificationFailed:
      'Não conseguimos classificar este texto agora. Tente de novo em alguns instantes.',
  },

  result: {
    /** COPY NOVA — a origem quando a entrada não foi um link. Frames 3c e 3d. */
    pastedText: 'Texto colado',
    newQuery: 'Nova consulta',
    labelClassification: 'Classificação do modelo',
    labelRelated: 'Conteúdos relacionados',
    labelAnalyzedText: 'Texto analisado',
    titleFake: 'O texto se parece mais com notícias falsas',
    titleTrue: 'O texto se parece mais com notícias verdadeiras',
    titleInconclusive: 'O modelo não distingue bem este texto',
    /**
     * A primeira frase é do arquivo de design. A segunda vem da seção 2.1 da
     * documentação: notícias falsas mimetizam a estrutura estética e
     * linguística dos veículos tradicionais — é o motivo de o número sozinho
     * não bastar.
     */
    explanationClear:
      'O modelo compara padrões de escrita com notícias que já conhece. Ele não confere os fatos — e notícias falsas bem escritas imitam o estilo da imprensa. Confira nos conteúdos relacionados antes de concluir.',
    explanationInconclusive:
      'As duas probabilidades estão próximas, então a classificação diz pouco sobre este texto. Os conteúdos relacionados são o melhor ponto de partida.',
    /** COPY NOVA — extração pobre: a classificação é suprimida (sugestão 3). */
    titleThinExtraction: 'Extraímos pouco texto desta página',
    /** COPY NOVA */
    explanationThinExtraction:
      'O que conseguimos ler é curto demais para a classificação dizer alguma coisa — a página pode exigir login ou ter carregado só o começo da matéria. Cole o texto da notícia e analise de novo.',
    labelFake: 'Falsa',
    labelTrue: 'Verdadeira',
    relatedEmpty: 'Nenhum conteúdo relacionado encontrado para este texto.',
    /**
     * COPY NOVA — o objetivo declarado do trabalho ("incentivar o pensamento
     * crítico [...] estimulando a verificação em múltiplas fontes", Resumo)
     * não aparecia em lugar nenhum da interface. Só é exibida quando há
     * classificação: sem estimativa, a frase não teria do que falar.
     */
    limitNote:
      'Este resultado é uma estimativa, não um veredito. Confirme em mais de uma fonte antes de compartilhar.',
    showFullText: 'Mostrar texto completo',
    /** COPY NOVA — o rótulo alternado do mesmo botão. */
    showLessText: 'Mostrar menos',
    /** COPY NOVA — só para leitores de tela, nos links externos. */
    opensInNewTab: '(abre em nova aba)',
  },

  a11y: {
    /** COPY NOVA — anúncios da região aria-live. */
    announceLoading: 'Analisando o texto.',
    /**
     * COPY NOVA — o título fica de fora de propósito: ao terminar, o foco vai
     * para o h1 do resultado e o leitor de tela já lê esse texto. Repetir aqui
     * faria o usuário ouvir a mesma frase duas vezes.
     */
    announceResult: (trueP: number, fake: number, related: number) =>
      `Verdadeira ${trueP}%, Falsa ${fake}%. ` +
      (related === 0
        ? 'Nenhum conteúdo relacionado.'
        : related === 1
          ? '1 conteúdo relacionado.'
          : `${related} conteúdos relacionados.`),
    /** COPY NOVA — anúncio quando a classificação é suprimida; idem, sem o título. */
    announceThinExtraction: (related: number) =>
      'Sem classificação. ' +
      (related === 0
        ? 'Nenhum conteúdo relacionado.'
        : related === 1
          ? '1 conteúdo relacionado.'
          : `${related} conteúdos relacionados.`),
    /**
     * COPY NOVA — texto equivalente da barra, na mesma ordem em que ela é
     * desenhada: Verdadeira à esquerda, Falsa à direita.
     */
    probabilityBar: (trueP: number, fake: number) =>
      `Probabilidades do modelo: Verdadeira ${trueP}%, Falsa ${fake}%.`,
  },
} as const;
