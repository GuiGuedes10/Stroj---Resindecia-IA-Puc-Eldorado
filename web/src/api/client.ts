/** Cliente HTTP do backend real. Só ele conhece o endpoint e o transporte. */

import {
  ApiError,
  mapErrorCode,
  mapHttpStatus,
  parsePredict,
  type Analysis,
  type PredictRequest,
} from './contract';

const BASE_URL = (import.meta.env.VITE_STROJ_API_URL ?? '').replace(/\/$/, '');

/** Link e texto vão no mesmo campo `text`; o backend detecta qual é. */
export async function predict(text: string, signal?: AbortSignal): Promise<Analysis> {
  const body: PredictRequest = { text };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/news/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // Um abort não é falha de rede: quem cancelou sabe o que fazer.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError('network', String(cause));
  }

  const payload = await readJson(response);

  if (!response.ok) {
    const code = payload?.error?.code;
    throw new ApiError(code ? mapErrorCode(code) : mapHttpStatus(response.status));
  }

  return parsePredict(payload, text);
}

async function readJson(response: Response): Promise<{ error?: { code?: string } } | null> {
  try {
    return (await response.json()) as { error?: { code?: string } };
  } catch {
    return null;
  }
}
