/**
 * Mock do backend com as três respostas dos frames 3b, 3c e 3d — textos,
 * domínios e números copiados do arquivo de design.
 *
 * Liga com VITE_STROJ_MOCK=1 (já ligado em .env.development).
 *
 * Qual resposta volta:
 *   • entrada que é link           → 3b (classificação clara, origem = URL)
 *   • texto contendo "imposto"     → 3c (probabilidades próximas)
 *   • texto contendo "prefeitura"  → 3d (sem conteúdo relacionado)
 *   • qualquer outro texto         → alterna 3b → 3c → 3d
 *
 * Para ver os estados de erro, inclua na entrada:
 *   #erro-rede · #erro-pagina · #erro-classificacao · #erro-limite
 *
 * E #pouco-texto, num link, para a extração pobre (a classificação some).
 */

import { ApiError, parsePredict, type Analysis, type PredictResponseWire } from './contract';
import { isLink } from '../domain/input';

const LATENCY_MS = 900;

/** Frame 3b — 01 Resultado: classificação clara. */
const FRAME_3B: PredictResponseWire = {
  url: 'https://g1.globo.com/sp/sao-paulo/noticia/2026/03/10/acidente-marginal-tiete.ghtml',
  text:
    'Acidente na Marginal Tietê deixa 12 feridos na manhã de hoje. Confirmado: as vias sentido ' +
    'Castello Branco seguem interditadas e o trânsito está parado desde a Ponte das Bandeiras. ' +
    'Compartilhe para avisar quem vai passar por lá!!',
  prediction: 'fake',
  probabilities: { fake: 0.87, true: 0.13 },
  related: [
    {
      url: 'https://g1.globo.com/sp/sao-paulo/noticia/2026/03/10/colisao-marginal-tiete.ghtml',
      domain: 'g1.globo.com',
      title: 'Colisão na Marginal Tietê deixa feridos na manhã desta terça',
      snippet:
        'Acidente envolvendo três veículos interditou duas faixas da pista expressa. O Corpo de ' +
        'Bombeiros enviou quatro viaturas ao local.',
    },
    {
      url: 'https://www.band.uol.com.br/noticias/acidente-marginal-tiete-feridos',
      domain: 'www.band.uol.com.br',
      title: 'Nove pessoas ficam feridas em acidente na Marginal Tietê',
      snippet:
        'Segundo a CET, o trânsito foi liberado por volta das 11h. As vítimas foram levadas a ' +
        'hospitais da região.',
    },
    {
      url: 'https://www.cetsp.com.br/noticias/balanco-ocorrencias-marginais.aspx',
      domain: 'www.cetsp.com.br',
      title: 'CET divulga balanço de ocorrências na manhã de terça',
      snippet:
        'Boletim lista as principais ocorrências registradas nas marginais entre 6h e 12h.',
    },
  ],
};

/** Frame 3c — 02 Resultado: probabilidades próximas. */
const FRAME_3C: PredictResponseWire = {
  text:
    'Esse pacote de impostos é o maior absurdo que eu já vi nesse país. Quem ganha mais de 5 mil ' +
    'vai pagar o dobro a partir do mês que vem e ninguém está falando disso.',
  prediction: 'fake',
  probabilities: { fake: 0.54, true: 0.46 },
  related: [
    {
      url: 'https://www.estadao.com.br/economia/pacote-imposto-de-renda-mudancas',
      domain: 'www.estadao.com.br',
      title: 'Governo apresenta pacote de mudanças no imposto de renda',
      snippet:
        'Proposta altera faixas de isenção e cria nova alíquota para rendas acima de R$ 50 mil ' +
        'mensais.',
    },
    {
      url: 'https://www.poder360.com.br/economia/o-que-muda-pacote-tributario',
      domain: 'www.poder360.com.br',
      title: 'O que muda com o novo pacote tributário',
      snippet: 'Entenda os principais pontos da proposta enviada ao Congresso nesta semana.',
    },
  ],
};

/** Frame 3d — 03 Resultado: sem conteúdo relacionado. */
const FRAME_3D: PredictResponseWire = {
  text:
    'A prefeitura de Itaquaquecetuba suspendeu nesta segunda-feira o contrato com a empresa ' +
    'responsável pela coleta de lixo no município. Segundo nota da Secretaria de Serviços ' +
    'Urbanos, a coleta será mantida em caráter emergencial.',
  prediction: 'true',
  probabilities: { fake: 0.09, true: 0.91 },
  related: [],
};

/** Extração pobre: a página abriu, mas só veio a chamada da matéria. */
const FRAME_THIN: PredictResponseWire = {
  url: 'https://exemplo.com.br/noticia-com-paywall',
  text: 'Assine para continuar lendo.',
  prediction: 'fake',
  probabilities: { fake: 0.73, true: 0.27 },
  related: FRAME_3B.related,
};

const ROTATION = [FRAME_3B, FRAME_3C, FRAME_3D];
let nextInRotation = 0;

export async function predict(text: string, signal?: AbortSignal): Promise<Analysis> {
  await sleep(LATENCY_MS, signal);

  const lowered = text.toLowerCase();

  if (lowered.includes('#erro-rede')) throw new ApiError('network');
  if (lowered.includes('#erro-pagina')) throw new ApiError('page_unreachable');
  if (lowered.includes('#erro-classificacao')) throw new ApiError('classification_failed');
  if (lowered.includes('#erro-limite')) throw new ApiError('rate_limited');

  const frame = pickFrame(text, lowered);
  // A origem é o que o usuário mandou quando foi um link, não a do fixture.
  const wire: PredictResponseWire =
    frame === FRAME_3B && isLink(text) ? { ...frame, url: text.trim() } : frame;

  return parsePredict(wire, text);
}

function pickFrame(text: string, lowered: string): PredictResponseWire {
  if (lowered.includes('#pouco-texto')) return FRAME_THIN;
  if (isLink(text)) return FRAME_3B;
  if (lowered.includes('imposto')) return FRAME_3C;
  if (lowered.includes('prefeitura')) return FRAME_3D;
  const frame = ROTATION[nextInRotation % ROTATION.length];
  nextInRotation += 1;
  return frame;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
