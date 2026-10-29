import { ApiError, apiClient } from '@/lib/api/client';

export function requireApiUrl(): void {
  const baseURL = apiClient.defaults.baseURL;

  if (typeof baseURL !== 'string' || baseURL.trim() === '') {
    throw new ApiError('EXPO_PUBLIC_API_URL is not configured.', null, true);
  }
}
