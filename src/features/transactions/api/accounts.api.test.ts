import { type InternalAxiosRequestConfig } from 'axios';

import { fetchAccounts } from '@/features/transactions/api/accounts.api';
import { ApiError, apiClient } from '@/lib/api/client';

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

describe('accounts api', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = TEST_BASE_URL;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseURL;
  });

  it('returns account items from the response', async () => {
    const accounts = {
      items: [
        {
          id: 'acc_4821',
          bank: 'HDFC Bank',
          type: 'SAVINGS',
          last4: '4821',
          nickname: 'HDFC Savings',
        },
      ],
    };

    apiClient.defaults.adapter = (config) => jsonResponse(config, accounts);

    await expect(fetchAccounts()).resolves.toEqual(accounts);
  });

  it('rejects before requesting when the API base URL is missing', async () => {
    let calls = 0;
    apiClient.defaults.baseURL = '';
    apiClient.defaults.adapter = () => {
      calls += 1;
      return Promise.reject(new Error('adapter should not run'));
    };

    const error = await fetchAccounts().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'EXPO_PUBLIC_API_URL is not configured.',
      status: null,
      isNetworkError: true,
    });
    expect(calls).toBe(0);
  });
});
