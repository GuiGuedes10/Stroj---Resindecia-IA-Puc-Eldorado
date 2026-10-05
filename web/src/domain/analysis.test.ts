import { describe, expect, it } from 'vitest';

import type { Analysis } from '../api/contract';
import { copy } from '../copy/pt-BR';
import { isInconclusive, toAnalysisView, toPercentages } from './analysis';

function analysis(fake: number, truthy: number, thinExtraction = false): Analysis {
  return {
    text: 'texto',
    prediction: fake >= truthy ? 'fake' : 'true',
    probabilities: { fake, true: truthy },
    related: [],
    sourceUrl: null,
    thinExtraction,
  };
}

describe('toPercentages', () => {
  it('reproduz os números dos frames', () => {
    expect(toPercentages({ fake: 0.87, true: 0.13 })).toEqual({ fake: 87, true: 13 });
    expect(toPercentages({ fake: 0.54, true: 0.46 })).toEqual({ fake: 54, true: 46 });
    expect(toPercentages({ fake: 0.09, true: 0.91 })).toEqual({ fake: 9, true: 91 });
  });

  it('sempre soma 100, mesmo quando o arredondamento sobraria', () => {
    for (const fake of [0.005, 0.125, 0.335, 0.5, 0.665, 0.995]) {
      const result = toPercentages({ fake, true: 1 - fake });
      expect(result.fake + result.true).toBe(100);
    }
  });
});

describe('isInconclusive', () => {
  it('é falso nos frames 3b e 3d', () => {
    expect(isInconclusive({ fake: 0.87, true: 0.13 })).toBe(false);
    expect(isInconclusive({ fake: 0.09, true: 0.91 })).toBe(false);
  });

  it('é verdadeiro no frame 3c', () => {
    expect(isInconclusive({ fake: 0.54, true: 0.46 })).toBe(true);
  });

  it('corta em 20 pontos de diferença', () => {
    expect(isInconclusive({ fake: 0.599, true: 0.401 })).toBe(true);
    expect(isInconclusive({ fake: 0.6, true: 0.4 })).toBe(false);
  });
});

describe('toAnalysisView', () => {
  it('frame 3b: título de notícia falsa e explicação do caso claro', () => {
    const view = toAnalysisView(analysis(0.87, 0.13));
    expect(view.title).toBe(copy.result.titleFake);
    expect(view.explanation).toBe(copy.result.explanationClear);
    expect(view.winner).toBe('fake');
    expect(view.inconclusive).toBe(false);
  });

  it('frame 3c: título e explicação próprios das probabilidades próximas', () => {
    const view = toAnalysisView(analysis(0.54, 0.46));
    expect(view.title).toBe(copy.result.titleInconclusive);
    expect(view.explanation).toBe(copy.result.explanationInconclusive);
    expect(view.inconclusive).toBe(true);
  });

  it('frame 3d: título de notícia verdadeira', () => {
    const view = toAnalysisView(analysis(0.09, 0.91));
    expect(view.title).toBe(copy.result.titleTrue);
    expect(view.percentages).toEqual({ fake: 9, true: 91 });
  });

  it('extração pobre suprime a classificação, por mais clara que ela seja', () => {
    const view = toAnalysisView(analysis(0.87, 0.13, true));
    expect(view.thinExtraction).toBe(true);
    expect(view.title).toBe(copy.result.titleThinExtraction);
    expect(view.explanation).toBe(copy.result.explanationThinExtraction);
  });

  it('extração pobre vence também o caso de probabilidades próximas', () => {
    expect(toAnalysisView(analysis(0.54, 0.46, true)).title).toBe(
      copy.result.titleThinExtraction,
    );
  });

  it('no empate exato, usa a classe que o backend mandou', () => {
    const tied: Analysis = { ...analysis(0.5, 0.5), prediction: 'true' };
    expect(toAnalysisView(tied).winner).toBe('true');
  });
});
