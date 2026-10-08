/**
 * Uma linha do resultado: rótulo de 200px à esquerda, conteúdo à direita.
 * Em telas estreitas vira uma coluna, com o rótulo acima do conteúdo.
 */

import type { ReactNode } from 'react';

import './ResultSection.css';

interface Props {
  label: string;
  /** Alinhamento do rótulo com a primeira linha do conteúdo, como nos frames. */
  labelOffset: string;
  children: ReactNode;
}

export function ResultSection({ label, labelOffset, children }: Props) {
  return (
    <section className="result-section">
      <h2
        className="result-section__label"
        style={{ '--stroj-label-offset': labelOffset } as React.CSSProperties}
      >
        {label}
      </h2>
      <div className="result-section__content">{children}</div>
    </section>
  );
}
