import type { InternalAxiosRequestConfig } from 'axios';

import {
  TRANSACTION_PAGE_LIMIT,
  fetchAllTransactions,
} from '@/features/transactions/api/transactions.api';
import type { TransactionPage } from '@/features/transactions/types/transaction.types';
import { apiClient } from '@/lib/api/client';

const TEST_BASE_URL = 'http://127.0.0.1:4010';

interface FixtureTransaction {
  id: string;
}

declare const require: (moduleName: string) => FixtureTransaction[];

function readFixtureTransactions(): FixtureTransaction[] {
  return require('../../../../mock-api/fixtures/transactions.json');
}

function pageCount(length: number, limit: number): number {
  let offset = 0;
  let count = 0;

  for (;;) {
    count += 1;

    if (offset + limit >= length) {
      return count;
    }

    offset += limit - 1;
  }
}

function pageAt(list: FixtureTransaction[], cursor: string | undefined, limit: number): TransactionPage {
  const offset = cursor === undefined ? 0 : Number(cursor);
  const items = list.slice(offset, offset + limit);
  const finished = offset + limit >= list.length;

  return {
    items: items as TransactionPage['items'],
    next_cursor: finished ? null : String(offset + limit - 1),
    sync_token: 'st_fixture',
  };
}

describe('transaction fixture pagination', () => {
  const originalAdapter = apiClient.defaults.adapter;
  const originalBaseURL = apiClient.defaults.baseURL;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    apiClient.defaults.baseURL = originalBaseURL;
  });

  it('dedupes the fixture boundary row and keeps fixture order', async () => {
    const fixture = readFixtureTransactions();
    const expectedPages = pageCount(fixture.length, TRANSACTION_PAGE_LIMIT);
    let calls = 0;
    let rawCount = 0;
    let boundaryRepeats = 0;
    let previousLastId: string | undefined;

    apiClient.defaults.baseURL = TEST_BASE_URL;
    apiClient.defaults.adapter = (config: InternalAxiosRequestConfig) => {
      calls += 1;

      if (calls > expectedPages) {
        return Promise.reject(new Error('pagination requested a page after the fixture ended'));
      }

      const params = config.params as { limit?: number; cursor?: string } | undefined;
      const page = pageAt(fixture, params?.cursor, TRANSACTION_PAGE_LIMIT);
      rawCount += page.items.length;

      const firstId = page.items[0]?.id;

      if (previousLastId !== undefined && firstId === previousLastId) {
        boundaryRepeats += 1;
      }

      previousLastId = page.items.at(-1)?.id;

      return Promise.resolve({
        data: page,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      });
    };

    const items = await fetchAllTransactions();
    const ids = items.map((item) => item.id);

    expect(calls).toBe(expectedPages);
    expect(boundaryRepeats).toBe(expectedPages - 1);
    expect(rawCount).toBeGreaterThan(fixture.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(fixture.map((item) => item.id));
  });
});
