import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import {
  TRANSACTION_PAGE_LIMIT,
  fetchAllTransactions,
  fetchTransactionsPage,
  loadTransactionSnapshot,
  type TransactionSnapshot,
} from '@/features/transactions/api/transactions.api';
import type { Transaction, TransactionPage } from '@/features/transactions/types/transaction.types';
import { API_RETRY_ATTEMPTS, ApiError, apiClient } from '@/lib/api/client';

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

async function finishWithFakeTimers<T>(pending: Promise<T>): Promise<T> {
  await jest.runAllTimersAsync();

  return pending;
}

describe('transactions api', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = TEST_BASE_URL;
  });

  afterEach(() => {
    jest.useRealTimers();
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
    expect(items.map((item) => ('occurred_at' in item ? item.occurred_at : null))).toEqual([
      '2026-10-10T17:00:00Z',
      '2026-10-10T16:00:00Z',
      '2026-10-10T15:00:00Z',
      '2026-10-10T14:00:00Z',
      '2026-10-10T13:00:00Z',
    ]);
  });

  it('retries a failed page in place, then keeps paging from that cursor', async () => {
    jest.useFakeTimers();
    const cursors: Array<string | undefined> = [];
    let calls = 0;

    apiClient.defaults.adapter = (config) => {
      calls += 1;
      const params = config.params as { cursor?: string } | undefined;
      cursors.push(params?.cursor);

      if (calls === 1) {
        return jsonResponse(config, {
          items: [transaction('A', '2026-10-10T17:00:00Z')],
          next_cursor: 'cursor-2',
          sync_token: 'st_full',
        });
      }

      if (calls === 2) {
        return Promise.reject(httpError(500, { error: 'internal_error' }, 'Request failed with status code 500'));
      }

      return jsonResponse(config, {
        items: [transaction('B', '2026-10-10T16:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      });
    };

    const items = await finishWithFakeTimers(fetchAllTransactions());

    expect(cursors).toEqual([undefined, 'cursor-2', 'cursor-2']);
    expect(items.map((item) => item.id)).toEqual(['A', 'B']);
  });

  it('rejects with the page error instead of returning a partial list', async () => {
    jest.useFakeTimers();
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

    const error = await finishWithFakeTimers(fetchAllTransactions().catch((caught: unknown) => caught));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 500,
      isNetworkError: false,
    });
    expect(calls).toBe(1 + API_RETRY_ATTEMPTS);
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

describe('transaction sync', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  beforeEach(() => {
    apiClient.defaults.baseURL = TEST_BASE_URL;
  });

  afterEach(() => {
    jest.useRealTimers();
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseURL;
  });

  function snapshot(syncToken: string): TransactionSnapshot {
    return {
      items: [transaction('A', '2026-10-10T17:00:00Z')],
      syncToken,
      changesSynced: true,
      changesErrorMessage: null,
      historyComplete: true,
      resumeCursor: null,
      readyMonths: ['2026-10'],
    };
  }

  it('retries a changes 503 without downloading the history again', async () => {
    let listCalls = 0;
    let changesCalls = 0;

    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';

      if (url.includes('/changes')) {
        changesCalls += 1;

        if (changesCalls === 1) {
          return Promise.reject(httpError(503, { error: 'unavailable' }, 'Request failed with status code 503'));
        }

        return jsonResponse(config, {
          items: [{ ...transaction('B', '2026-10-11T00:00:00Z'), updated_at: '2026-10-11T01:00:00Z' }],
          next_cursor: null,
          sync_token: 'st_after',
        });
      }

      listCalls += 1;

      return jsonResponse(config, {
        items: [transaction('A', '2026-10-10T17:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      });
    };

    jest.useFakeTimers();
    const loaded = await finishWithFakeTimers(loadTransactionSnapshot(null));

    expect(listCalls).toBe(1);
    expect(changesCalls).toBe(2);
    expect(loaded.syncToken).toBe('st_after');
    expect(loaded.changesSynced).toBe(true);
    expect(loaded.items.map((item) => item.id)).toEqual(['B', 'A']);
  });

  it('keeps the full list and its token when the first changes request fails', async () => {
    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';

      if (url.includes('/changes')) {
        return Promise.reject(httpError(500, { error: 'internal_error' }, 'Request failed with status code 500'));
      }

      return jsonResponse(config, {
        items: [transaction('A', '2026-10-10T17:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      });
    };

    jest.useFakeTimers();
    const loaded = await finishWithFakeTimers(loadTransactionSnapshot(null));

    expect(loaded.items.map((item) => item.id)).toEqual(['A']);
    expect(loaded.syncToken).toBe('st_full');
    expect(loaded.changesSynced).toBe(false);
    expect(loaded.changesErrorMessage).toBe('Request failed with status code 500');
  });

  it('keeps the previous snapshot when a later changes request fails', async () => {
    const previous = snapshot('st_full');
    let calls = 0;

    apiClient.defaults.adapter = () => {
      calls += 1;
      return Promise.reject(new AxiosError('Network Error'));
    };

    await expect(loadTransactionSnapshot(previous)).rejects.toMatchObject({
      isNetworkError: true,
    });
    expect(calls).toBe(1);
    expect(previous.items.map((item) => item.id)).toEqual(['A']);
    expect(previous.syncToken).toBe('st_full');
  });

  it('starts a full sync when the saved token is expired and only then replaces the rows', async () => {
    const calls: string[] = [];
    const previous = snapshot('st_old');

    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';
      const params = config.params as { since?: string } | undefined;

      if (url.includes('/changes')) {
        calls.push(`changes:${params?.since ?? ''}`);

        if (params?.since === 'st_old') {
          return Promise.reject(httpError(410, { error: 'sync_token_expired' }, 'Request failed with status code 410'));
        }

        return jsonResponse(config, { items: [], next_cursor: null, sync_token: 'st_after' });
      }

      calls.push('list');

      return jsonResponse(config, {
        items: [transaction('B', '2026-10-12T00:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      } satisfies TransactionPage);
    };

    const loaded = await loadTransactionSnapshot(previous);

    expect(calls).toEqual(['changes:st_old', 'list', 'changes:st_full']);
    expect(previous.items.map((item) => item.id)).toEqual(['A']);
    expect(loaded.items.map((item) => item.id)).toEqual(['B']);
    expect(loaded.syncToken).toBe('st_after');
    expect(loaded.changesSynced).toBe(true);
  });

  it('rejects without looping if the full refetch also fails after 410', async () => {
    const previous = snapshot('st_old');
    let listAttempts = 0;

    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';
      if (url.includes('/changes')) {
        return Promise.reject(httpError(410, { error: 'sync_token_expired' }, 'Request failed with status code 410'));
      }

      listAttempts += 1;
      return Promise.reject(httpError(400, { error: 'bad_request' }, 'Bad request'));
    };

    let error: unknown = null;
    try {
      await loadTransactionSnapshot(previous);
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe('Bad request');
    expect(listAttempts).toBe(1);
  });

  it('publishes the latest ready month before the rest of history finishes', async () => {
    const progress: TransactionSnapshot[] = [];
    const pages: TransactionPage[] = [
      {
        items: [transaction('O1', '2026-10-10T10:00:00Z'), transaction('O2', '2026-10-02T10:00:00Z')],
        next_cursor: 'c2',
        sync_token: 'st_full',
      },
      {
        items: [transaction('O2', '2026-10-02T10:00:00Z'), transaction('S1', '2026-09-15T10:00:00Z')],
        next_cursor: 'c3',
        sync_token: 'st_full',
      },
      {
        items: [transaction('S2', '2026-09-01T10:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      },
    ];
    let pageIndex = 0;

    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';

      if (url.includes('/changes')) {
        return jsonResponse(config, { items: [], next_cursor: null, sync_token: 'st_after' });
      }

      const page = pages[pageIndex];
      pageIndex += 1;

      if (page === undefined) {
        return Promise.reject(new Error('unexpected page'));
      }

      return jsonResponse(config, page);
    };

    const loaded = await loadTransactionSnapshot(null, {
      onProgress: (snapshot) => {
        progress.push(snapshot);
      },
    });

    expect(progress.length).toBeGreaterThanOrEqual(1);
    expect(progress[0]?.historyComplete).toBe(false);
    expect(progress[0]?.readyMonths).toEqual(['2026-10']);
    expect(progress[0]?.syncToken).toBeNull();
    expect(loaded.historyComplete).toBe(true);
    expect(loaded.readyMonths).toEqual(['2026-09', '2026-10']);
    expect(loaded.syncToken).toBe('st_after');
    expect(loaded.items.map((item) => item.id)).toEqual(['O1', 'O2', 'S1', 'S2']);
  });

  it('resumes an incomplete snapshot from the saved cursor', async () => {
    const cursors: Array<string | undefined> = [];
    const previous: TransactionSnapshot = {
      items: [
        transaction('O1', '2026-10-10T10:00:00Z'),
        transaction('O2', '2026-10-02T10:00:00Z'),
        transaction('S1', '2026-09-15T10:00:00Z'),
      ],
      syncToken: null,
      changesSynced: false,
      changesErrorMessage: null,
      historyComplete: false,
      resumeCursor: 'resume-me',
      readyMonths: ['2026-10'],
    };

    apiClient.defaults.adapter = (config) => {
      const url = config.url ?? '';
      const params = config.params as { cursor?: string } | undefined;

      if (url.includes('/changes')) {
        return jsonResponse(config, { items: [], next_cursor: null, sync_token: 'st_after' });
      }

      cursors.push(params?.cursor);

      return jsonResponse(config, {
        items: [transaction('S2', '2026-09-01T10:00:00Z')],
        next_cursor: null,
        sync_token: 'st_full',
      });
    };

    const loaded = await loadTransactionSnapshot(previous);

    expect(cursors).toEqual(['resume-me']);
    expect(loaded.historyComplete).toBe(true);
    expect(loaded.items.map((item) => item.id)).toEqual(['O1', 'O2', 'S1', 'S2']);
    expect(loaded.readyMonths).toEqual(['2026-09', '2026-10']);
  });
});
