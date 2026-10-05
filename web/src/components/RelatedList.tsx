/**
 * Os conteúdos relacionados: domínio, título sublinhado e snippet de 2
 * linhas, separados pela régua com fade. Lista vazia cai na frase do frame 3d.
 */

import type { RelatedContent } from '../api';
import { copy } from '../copy/pt-BR';
import './RelatedList.css';

interface Props {
  items: RelatedContent[];
}

export function RelatedList({ items }: Props) {
  if (items.length === 0) {
    return <p className="related__empty">{copy.result.relatedEmpty}</p>;
  }

  return (
    <ul className="related">
      {items.map((item) => (
        <li key={item.url}>
          <a
            className="related__item rule-bottom"
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="related__domain">{item.domain}</span>
            <span className="related__title">
              {item.title}
              <span className="sr-only"> {copy.result.opensInNewTab}</span>
            </span>
            {item.snippet ? <span className="related__snippet">{item.snippet}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
