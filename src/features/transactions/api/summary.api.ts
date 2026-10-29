import { apiClient } from '@/lib/api/client';
import type { MonthlySummaryResponse } from '@/features/transactions/types/summary.types';

import { requireApiUrl } from './require-api-url';

export async function fetchMonthlySummary(): Promise<MonthlySummaryResponse> {
  requireApiUrl();

  const response = await apiClient.get<MonthlySummaryResponse>('/v1/summary/months');

  return response.data;
}
