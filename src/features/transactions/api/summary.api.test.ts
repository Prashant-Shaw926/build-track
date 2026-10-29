import { type InternalAxiosRequestConfig } from 'axios';

import { fetchMonthlySummary } from '@/features/transactions/api/summary.api';
import { apiClient } from '@/lib/api/client';

const TEST_BASE_URL = 'http://127.0.0.1:4010';

function jsonResponse(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
}

describe('summary api', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = TEST_BASE_URL;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseURL;
  });

  it('keeps monthly spend and income as decimal strings', async () => {
    const summary = {
      months: {
        '2025-09': {
          spend: '614.28',
          income: '242333.00',
          count: 2,
        },
      },
      computed_at: '2026-10-10T18:00:00Z',
    };

    apiClient.defaults.adapter = (config) => jsonResponse(config, summary);

    const result = await fetchMonthlySummary();

    expect(result).toEqual(summary);
    expect(result.months['2025-09']?.spend).toBe('614.28');
    expect(result.months['2025-09']?.income).toBe('242333.00');
    expect(result.months['2025-09']?.count).toBe(2);
    expect(result.computed_at).toBe('2026-10-10T18:00:00Z');
  });
});
