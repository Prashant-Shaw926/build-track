import axios, { AxiosError, type AxiosResponse } from 'axios';

export const API_TIMEOUT_MS = 15_000;
export const NETWORK_ERROR_MESSAGE = 'No network connection.';
export const REFRESH_NETWORK_MESSAGE = "Can't refresh. No network.";

export class ApiError extends Error {
  readonly status: number | null;
  readonly isNetworkError: boolean;

  constructor(message: string, status: number | null, isNetworkError: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
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
