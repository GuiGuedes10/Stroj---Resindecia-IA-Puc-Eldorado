import { describe, expect, it } from 'vitest';

import {
  displayUrl,
  isLink,
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
  MIN_TEXT_WORDS,
  toHref,
  validateInput,
} from './input';

const FRAME_URL =
  'https://g1.globo.com/sp/sao-paulo/noticia/2026/03/10/acidente-marginal-tiete.ghtml';

/** O texto analisado do frame 3c, que precisa passar na validação. */
const FRAME_TEXT =
  'Esse pacote de impostos é o maior absurdo que eu já vi nesse país. Quem ganha mais de 5 mil ' +
  'vai pagar o dobro a partir do mês que vem e ninguém está falando disso.';

describe('isLink', () => {
  it('reconhece a URL do frame 3b', () => {
    expect(isLink(FRAME_URL)).toBe(true);
  });

  it('reconhece domínio sem esquema', () => {
    expect(isLink('g1.globo.com/sp/sao-paulo/noticia.ghtml')).toBe(true);
  });

  it('ignora espaços em volta', () => {
    expect(isLink(`  ${FRAME_URL}  `)).toBe(true);
  });

  it('não confunde texto com link', () => {
    expect(isLink(FRAME_TEXT)).toBe(false);
    expect(isLink('')).toBe(false);
    expect(isLink('Acidente na Marginal Tietê deixa 12 feridos.')).toBe(false);
  });

  it('não trata uma palavra sem ponto como link', () => {
    expect(isLink('absurdo')).toBe(false);
  });
});

describe('displayUrl', () => {
  it('tira o esquema, como o cabeçalho do frame 3b mostra', () => {
    expect(displayUrl(FRAME_URL)).toBe(
      'g1.globo.com/sp/sao-paulo/noticia/2026/03/10/acidente-marginal-tiete.ghtml',
    );
  });
});

describe('toHref', () => {
  it('completa o esquema quando falta', () => {
    expect(toHref('g1.globo.com/x')).toBe('https://g1.globo.com/x');
  });

  it('preserva o esquema existente', () => {
    expect(toHref(FRAME_URL)).toBe(FRAME_URL);
  });
});

describe('validateInput', () => {
  it('aceita os textos dos frames', () => {
    expect(validateInput(FRAME_TEXT)).toBeNull();
  });

  it('aceita um link curto, que não passa pelo mínimo de texto', () => {
    expect('https://g1.globo.com/x'.length).toBeLessThan(MIN_TEXT_LENGTH);
    expect(validateInput('https://g1.globo.com/x')).toBeNull();
  });

  it('aceita manchete sem pontuação de fim', () => {
    // O caso que motivou baixar o limite: manchete não termina em ponto.
    expect(validateInput('Acidente na Marginal Tietê deixa 12 feridos na manhã de hoje')).toBeNull();
    expect(validateInput('Governo apresenta pacote de mudanças no imposto de renda')).toBeNull();
    expect(validateInput('Nove pessoas ficam feridas em acidente na Marginal Tietê')).toBeNull();
  });

  it('aceita manchete curta, no limite', () => {
    const curta = 'Lula sanciona nova lei do IR hoje';
    expect(curta.length).toBeGreaterThanOrEqual(MIN_TEXT_LENGTH);
    expect(validateInput(curta)).toBeNull();
  });

  it('recusa campo vazio', () => {
    expect(validateInput('   ')).toBe('empty');
  });

  it('recusa texto curto demais', () => {
    expect(validateInput('Acidente na Marginal')).toBe('text_too_short');
    expect(validateInput('teste')).toBe('text_too_short');
  });

  it('recusa caracteres suficientes em palavras de menos', () => {
    expect(validateInput('a'.repeat(MIN_TEXT_LENGTH + 10))).toBe('text_too_short');
    expect(validateInput('aaaaaaaaaaaaaaa bbbbbbbbbbbbbbbbbb')).toBe('text_too_short');
  });

  it('o mínimo de palavras é o que separa manchete de lixo', () => {
    const palavras = 'Governo anuncia pacote tributário novo';
    expect(palavras.split(/\s+/).length).toBeGreaterThanOrEqual(MIN_TEXT_WORDS);
    expect(validateInput(palavras)).toBeNull();
  });

  it('recusa texto longo demais', () => {
    expect(validateInput(`${'a'.repeat(MAX_TEXT_LENGTH + 1)}.`)).toBe('text_too_long');
  });

  it('o tamanho vem antes das outras regras: texto gigante não vira "curto"', () => {
    expect(validateInput('a'.repeat(MAX_TEXT_LENGTH + 1))).toBe('text_too_long');
  });
});
