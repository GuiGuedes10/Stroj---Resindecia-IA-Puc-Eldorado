/**
 * O contrato do backend: formato da resposta e dos erros. O endpoint e o
 * corpo do POST ficam em client.ts.
 *
 * Nada fora daqui conhece os nomes dos campos da resposta: `parsePredict`
 * converte a resposta crua no `Analysis` que o resto do app usa, e
 * `mapErrorCode` e `mapHttpStatus` convertem o código ou o status do
 * servidor num `ApiErrorCode` fechado.
 *
 * O backend (app/controllers/newsCheckController.py) atende em
 * `POST /news/check`, recebe `{"request": ...}` e devolve
 * `{text, prediction: 0|1, probabilities: [falsa, verdadeira], related}`.
 * Erros vêm como `{"error": {"code", "message"}}` com o status HTTP do caso.
 * O backend não devolve `url`: quando a entrada foi um link, a origem é o
 * próprio link enviado. O parse continua tolerante — probabilidades em 0–1
 * ou 0–100, objeto ou tupla, `prediction` como string ou número, `related`
 * e `url` ausentes — para o mock e para trocas de modelo no backend.
 */

import { isLink, toHref } from '../domain/input';

// ─── O que o servidor manda ────────────────────────────────────────────────

/** Corpo do POST. O mesmo campo leva link e texto; o backend detecta qual é. */
export interface PredictRequest {
  request: string;
}

/** Resposta esperada do backend. */
export interface PredictResponseWire {
  /** O texto analisado, completo — extraído da página quando a entrada foi link. */
  text?: string;
  /** Classe vencedora. Aceita "fake"/"true", "falsa"/"verdadeira" ou 0/1. */
  prediction?: string | number;
  /** Probabilidades das duas classes, em 0–1 ou em 0–100. */
  probabilities?: { fake?: number; true?: number } | [number, number];
  /** Conteúdos relacionados. Ausente ou vazio cai na tela 3d. */
  related?: RelatedWire[];
  /** A URL de origem, quando o backend reconheceu a entrada como link. */
  url?: string;
  /**
   * Qualidade da extração, quando o backend souber informar. `thin: true`
   * manda suprimir a classificação. Sem o campo, vale a heurística de
   * tamanho em `isThinExtraction`.
   */
  extraction?: { thin?: boolean };
  /** Erro em corpo 2xx, se o backend preferir sinalizar assim. */
  error?: { code?: string; message?: string };
}

export interface RelatedWire {
  url?: string;
  /** Opcional: na falta dele, o domínio sai da própria URL. */
  domain?: string;
  title?: string;
  snippet?: string;
}

// ─── O que o app usa ───────────────────────────────────────────────────────

export type PredictionClass = 'fake' | 'true';

export interface RelatedContent {
  url: string;
  domain: string;
  title: string;
  snippet: string;
}

export interface Analysis {
  /** Texto analisado, como o backend devolveu. Renderizado sempre como texto. */
  text: string;
  prediction: PredictionClass;
  /** Probabilidades normalizadas em 0–1. */
  probabilities: Record<PredictionClass, number>;
  related: RelatedContent[];
  /** URL de origem, se houver. O cabeçalho mostra ela ou "Texto colado". */
  sourceUrl: string | null;
  /**
   * A extração da página rendeu pouco texto: paywall, página de erro ou só
   * a chamada da matéria. A tela de resultado suprime a classificação.
   */
  thinExtraction: boolean;
}

/**
 * Abaixo disto, o texto extraído de uma página não dá base para classificar.
 *
 * Número próprio, e não mais o mesmo piso de `MIN_TEXT_LENGTH`: as duas
 * perguntas são diferentes. Quem cola uma manchete escolheu aquele texto e
 * quer a classificação dele. Quem manda um link esperava a matéria inteira,
 * então uma página que devolve cem caracteres não entregou o que foi pedido
 * — devolveu o stub do paywall ou uma página de erro. O frame 3b, com 225
 * caracteres, continua passando.
 *
 * É heurística, e conservadora de propósito: suprimir uma classificação
 * válida custa mais que deixar passar uma extração ruim. O caso que ela não
 * pega — paywall que devolve a chamada inteira antes de cortar — depende de
 * `extraction.thin` vir do backend, que tem precedência sobre ela.
 */
export const THIN_EXTRACTION_MAX_LENGTH = 120;

/**
 * Só vale para link: texto colado é responsabilidade de quem colou, e já
 * passou pela validação da entrada.
 */
export function isThinExtraction(text: string, sourceUrl: string | null): boolean {
  return sourceUrl !== null && text.trim().length < THIN_EXTRACTION_MAX_LENGTH;
}

/** Códigos de erro que a interface sabe traduzir em copy. */
export type ApiErrorCode =
  | 'network'
  | 'page_unreachable'
  | 'text_too_short'
  | 'text_too_long'
  | 'rate_limited'
  | 'classification_failed';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'ApiError';
  }
}

// ─── Normalização ──────────────────────────────────────────────────────────

/** Domínio a partir da URL. `www.` fica, como nos frames (www.band.uol.com.br). */
export function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Lê o par de probabilidades e devolve em 0–1, somando 1.
 *
 * Aceita objeto `{fake, true}` ou tupla `[fake, true]`, em 0–1 ou em 0–100 —
 * a escala sai da soma, não de um palpite por valor. Com um lado só, o outro
 * é o complemento.
 */
export function normalizeProbabilities(
  raw: PredictResponseWire['probabilities'],
): Record<PredictionClass, number> | null {
  let fake: number | null;
  let truthy: number | null;

  if (Array.isArray(raw)) {
    fake = asFiniteNumber(raw[0]);
    truthy = asFiniteNumber(raw[1]);
  } else if (raw && typeof raw === 'object') {
    fake = asFiniteNumber(raw.fake);
    truthy = asFiniteNumber(raw.true);
  } else {
    return null;
  }

  // Um lado só: o outro é o complemento, na escala que o lado conhecido sugere.
  if (fake === null && truthy === null) return null;
  const scale = Math.max(fake ?? 0, truthy ?? 0) > 1.0000001 ? 100 : 1;
  if (fake === null) fake = scale - (truthy as number);
  if (truthy === null) truthy = scale - fake;

  const sum = fake + truthy;
  if (sum <= 0) return null;

  // Reescala para somar 1, o que também resolve 0–100 e somas imprecisas.
  return { fake: fake / sum, true: truthy / sum };
}

const FAKE_WORDS = new Set(['fake', 'falsa', 'falso', 'false']);
const TRUE_WORDS = new Set(['true', 'verdadeira', 'verdadeiro', 'real']);

/**
 * Lê a classe vencedora. Devolve `null` quando o campo não é conclusivo
 * (ex.: 0.5 vindo de outro modelo) e aí quem decide é o maior das
 * probabilidades.
 */
export function normalizePrediction(raw: PredictResponseWire['prediction']): PredictionClass | null {
  if (typeof raw === 'string') {
    const key = raw.trim().toLowerCase();
    if (FAKE_WORDS.has(key)) return 'fake';
    if (TRUE_WORDS.has(key)) return 'true';
    return null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    // Convenção do dataset: 0 = falsa, 1 = verdadeira. Qualquer outro valor
    // (0.5, por exemplo) não é uma classe.
    if (raw === 0) return 'fake';
    if (raw === 1) return 'true';
    return null;
  }
  return null;
}

function normalizeRelated(raw: PredictResponseWire['related']): RelatedContent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is RelatedWire => !!item && typeof item === 'object')
    .map((item) => ({
      url: typeof item.url === 'string' ? item.url : '',
      domain:
        typeof item.domain === 'string' && item.domain
          ? item.domain
          : domainFromUrl(typeof item.url === 'string' ? item.url : ''),
      title: typeof item.title === 'string' ? item.title : '',
      snippet: typeof item.snippet === 'string' ? item.snippet : '',
    }))
    // Um item sem URL ou sem título não tem o que mostrar nem para onde levar.
    .filter((item) => item.url !== '' && item.title !== '');
}

/**
 * Resposta crua → `Analysis`. Lança `ApiError` quando falta o essencial.
 *
 * @param submitted o que o usuário enviou, usado como texto analisado se o
 *   backend não devolver `text`, e como origem se for um link e o backend
 *   não devolver `url`.
 */
export function parsePredict(raw: unknown, submitted: string): Analysis {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('classification_failed');
  }
  const body = raw as PredictResponseWire;

  if (body.error?.code) {
    throw new ApiError(mapErrorCode(body.error.code), body.error.message);
  }

  const probabilities = normalizeProbabilities(body.probabilities);
  if (!probabilities) {
    throw new ApiError('classification_failed', 'resposta sem probabilidades');
  }

  const prediction =
    normalizePrediction(body.prediction) ??
    (probabilities.fake >= probabilities.true ? 'fake' : 'true');

  const text = typeof body.text === 'string' && body.text ? body.text : submitted;
  const sourceUrl =
    typeof body.url === 'string' && body.url
      ? body.url
      : isLink(submitted)
        ? toHref(submitted)
        : null;

  return {
    text,
    prediction,
    probabilities,
    related: normalizeRelated(body.related),
    sourceUrl,
    // O backend tem a última palavra; na falta dela, a heurística decide.
    thinExtraction: body.extraction?.thin ?? isThinExtraction(text, sourceUrl),
  };
}

/** Códigos do servidor → códigos da interface. */
export function mapErrorCode(code: string): ApiErrorCode {
  switch (code.trim().toLowerCase()) {
    case 'url_unreachable':
    case 'page_unreachable':
    case 'fetch_failed':
      return 'page_unreachable';
    case 'text_too_short':
      return 'text_too_short';
    case 'text_too_long':
      return 'text_too_long';
    case 'rate_limited':
      return 'rate_limited';
    default:
      return 'classification_failed';
  }
}

/** Status HTTP → código da interface, quando o corpo não diz nada de útil. */
export function mapHttpStatus(status: number): ApiErrorCode {
  if (status === 422 || status === 400) return 'text_too_short';
  if (status === 413) return 'text_too_long';
  if (status === 429) return 'rate_limited';
  if (status === 502 || status === 504) return 'page_unreachable';
  return 'classification_failed';
}
