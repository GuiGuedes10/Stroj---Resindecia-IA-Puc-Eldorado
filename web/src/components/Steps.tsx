/** Os três passos (Lemos, Classificamos, Relacionamos). Conteúdo fixo. */

import { copy } from '../copy/pt-BR';
import './Steps.css';

export function Steps() {
  return (
    <ol className="steps">
      {copy.steps.map((step) => (
        <li className="steps__item" key={step.kicker}>
          <span className="steps__kicker">{step.kicker}</span>
          <p className="steps__body">{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
