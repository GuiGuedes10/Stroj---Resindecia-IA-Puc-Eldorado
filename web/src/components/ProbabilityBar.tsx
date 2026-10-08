/**
 * A barra de 8px com as duas probabilidades e os valores abaixo, em
 * algarismos tabulares. Verdadeira à esquerda, Falsa à direita — invertido
 * em relação ao arquivo de design, a pedido. A barra é decorativa para leitor de tela: tem
 * texto equivalente no aria-label, e os valores logo abaixo já são texto.
 */

import type { PredictionClass } from '../api';
import { copy } from '../copy/pt-BR';
import './ProbabilityBar.css';

interface Props {
  /** Inteiros que somam 100. */
  percentages: Record<PredictionClass, number>;
}

export function ProbabilityBar({ percentages }: Props) {
  return (
    <div className="probability">
      <div
        className="probability__bar"
        role="img"
        aria-label={copy.a11y.probabilityBar(percentages.true, percentages.fake)}
      >
        <span className="probability__fill probability__fill--true" style={{ width: `${percentages.true}%` }} />
        <span className="probability__fill probability__fill--fake" style={{ width: `${percentages.fake}%` }} />
      </div>
      <div className="probability__values">
        <span>
          <span className="probability__label">{copy.result.labelTrue}</span> {percentages.true}%
        </span>
        <span>
          <span className="probability__label">{copy.result.labelFake}</span> {percentages.fake}%
        </span>
      </div>
    </div>
  );
}
