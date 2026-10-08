import { afterEach, describe, expect, it, vi } from 'vitest';

import { predict } from './client';
import { ApiError } from './contract';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('predict (cliente HTTP)', () => {
  it('envia POST /news/check com {"request": ...}, o formato do backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        text: 'Texto exemplo',
        prediction: 1,
        probabilities: [0.2, 0.8],
        related: [],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await predict('Texto exemplo');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/news\/check$/);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ request: 'Texto exemplo' });
    expect(result.prediction).toBe('true');
  });

  it('traduz o erro do corpo, não só o status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(502, { error: { code: 'page_unreachable', message: 'x' } }),
      ),
    );

    await expect(predict('https://exemplo.com.br')).rejects.toEqual(
      expect.objectContaining({ code: 'page_unreachable' }),
    );
  });

  it('usa o status quando o corpo não é JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('erro', { status: 429 })));

    await expect(predict('Texto exemplo')).rejects.toEqual(
      expect.objectContaining({ code: 'rate_limited' }),
    );
  });

  it('falha de rede vira ApiError("network")', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await predict('Texto exemplo').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('network');
  });
});
