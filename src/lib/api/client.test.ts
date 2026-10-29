import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { API_TIMEOUT_MS, ApiError, NETWORK_ERROR_MESSAGE, REFRESH_NETWORK_MESSAGE, apiClient, apiErrorMessage, toApiError } from '@/lib/api/client';

function httpError(status: number, data: unknown, message: string): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = {
    status,
    statusText: 'Error',
    headers: {},
    config,
    data,
  } as AxiosResponse;

  return new AxiosError(message, String(status), config, undefined, response);
}

describe('api client', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
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
