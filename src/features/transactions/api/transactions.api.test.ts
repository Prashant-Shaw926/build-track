import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import {
  TRANSACTION_PAGE_LIMIT,
  fetchAllTransactions,
  fetchTransactionsPage,
} from '@/features/transactions/api/transactions.api';
import type { Transaction, TransactionPage } from '@/features/transactions/types/transaction.types';
import { ApiError, apiClient } from '@/lib/api/client';

const TEST_BASE_URL = 'http://127.0.0.1:4010';

function transaction(id: string, occurredAt: string): Transaction {
  return {
    id,
    account_id: 'acc_4821',
    occurred_at: occurredAt,
    direction: 'debit',
    amount_minor: 34900,
    currency: 'INR',
    merchant: 'SWIGGY*BANGALORE',
    category: 'FOOD',
    status: 'POSTED',
    updated_at: occurredAt,
  };
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

describe('transactions api', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = TEST_BASE_URL;
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseURL;
  });

  it('sends the page limit and includes a cursor only when one is provided', async () => {
    const params: unknown[] = [];
    const page: TransactionPage = {
      items: [],
      next_cursor: null,
      sync_token: 'st_page',
    };

    apiClient.defaults.adapter = (config) => {
      params.push(config.params);
      return jsonResponse(config, page);
    };

    await fetchTransactionsPage({ limit: 25 });
    await fetchTransactionsPage({ limit: 25, cursor: 'cursor-2' });
    await fetchTransactionsPage({ limit: 25, cursor: null });

    expect(params).toEqual([{ limit: 25 }, { limit: 25, cursor: 'cursor-2' }, { limit: 25 }]);
  });

  it('collects every page, drops the repeated boundary id, and keeps newest-first order', async () => {
    const pageOne: Transaction[] = [
      transaction('A', '2026-10-10T17:00:00Z'),
      transaction('B', '2026-10-10T16:00:00Z'),
      transaction('C', '2026-10-10T15:00:00Z'),
    ];
    const pageTwo: Transaction[] = [
      transaction('C', '2026-10-10T15:00:00Z'),
      transaction('D', '2026-10-10T14:00:00Z'),
      transaction('E', '2026-10-10T13:00:00Z'),
    ];
    const pages: TransactionPage[] = [
      { items: pageOne, next_cursor: 'cursor-2', sync_token: 'st_full' },
      { items: pageTwo, next_cursor: null, sync_token: 'st_full' },
    ];
    const requests: unknown[] = [];

    apiClient.defaults.adapter = (config) => {
      requests.push(config.params);
      const page = pages[requests.length - 1];

      if (page === undefined) {
        return Promise.reject(new Error('unexpected extra page'));
      }

      return jsonResponse(config, page);
    };

    const items = await fetchAllTransactions();

    expect(requests).toEqual([{ limit: TRANSACTION_PAGE_LIMIT }, { limit: TRANSACTION_PAGE_LIMIT, cursor: 'cursor-2' }]);
    expect(items.map((item) => item.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(items.filter((item) => item.id === 'C')).toHaveLength(1);
    expect(items.map((item) => item.occurred_at)).toEqual([
      '2026-10-10T17:00:00Z',
      '2026-10-10T16:00:00Z',
      '2026-10-10T15:00:00Z',
      '2026-10-10T14:00:00Z',
      '2026-10-10T13:00:00Z',
    ]);
  });

  it('rejects with the page error instead of returning a partial list', async () => {
    let calls = 0;

    apiClient.defaults.adapter = (config) => {
      calls += 1;

      if (calls === 1) {
        return jsonResponse(config, {
          items: [transaction('A', '2026-10-10T17:00:00Z')],
          next_cursor: 'cursor-2',
          sync_token: 'st_full',
        });
      }

      return Promise.reject(httpError(500, { error: 'internal_error' }, 'Request failed with status code 500'));
    };

    const error = await fetchAllTransactions().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 500,
      isNetworkError: false,
    });
    expect(calls).toBe(2);
  });

  it('stops when a cursor is repeated and does not request another page', async () => {
    let calls = 0;

    apiClient.defaults.adapter = (config) => {
      calls += 1;

      return jsonResponse(config, {
        items: [transaction('A', '2026-10-10T17:00:00Z')],
        next_cursor: 'again',
        sync_token: 'st_full',
      });
    };

    await expect(fetchAllTransactions()).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Transaction pagination returned a cursor that was already used.',
      status: null,
      isNetworkError: false,
    });
    expect(calls).toBe(2);
  });
});
