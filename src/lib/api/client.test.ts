import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import {
  API_RETRY_BASE_MS,
  API_TIMEOUT_MS,
  ApiError,
  NETWORK_ERROR_MESSAGE,
  REFRESH_NETWORK_MESSAGE,
  apiClient,
  apiErrorMessage,
  apiGet,
  retryDelayMs,
  toApiError,
} from '@/lib/api/client';

function httpError(status: number, data: unknown, message: string, headers: Record<string, string> = {}): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = {
    status,
    statusText: 'Error',
    headers,
    config,
    data,
  } as AxiosResponse;

  return new AxiosError(message, String(status), config, undefined, response);
}

function jsonResponse(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

describe('api client', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    jest.useRealTimers();
    apiClient.defaults.adapter = originalAdapter;
  });

  it('reads the base URL and timeout from configuration', () => {
    expect(apiClient.defaults.baseURL).toBe(process.env.EXPO_PUBLIC_API_URL ?? '');
    expect(apiClient.defaults.timeout).toBe(API_TIMEOUT_MS);
  });

  it('normalizes a network failure', () => {
    const error = toApiError(new AxiosError('Network Error'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Network Error');
    expect(error.status).toBeNull();
    expect(error.isNetworkError).toBe(true);
  });

  it('normalizes an unsuccessful HTTP response', () => {
    const error = toApiError(httpError(404, { message: 'missing' }, 'Request failed'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('missing');
    expect(error.status).toBe(404);
    expect(error.isNetworkError).toBe(false);
  });

  it('uses the Axios message when the response body has no string message', () => {
    const error = toApiError(httpError(500, { reason: 'down' }, 'Request failed'));

    expect(error.message).toBe('Request failed');
    expect(error.status).toBe(500);
    expect(error.isNetworkError).toBe(false);
  });

  it('describes a missing network differently for refresh and other requests', () => {
    const error = new AxiosError('Network Error');

    expect(apiErrorMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
    expect(apiErrorMessage(error, 'refresh')).toBe(REFRESH_NETWORK_MESSAGE);
    expect(apiErrorMessage(httpError(500, { message: 'missing' }, 'Request failed'))).toBe('missing');
  });

  it('keeps the longer of the growing wait and Retry-After', () => {
    expect(retryDelayMs(0, null)).toBe(API_RETRY_BASE_MS);
    expect(retryDelayMs(1, null)).toBe(API_RETRY_BASE_MS * 2);
    expect(retryDelayMs(2, null)).toBe(API_RETRY_BASE_MS * 4);
    expect(retryDelayMs(0, 3_000)).toBe(3_000);
    expect(retryDelayMs(1, 3_000)).toBe(API_RETRY_BASE_MS * 2);
  });

  it('does not send another request until the one in flight finishes', async () => {
    let started = 0;
    let releaseFirst: (() => void) | undefined;

    apiClient.defaults.adapter = (config) => {
      started += 1;

      if (started === 1) {
        return new Promise((resolve) => {
          releaseFirst = () => {
            resolve(jsonResponse(config, { ok: true }));
          };
        });
      }

      return jsonResponse(config, { ok: true });
    };

    const first = apiGet('/v1/accounts');
    const second = apiGet('/v1/transactions');
    await Promise.resolve();
    await Promise.resolve();

    expect(started).toBe(1);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(started).toBe(2);
  });

  it('retries a server failure after a few seconds, then twice as long', async () => {
    jest.useFakeTimers();
    let calls = 0;

    apiClient.defaults.adapter = (config) => {
      calls += 1;

      if (calls < 3) {
        return Promise.reject(httpError(500, { error: 'internal_error' }, 'Request failed with status code 500'));
      }

      return jsonResponse(config, { ok: true });
    };

    const pending = apiGet<{ ok: boolean }>('/v1/transactions');
    await jest.advanceTimersByTimeAsync(API_RETRY_BASE_MS - 1);
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(calls).toBe(2);
    await jest.advanceTimersByTimeAsync(API_RETRY_BASE_MS * 2 - 1);
    expect(calls).toBe(2);
    await jest.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(calls).toBe(3);
  });

  it('waits for Retry-After when the server asks for longer than the first wait', async () => {
    jest.useFakeTimers();
    let calls = 0;

    apiClient.defaults.adapter = (config) => {
      calls += 1;

      if (calls === 1) {
        return Promise.reject(
          httpError(429, { error: 'rate_limited' }, 'Request failed with status code 429', { 'retry-after': '5' }),
        );
      }

      return jsonResponse(config, { ok: true });
    };

    const pending = apiGet<{ ok: boolean }>('/v1/transactions');
    await jest.advanceTimersByTimeAsync(4_999);
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1);

    await expect(pending).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('does not retry a network failure', async () => {
    let calls = 0;

    apiClient.defaults.adapter = () => {
      calls += 1;

      return Promise.reject(new AxiosError('Network Error'));
    };

    await expect(apiGet('/v1/accounts')).rejects.toMatchObject({ isNetworkError: true });
    expect(calls).toBe(1);
  });

  it('rejects requests through the response interceptor', async () => {
    apiClient.defaults.adapter = () => Promise.reject(new AxiosError('Network Error'));

    await expect(apiClient.get('/')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Network Error',
      status: null,
      isNetworkError: true,
    });
  });
});
