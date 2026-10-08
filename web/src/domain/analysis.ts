/**
 * Regras de leitura do resultado: percentuais, o limiar que decide o título
 * e o resumo para leitores de tela. Funções puras.
 */

import type { Analysis, PredictionClass } from '../api/contract';
import { copy } from '../copy/pt-BR';

/**
 * Diferença mínima entre as duas probabilidades para a classificação contar
 * como clara. Abaixo dela, a tela usa o título e a explicação do frame 3c.
 *
 * 0.20 separa os três exemplos do arquivo com folga: 87/13 e 9/91 ficam muito
 * acima, e 54/46 (diferença de 8 pontos) cai em 3c.
 */
export const INCONCLUSIVE_MAX_DIFFERENCE = 0.2;

export interface AnalysisView {
  /** Percentuais inteiros que somam 100 — os mesmos usados na barra. */
  percentages: Record<PredictionClass, number>;
  /** `true` quando as probabilidades estão próximas (caso 3c). */
  inconclusive: boolean;
  /**
   * `true` quando a página rendeu pouco texto. A barra não é renderizada:
   * um número sobre três frases de paywall é pior que número nenhum.
   */
  thinExtraction: boolean;
  /** Classe com a maior probabilidade. */
  winner: PredictionClass;
  title: string;
  explanation: string;
}

/**
 * Arredonda o par para inteiros que somam 100: arredonda `fake` e dá o resto
 * para `true`, para a barra nunca sobrar nem faltar um ponto.
 */
export function toPercentages(
  probabilities: Record<PredictionClass, number>,
): Record<PredictionClass, number> {
  const fake = Math.round(probabilities.fake * 100);
  const clamped = Math.min(100, Math.max(0, fake));
  return { fake: clamped, true: 100 - clamped };
}

/**
 * Margem para a comparação de ponto flutuante: `0.6 - 0.4` dá
 * 0.19999999999999998, e sem ela um 60/40 exato cairia no caso 3c por um
 * erro de representação.
 */
const EPSILON = 1e-9;

export function isInconclusive(probabilities: Record<PredictionClass, number>): boolean {
  const difference = Math.abs(probabilities.fake - probabilities.true);
  return difference < INCONCLUSIVE_MAX_DIFFERENCE - EPSILON;
}

export function toAnalysisView(analysis: Analysis): AnalysisView {
  const { probabilities, prediction } = analysis;
  const percentages = toPercentages(probabilities);
  const inconclusive = isInconclusive(probabilities);
  const winner: PredictionClass =
    probabilities.fake === probabilities.true
      ? prediction
      : probabilities.fake > probabilities.true
        ? 'fake'
        : 'true';

  // A extração pobre vem antes de tudo: sem texto, a probabilidade não
  // descreve a notícia, descreve o que sobrou da página.
  if (analysis.thinExtraction) {
    return {
      percentages,
      inconclusive,
      thinExtraction: true,
      winner,
      title: copy.result.titleThinExtraction,
      explanation: copy.result.explanationThinExtraction,
    };
  }

  return {
    percentages,
    inconclusive,
    thinExtraction: false,
    winner,
    title: inconclusive
      ? copy.result.titleInconclusive
      : winner === 'fake'
        ? copy.result.titleFake
        : copy.result.titleTrue,
    explanation: inconclusive
      ? copy.result.explanationInconclusive
      : copy.result.explanationClear,
  };
}
