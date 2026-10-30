import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';

export const API_TIMEOUT_MS = 15_000;
export const API_RETRY_ATTEMPTS = 4;
export const API_RETRY_BASE_MS = 2_000;
export const NETWORK_ERROR_MESSAGE = 'No network connection.';
export const REFRESH_NETWORK_MESSAGE = "Can't refresh. No network.";

const RETRYABLE_STATUS = new Set([429, 500, 503]);

export class ApiError extends Error {
  readonly status: number | null;
  readonly isNetworkError: boolean;
  readonly retryAfterMs: number | null;

  constructor(
    message: string,
    status: number | null,
    isNetworkError: boolean,
    retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
    this.retryAfterMs = retryAfterMs;
  }
}

function readErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message;
  }

  return fallback;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof AxiosError) {
    if (!error.response) {
      return new ApiError(error.message, null, true);
    }

    return new ApiError(
      readErrorMessage(error.response.data, error.message),
      error.response.status,
      false,
      readRetryAfterMs(error),
    );
  }

  if (error instanceof Error) {
    return new ApiError(error.message, null, false);
  }

  return new ApiError('Request failed', null, false);
}

export function apiErrorMessage(error: unknown, source: 'request' | 'refresh' = 'request'): string {
  const apiError = toApiError(error);

  if (apiError.isNetworkError) {
    return source === 'refresh' ? REFRESH_NETWORK_MESSAGE : NETWORK_ERROR_MESSAGE;
  }

  if (apiError.message.length > 0) {
    return apiError.message;
  }

  return 'Something went wrong';
}

export const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? '',
  timeout: API_TIMEOUT_MS,
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

let requestQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = requestQueue.then(task, task);
  requestQueue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function headerValue(headers: unknown, name: string): unknown {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }

  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get(name);
  }

  const record = headers as Record<string, unknown>;

  return record[name] ?? record[name.toLowerCase()];
}

function parseRetryAfterMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value * 1_000;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const seconds = Number(value);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1_000;
  }

  const at = Date.parse(value);

  if (Number.isNaN(at)) {
    return null;
  }

  return Math.max(0, at - Date.now());
}

function readRetryAfterMs(error: AxiosError): number | null {
  return parseRetryAfterMs(headerValue(error.response?.headers, 'retry-after'));
}

export function retryDelayMs(attempt: number, retryAfterMs: number | null): number {
  const exponential = API_RETRY_BASE_MS * 2 ** attempt;

  if (retryAfterMs === null) {
    return exponential;
  }

  return Math.max(exponential, retryAfterMs);
}

function canRetry(error: ApiError, attempt: number): boolean {
  return (
    !error.isNetworkError &&
    error.status !== null &&
    RETRYABLE_STATUS.has(error.status) &&
    attempt < API_RETRY_ATTEMPTS - 1
  );
}

async function requestWithRetry<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  let attempt = 0;

  for (;;) {
    try {
      const response = await apiClient.get<T>(url, config);

      return response.data;
    } catch (error) {
      const apiError = toApiError(error);

      if (!canRetry(apiError, attempt)) {
        throw apiError;
      }

      await sleep(retryDelayMs(attempt, apiError.retryAfterMs));
      attempt += 1;
    }
  }
}

export function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return enqueue(() => requestWithRetry<T>(url, config));
}
