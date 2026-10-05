/**
 * Telas 3b, 3c e 3d — o mesmo layout de resultado para os três casos.
 * O que muda entre eles vem dos dados: o título e a explicação saem do
 * limiar em domain/analysis, e a lista vazia cai no texto de 3d.
 */

import { useEffect, useRef } from 'react';

import type { Analysis } from '../api';
import { toAnalysisView } from '../domain/analysis';
import { displayUrl, isLink } from '../domain/input';
import { copy } from '../copy/pt-BR';
import { ResultSection } from './ResultSection';
import { ProbabilityBar } from './ProbabilityBar';
import { RelatedList } from './RelatedList';
import { AnalyzedText } from './AnalyzedText';
import './ResultScreen.css';

interface Props {
  analysis: Analysis;
  /** O que o usuário enviou, usado como origem se o backend não devolver a URL. */
  submitted: string;
  onNewQuery: () => void;
}

export function ResultScreen({ analysis, submitted, onNewQuery }: Props) {
  const view = toAnalysisView(analysis);
  const title = useRef<HTMLHeadingElement>(null);

  // O resultado substitui a tela inteira: o foco vai para o título para que
  // leitor de tela e teclado continuem de onde o conteúdo novo começa.
  useEffect(() => {
    title.current?.focus();
  }, []);

  const origin = originLabel(analysis.sourceUrl, submitted);

  return (
    <>
      <header className="result-header rule-bottom">
        <span className="result-header__brand">{copy.brand}</span>
        <span className="result-header__origin" title={origin}>
          {origin}
        </span>
        <button type="button" className="btn btn-ghost result-header__action" onClick={onNewQuery}>
          {copy.result.newQuery}
        </button>
      </header>

      <main className="result-body">
        <ResultSection label={copy.result.labelClassification} labelOffset="8px">
          <div className="result-classification">
            {/* h1 da tela: é a mensagem principal e o destino do foco. */}
            <h1 className="result-classification__title" ref={title} tabIndex={-1}>
              {view.title}
            </h1>
            {view.thinExtraction ? null : <ProbabilityBar percentages={view.percentages} />}
            <p className="result-classification__explanation">{view.explanation}</p>
          </div>
        </ResultSection>

        <ResultSection label={copy.result.labelRelated} labelOffset="12px">
          <RelatedList items={analysis.related} />
        </ResultSection>

        <ResultSection label={copy.result.labelAnalyzedText} labelOffset="4px">
          <AnalyzedText text={analysis.text} />
        </ResultSection>

        {/* Sem classificação não há estimativa sobre a qual advertir. */}
        {view.thinExtraction ? null : (
          <p className="result-note">
            <span>{copy.result.limitNote}</span>
          </p>
        )}
      </main>
    </>
  );
}

/** A URL sem esquema (frame 3b) ou "Texto colado" (frames 3c e 3d). */
function originLabel(sourceUrl: string | null, submitted: string): string {
  if (sourceUrl) return displayUrl(sourceUrl);
  if (isLink(submitted)) return displayUrl(submitted);
  return copy.result.pastedText;
}
