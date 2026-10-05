/**
 * Regras da entrada: o que é link, o que é texto válido, como a origem
 * aparece no cabeçalho. Funções puras, sem React e sem rede.
 */

/**
 * Mínimo para valer uma tentativa de classificação.
 *
 * Baixo de propósito: uma manchete solta — "Governo anuncia pacote de
 * mudanças no imposto de renda" — é entrada legítima, mesmo não sendo o
 * ideal para o modelo. Quem cola uma manchete quer a classificação dela,
 * não um aviso de que o texto é curto.
 */
export const MIN_TEXT_LENGTH = 30;

/**
 * Junto com o mínimo de caracteres, separa manchete de lixo: trinta
 * caracteres em uma palavra só ("aaaaaaaa…") não são notícia nenhuma.
 */
export const MIN_TEXT_WORDS = 4;
/** Máximo aceito. O BERT do backend já fatia textos longos, mas há um limite. */
export const MAX_TEXT_LENGTH = 20_000;

const BARE_HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

/**
 * A entrada é um link?
 *
 * O backend também detecta — link e texto vão no mesmo campo `text`. O front
 * detecta por conta própria só para a apresentação: a copy do carregamento e
 * a origem no cabeçalho ("Texto colado" ou a URL).
 *
 * Aceita `https://g1.globo.com/...` e também `g1.globo.com/...` sem esquema.
 */
export function isLink(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '' || /\s/.test(trimmed)) return false;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return false;
  }
  // Sem esquema explícito, exige um host plausível: evita tratar
  // "palavra...palavra" como endereço.
  if (!/^https?:\/\//i.test(trimmed)) {
    return BARE_HOST.test(url.hostname) && url.hostname.includes('.');
  }
  return url.hostname.includes('.');
}

/** A URL normalizada com esquema, para usar como href. */
export function toHref(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * A URL como o cabeçalho a mostra: sem o esquema, como no frame 3b
 * (`g1.globo.com/sp/...`, enquanto o campo em 2b tinha `https://g1.globo.com/sp/...`).
 * O corte com reticências é do CSS, não daqui.
 */
export function displayUrl(value: string): string {
  return value.trim().replace(/^https?:\/\//i, '');
}

export type InputProblem = 'empty' | 'text_too_short' | 'text_too_long';

/** Conta palavras de verdade: sequências separadas por espaço em branco. */
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Valida antes de chamar o backend. Links escapam do mínimo: o texto que
 * será classificado é o da página, não o endereço.
 *
 * Não exige pontuação de fim. A regra antiga pedia "uma frase completa" e
 * recusava qualquer manchete — elas não terminam em ponto —, por mais longa
 * que fosse.
 */
export function validateInput(value: string): InputProblem | null {
  const trimmed = value.trim();
  if (trimmed === '') return 'empty';
  if (trimmed.length > MAX_TEXT_LENGTH) return 'text_too_long';
  if (isLink(trimmed)) return null;
  if (trimmed.length < MIN_TEXT_LENGTH || countWords(trimmed) < MIN_TEXT_WORDS) {
    return 'text_too_short';
  }
  return null;
}
