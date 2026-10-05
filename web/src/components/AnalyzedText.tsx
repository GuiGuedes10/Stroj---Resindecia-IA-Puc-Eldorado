/**
 * O texto analisado: citação cortada em 3 linhas, com o botão que expande
 * no lugar. Sempre renderizado como texto — nunca como HTML.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { copy } from '../copy/pt-BR';
import './AnalyzedText.css';

interface Props {
  text: string;
}

export function AnalyzedText({ text }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const quoteId = useId();
  const quote = useRef<HTMLQuoteElement>(null);

  /**
   * Sugestão 10 — o botão só aparece quando o corte de 3 linhas esconde
   * alguma coisa. A medida é feita apenas com a citação fechada: aberta,
   * scrollHeight e clientHeight se igualam e o botão sumiria no meio do uso.
   * O ResizeObserver refaz a conta quando a largura muda (girar o celular,
   * redimensionar a janela) e a citação volta a caber — ou deixa de caber.
   */
  const measure = useCallback(() => {
    const element = quote.current;
    if (!element) return;
    setClipped(element.scrollHeight > element.clientHeight + 1);
  }, []);

  useEffect(() => {
    if (expanded) return;
    const element = quote.current;
    if (!element) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, measure, text]);

  return (
    <div className="analyzed">
      <blockquote
        id={quoteId}
        ref={quote}
        className={`analyzed__quote${expanded ? ' analyzed__quote--expanded' : ''}`}
      >
        {text}
      </blockquote>
      {clipped || expanded ? (
        <button
          type="button"
          className="btn btn-ghost analyzed__toggle"
          aria-expanded={expanded}
          aria-controls={quoteId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? copy.result.showLessText : copy.result.showFullText}
        </button>
      ) : null}
    </div>
  );
}
