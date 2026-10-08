/**
 * A máquina de estados das telas da seção 3: vazio → carregando → resultado
 * ou erro. Guarda o texto da entrada, chama a camada de API e decide qual
 * tela renderizar. Nenhuma regra de layout vive aqui.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, predict, type Analysis, type ApiErrorCode } from './api';
import { isLink, validateInput } from './domain/input';
import { copy } from './copy/pt-BR';
import { InputScreen } from './components/InputScreen';
import { ResultScreen } from './components/ResultScreen';
import { LiveRegion } from './components/LiveRegion';
import { toAnalysisView } from './domain/analysis';

type Phase =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; code: ApiErrorCode }
  | { kind: 'result'; analysis: Analysis };

const ERROR_MESSAGE: Record<ApiErrorCode, string> = {
  network: copy.errors.network,
  page_unreachable: copy.errors.pageUnreachable,
  text_too_short: copy.errors.textTooShort,
  text_too_long: copy.errors.textTooLong,
  rate_limited: copy.errors.rateLimited,
  classification_failed: copy.errors.classificationFailed,
};

export function App() {
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [announcement, setAnnouncement] = useState('');
  /** Volta o foco ao campo quando o usuário pede uma nova consulta. */
  const [focusField, setFocusField] = useState(false);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  const handleChange = useCallback((next: string) => {
    setValue(next);
    // Editar o texto limpa o erro: a mensagem falava do texto anterior.
    setPhase((current) => (current.kind === 'error' ? { kind: 'idle' } : current));
  }, []);

  const handleSubmit = useCallback(async () => {
    const problem = validateInput(value);
    if (problem === 'empty') return;
    if (problem) {
      setPhase({ kind: 'error', code: problem });
      setAnnouncement('');
      return;
    }

    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;

    setPhase({ kind: 'loading' });
    setAnnouncement(copy.a11y.announceLoading);

    try {
      const analysis = await predict(value.trim(), controller.signal);
      if (controller.signal.aborted) return;
      const view = toAnalysisView(analysis);
      setPhase({ kind: 'result', analysis });
      setAnnouncement(
        view.thinExtraction
          ? copy.a11y.announceThinExtraction(analysis.related.length)
          : copy.a11y.announceResult(
              view.percentages.true,
              view.percentages.fake,
              analysis.related.length,
            ),
      );
    } catch (cause) {
      if (controller.signal.aborted) return;
      setPhase({
        kind: 'error',
        code: cause instanceof ApiError ? cause.code : 'classification_failed',
      });
      // O erro é anunciado pelo role="alert" da própria mensagem.
      setAnnouncement('');
    }
  }, [value]);

  const handleNewQuery = useCallback(() => {
    pending.current?.abort();
    setValue('');
    setPhase({ kind: 'idle' });
    setAnnouncement('');
    setFocusField(true);
  }, []);

  if (phase.kind === 'result') {
    return (
      <div className="app">
        <LiveRegion message={announcement} />
        <ResultScreen
          analysis={phase.analysis}
          submitted={value}
          onNewQuery={handleNewQuery}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <LiveRegion message={announcement} />
      <InputScreen
        value={value}
        loading={phase.kind === 'loading'}
        loadingIsLink={isLink(value)}
        error={phase.kind === 'error' ? ERROR_MESSAGE[phase.code] : null}
        autoFocus={focusField}
        onAutoFocusDone={() => setFocusField(false)}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
