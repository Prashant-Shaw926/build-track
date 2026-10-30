import { apiGet } from '@/lib/api/client';
import type { MonthlySummaryResponse } from '@/features/transactions/types/summary.types';

import { requireApiUrl } from './require-api-url';

export async function fetchMonthlySummary(): Promise<MonthlySummaryResponse> {
  requireApiUrl();

  return apiGet<MonthlySummaryResponse>('/v1/summary/months');
}
