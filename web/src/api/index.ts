/**
 * A porta de entrada da API. O app importa daqui e não sabe se está falando
 * com o backend ou com o mock — a variável VITE_STROJ_MOCK decide.
 */

import { predict as httpPredict } from './client';
import { predict as mockPredict } from './mock';

export const usingMock = import.meta.env.VITE_STROJ_MOCK === '1';

export const predict = usingMock ? mockPredict : httpPredict;

export { ApiError } from './contract';
export type { Analysis, ApiErrorCode, PredictionClass, RelatedContent } from './contract';
