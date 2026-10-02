/**
 * Tela 3a — Entrada da notícia, com os estados de carregamento e de erro
 * no layout dos frames 2b e 2c. Centralizada, largura de leitura 720px.
 */

import { useEffect, useId, useRef } from 'react';

import { copy } from '../copy/pt-BR';
import { Steps } from './Steps';
import './InputScreen.css';

interface Props {
  value: string;
  loading: boolean;
  /** A entrada é um link? Só muda a dica do carregamento. */
  loadingIsLink: boolean;
  /** Mensagem já traduzida, ou `null` quando não há erro. */
  error: string | null;
  autoFocus: boolean;
  onAutoFocusDone: () => void;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function InputScreen({
  value,
  loading,
  loadingIsLink,
  error,
  autoFocus,
  onAutoFocusDone,
  onChange,
  onSubmit,
}: Props) {
  const fieldId = useId();
  const subtitleId = useId();
  const errorId = useId();
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    field.current?.focus();
    onAutoFocusDone();
  }, [autoFocus, onAutoFocusDone]);

  const submitLabel = loading
    ? copy.input.submitLoading
    : error
      ? copy.input.submitRetry
      : copy.input.submit;

  /** Vale tanto para o botão quanto para o Enter. */
  const canSubmit = !loading && value.trim() !== '';

  /**
   * Enter analisa; Shift+Enter quebra a linha.
   *
   * O guard de `isComposing` é para teclado com IME: nesses sistemas o Enter
   * confirma o candidato que está sendo digitado, e enviar nessa hora cortaria
   * a palavra no meio.
   */
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSubmit) onSubmit();
  }

  return (
    <main className="input-screen">
      <h1 className="input-screen__title">{copy.input.title}</h1>
      <p className="input-screen__subtitle" id={subtitleId}>
        {copy.input.subtitle}
      </p>

      <form
        className="input-screen__form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="sr-only" htmlFor={fieldId}>
          {copy.input.fieldLabel}
        </label>
        <textarea
          id={fieldId}
          ref={field}
          className={`input input-screen__field${error ? ' input-screen__field--error' : ''}${
            loading ? ' input-screen__field--loading' : ''
          }`}
          rows={5}
          placeholder={copy.input.placeholder}
          value={value}
          /* Em carregamento o campo fica só de leitura, não desabilitado: o
             texto continua legível por leitor de tela e o foco não se perde. */
          readOnly={loading}
          aria-busy={loading}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${subtitleId} ${errorId}` : subtitleId}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />

        {error ? (
          <p className="input-screen__error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}

        <div className="input-screen__actions">
          <button
            type="submit"
            className="btn btn-primary input-screen__submit"
            disabled={!canSubmit}
          >
            {submitLabel}
          </button>
          {loading ? (
            <span className="input-screen__hint">
              {loadingIsLink ? copy.input.loadingHintLink : copy.input.loadingHintText}
            </span>
          ) : null}
        </div>
      </form>

      <Steps />

      <p className="input-screen__privacy">{copy.input.privacy}</p>
    </main>
  );
}
