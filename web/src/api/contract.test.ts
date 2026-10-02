import { describe, expect, it } from 'vitest';

import {
  ApiError,
  domainFromUrl,
  isThinExtraction,
  THIN_EXTRACTION_MAX_LENGTH,
  mapErrorCode,
  mapHttpStatus,
  normalizePrediction,
  normalizeProbabilities,
  parsePredict,
} from './contract';

describe('normalizeProbabilities', () => {
  it('aceita 0–1', () => {
    expect(normalizeProbabilities({ fake: 0.87, true: 0.13 })).toEqual({ fake: 0.87, true: 0.13 });
  });

  it('aceita 0–100', () => {
    const result = normalizeProbabilities({ fake: 87, true: 13 });
    expect(result?.fake).toBeCloseTo(0.87);
    expect(result?.true).toBeCloseTo(0.13);
  });

  it('aceita tupla', () => {
    expect(normalizeProbabilities([0.09, 0.91])).toEqual({ fake: 0.09, true: 0.91 });
  });

  it('completa o lado que falta', () => {
    const result = normalizeProbabilities({ fake: 0.87 });
    expect(result?.true).toBeCloseTo(0.13);
  });

  it('reescala soma imprecisa para 1', () => {
    const result = normalizeProbabilities({ fake: 0.6, true: 0.6 });
    expect(result?.fake).toBeCloseTo(0.5);
    expect((result?.fake ?? 0) + (result?.true ?? 0)).toBeCloseTo(1);
  });

  it('devolve null sem nada utilizável', () => {
    expect(normalizeProbabilities(undefined)).toBeNull();
    expect(normalizeProbabilities({})).toBeNull();
    expect(normalizeProbabilities({ fake: 0, true: 0 })).toBeNull();
  });
});

describe('normalizePrediction', () => {
  it('lê as duas classes em inglês e em português', () => {
    expect(normalizePrediction('fake')).toBe('fake');
    expect(normalizePrediction('Falsa')).toBe('fake');
    expect(normalizePrediction('true')).toBe('true');
    expect(normalizePrediction('verdadeira')).toBe('true');
  });

  it('lê a convenção 0/1 do dataset', () => {
    expect(normalizePrediction(0)).toBe('fake');
    expect(normalizePrediction(1)).toBe('true');
  });

  it('não inventa classe a partir de um número inconclusivo', () => {
    // É o que app/main.py devolve hoje: {"prediction": 0.5}.
    expect(normalizePrediction(0.5)).toBeNull();
    expect(normalizePrediction(undefined)).toBeNull();
    expect(normalizePrediction('talvez')).toBeNull();
  });
});

describe('domainFromUrl', () => {
  it('mantém o www., como nos frames', () => {
    expect(domainFromUrl('https://www.band.uol.com.br/noticias/x')).toBe('www.band.uol.com.br');
    expect(domainFromUrl('https://g1.globo.com/sp/x.ghtml')).toBe('g1.globo.com');
  });

  it('devolve string vazia para URL inválida', () => {
    expect(domainFromUrl('nem url')).toBe('');
  });
});

describe('parsePredict', () => {
  const wire = {
    text: 'texto extraído da página',
    prediction: 'fake',
    probabilities: { fake: 0.87, true: 0.13 },
    related: [
      {
        url: 'https://g1.globo.com/sp/x.ghtml',
        title: 'Colisão na Marginal Tietê deixa feridos na manhã desta terça',
        snippet: 'Acidente envolvendo três veículos.',
      },
    ],
    url: 'https://g1.globo.com/sp/sao-paulo/noticia.ghtml',
  };

  it('converte a resposta completa', () => {
    const result = parsePredict(wire, 'enviado');
    expect(result.text).toBe('texto extraído da página');
    expect(result.prediction).toBe('fake');
    expect(result.probabilities).toEqual({ fake: 0.87, true: 0.13 });
    expect(result.related).toHaveLength(1);
    expect(result.related[0].domain).toBe('g1.globo.com');
    expect(result.sourceUrl).toBe('https://g1.globo.com/sp/sao-paulo/noticia.ghtml');
  });

  it('usa o texto enviado quando o backend não devolve text', () => {
    expect(parsePredict({ ...wire, text: undefined }, 'enviado').text).toBe('enviado');
  });

  it('deriva a classe das probabilidades quando prediction não serve', () => {
    const result = parsePredict({ ...wire, prediction: 0.5 }, 'enviado');
    expect(result.prediction).toBe('fake');
  });

  it('trata related ausente como lista vazia (frame 3d)', () => {
    expect(parsePredict({ ...wire, related: undefined }, 'enviado').related).toEqual([]);
  });

  it('descarta item relacionado sem URL ou sem título', () => {
    const result = parsePredict(
      { ...wire, related: [{ title: 'sem url' }, { url: 'https://x.com/a' }] },
      'enviado',
    );
    expect(result.related).toEqual([]);
  });

  it('falha quando não há probabilidades — é a resposta do backend hoje', () => {
    expect(() => parsePredict({ prediction: 0.5 }, 'enviado')).toThrow(ApiError);
  });

  it('propaga erro vindo no corpo', () => {
    expect(() => parsePredict({ error: { code: 'url_unreachable' } }, 'enviado')).toThrow(
      expect.objectContaining({ code: 'page_unreachable' }),
    );
  });
});

describe('isThinExtraction', () => {
  const longo = 'a'.repeat(THIN_EXTRACTION_MAX_LENGTH);

  it('acusa página que rendeu pouco texto', () => {
    expect(isThinExtraction('Assine para continuar lendo.', 'https://x.com/a')).toBe(true);
  });

  it('não acusa matéria inteira', () => {
    expect(isThinExtraction(longo, 'https://x.com/a')).toBe(false);
  });

  it('o piso da extração é independente do mínimo da entrada', () => {
    // Uma manchete colada passa na validação da entrada (30 caracteres),
    // mas uma página que devolve só isso não entregou a matéria.
    const manchete = 'Acidente na Marginal Tietê deixa 12 feridos';
    expect(manchete.length).toBeLessThan(THIN_EXTRACTION_MAX_LENGTH);
    expect(isThinExtraction(manchete, 'https://g1.globo.com/sp/x.ghtml')).toBe(true);
    expect(isThinExtraction(manchete, null)).toBe(false);
  });

  it('não acusa o texto do frame 3b, que é curto mas legítimo', () => {
    const frame3b =
      'Acidente na Marginal Tietê deixa 12 feridos na manhã de hoje. Confirmado: as vias ' +
      'sentido Castello Branco seguem interditadas e o trânsito está parado desde a Ponte ' +
      'das Bandeiras. Compartilhe para avisar quem vai passar por lá!!';
    expect(isThinExtraction(frame3b, 'https://g1.globo.com/sp/x.ghtml')).toBe(false);
  });

  it('não se aplica a texto colado', () => {
    expect(isThinExtraction('curto', null)).toBe(false);
  });
});

describe('parsePredict e a extração', () => {
  const base = {
    prediction: 'fake',
    probabilities: { fake: 0.73, true: 0.27 },
    url: 'https://exemplo.com.br/paywall',
  };

  it('marca extração pobre pela heurística', () => {
    expect(parsePredict({ ...base, text: 'Assine para continuar lendo.' }, 'x').thinExtraction).toBe(
      true,
    );
  });

  it('o backend tem a última palavra sobre a heurística', () => {
    const result = parsePredict(
      { ...base, text: 'Assine para continuar lendo.', extraction: { thin: false } },
      'x',
    );
    expect(result.thinExtraction).toBe(false);
  });

  it('texto colado nunca é extração pobre', () => {
    const result = parsePredict({ ...base, url: undefined, text: 'curto' }, 'curto');
    expect(result.thinExtraction).toBe(false);
  });
});

describe('mapeamento de erros', () => {
  it('traduz códigos do servidor', () => {
    expect(mapErrorCode('URL_UNREACHABLE')).toBe('page_unreachable');
    expect(mapErrorCode('text_too_long')).toBe('text_too_long');
    expect(mapErrorCode('qualquer-coisa')).toBe('classification_failed');
  });

  it('traduz status HTTP', () => {
    expect(mapHttpStatus(422)).toBe('text_too_short');
    expect(mapHttpStatus(413)).toBe('text_too_long');
    expect(mapHttpStatus(502)).toBe('page_unreachable');
    expect(mapHttpStatus(500)).toBe('classification_failed');
  });
});
