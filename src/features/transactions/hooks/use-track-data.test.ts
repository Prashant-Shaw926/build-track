import { act, renderHook } from '@testing-library/react-native';

import { useAccounts } from '@/features/transactions/hooks/use-accounts';
import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { useTrackData } from '@/features/transactions/hooks/use-track-data';
import type { ApiTransaction } from '@/features/transactions/types/transaction.types';

jest.mock('@/features/transactions/hooks/use-accounts');
jest.mock('@/features/transactions/hooks/use-transactions');

const mockUseAccounts = useAccounts as jest.Mock;
const mockUseTransactions = useTransactions as jest.Mock;

const sampleAccounts = [
  { id: 'acc_1', bank: 'HDFC Bank', type: 'SAVINGS', last4: '4821', nickname: 'HDFC Savings' },
];

const sampleTransactions: ApiTransaction[] = [
  {
    id: 'txn_oct_debit_swiggy',
    account_id: 'acc_1',
    occurred_at: '2026-10-10T10:00:00Z',
    direction: 'debit',
    amount_minor: 35000,
    currency: 'INR',
    merchant: 'SWIGGY',
    category: 'FOOD',
    status: 'POSTED',
    updated_at: '2026-10-10T10:00:00Z',
  },
  {
    id: 'txn_oct_credit_salary',
    account_id: 'acc_1',
    occurred_at: '2026-10-11T10:00:00Z',
    direction: 'credit',
    amount_minor: 20000000,
    currency: 'INR',
    merchant: 'TECH CORP SALARY',
    category: 'SALARY',
    status: 'POSTED',
    updated_at: '2026-10-11T10:00:00Z',
  },
  {
    id: 'txn_oct_debit_uber',
    account_id: 'acc_1',
    occurred_at: '2026-10-12T10:00:00Z',
    direction: 'debit',
    amount_minor: 45000,
    currency: 'INR',
    merchant: 'UBER TRIP',
    category: 'TRAVEL',
    status: 'POSTED',
    updated_at: '2026-10-12T10:00:00Z',
  },
  {
    id: 'txn_sep_debit_amazon',
    account_id: 'acc_1',
    occurred_at: '2026-09-15T10:00:00Z',
    direction: 'debit',
    amount_minor: 129900,
    currency: 'INR',
    merchant: 'AMAZON INDIA',
    category: 'SHOPPING',
    status: 'POSTED',
    updated_at: '2026-09-15T10:00:00Z',
  },
  {
    id: 'txn_sep_credit_refund',
    account_id: 'acc_1',
    occurred_at: '2026-09-16T10:00:00Z',
    direction: 'credit',
    amount_minor: 50000,
    currency: 'INR',
    merchant: 'AMAZON REFUND',
    category: 'SHOPPING',
    status: 'POSTED',
    updated_at: '2026-09-16T10:00:00Z',
  },
];

describe('useTrackData - search debounce and instant filter safeguards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseAccounts.mockReturnValue({
      data: { items: sampleAccounts },
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn().mockResolvedValue({ isError: false }),
    });
    mockUseTransactions.mockReturnValue({
      data: {
        items: sampleTransactions,
        syncToken: 'st_123',
        changesSynced: true,
        changesErrorMessage: null,
        historyComplete: true,
        resumeCursor: null,
        readyMonths: ['2026-09', '2026-10'],
      },
      isPending: false,
      isError: false,
      isFetching: false,
      isRefetching: false,
      dataUpdatedAt: Date.now(),
      refetch: jest.fn().mockResolvedValue({ isError: false }),
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('1. Type a query, then change direction within 200ms: final state reflects BOTH without stale overwrite', async () => {
    const { result } = await renderHook(() => useTrackData());

    expect(result.current.view.selectedMonth).toBe('2026-10');
    expect(result.current.view.transactions).toHaveLength(3);

    // Type query "SWIGGY" (which is a debit)
    await act(async () => {
      result.current.setQuery('SWIGGY');
    });

    // Before 200ms expires, change direction to 'credit'
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      result.current.setDirection('credit');
    });

    // Advance beyond the remaining debounce window
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    // "SWIGGY" is debit, direction is credit => 0 matching rows!
    expect(result.current.direction).toBe('credit');
    expect(result.current.query).toBe('SWIGGY');
    expect(result.current.view.transactions).toHaveLength(0);
    expect(result.current.listBusy).toBe(false);
  });

  it('2. Type a query, then switch month within 200ms: reflects BOTH with no stale overwrite', async () => {
    const { result } = await renderHook(() => useTrackData());

    expect(result.current.view.selectedMonth).toBe('2026-10');

    // Type query "AMAZON" (only exists in September)
    await act(async () => {
      result.current.setQuery('AMAZON');
    });

    // Switch month to September within 200ms
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    await act(async () => {
      result.current.selectMonth('2026-09');
    });

    // Advance beyond debounce window
    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(result.current.view.selectedMonth).toBe('2026-09');
    expect(result.current.query).toBe('AMAZON');
    // Both Amazon transactions in September match
    expect(result.current.view.transactions).toHaveLength(2);
    expect(result.current.listBusy).toBe(false);
  });

  it('3. Type, then clear the query: the list updates correctly and the spinner clears', async () => {
    const { result } = await renderHook(() => useTrackData());

    expect(result.current.view.transactions).toHaveLength(3);

    // Type "UBER"
    await act(async () => {
      result.current.setQuery('UBER');
    });
    expect(result.current.listBusy).toBe(true);

    // Let it settle
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.view.transactions).toHaveLength(1);
    expect(result.current.view.transactions[0].merchant).toBe('UBER TRIP');
    expect(result.current.listBusy).toBe(false);

    // Now clear query
    await act(async () => {
      result.current.setQuery('');
    });
    expect(result.current.listBusy).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current.view.transactions).toHaveLength(3);
    expect(result.current.listBusy).toBe(false);
  });

  it('4. Change month with an unchanged query: updates instantly, with no spinner', async () => {
    const { result } = await renderHook(() => useTrackData());

    expect(result.current.view.selectedMonth).toBe('2026-10');
    expect(result.current.view.transactions).toHaveLength(3);

    // Change month without touching query
    await act(async () => {
      result.current.selectMonth('2026-09');
    });

    // MUST update instantly at t=0 without advancing fake timers!
    expect(result.current.view.selectedMonth).toBe('2026-09');
    expect(result.current.view.transactions).toHaveLength(2);
    expect(result.current.listBusy).toBe(false);
  });

  it('5. Rapid typing: only the last query is applied', async () => {
    const { result } = await renderHook(() => useTrackData());

    await act(async () => {
      result.current.setQuery('U');
    });
    await act(async () => {
      jest.advanceTimersByTime(50);
      result.current.setQuery('UB');
    });
    await act(async () => {
      jest.advanceTimersByTime(50);
      result.current.setQuery('UBE');
    });
    await act(async () => {
      jest.advanceTimersByTime(50);
      result.current.setQuery('UBER');
    });

    expect(result.current.listBusy).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.query).toBe('UBER');
    expect(result.current.view.transactions).toHaveLength(1);
    expect(result.current.view.transactions[0].merchant).toBe('UBER TRIP');
    expect(result.current.listBusy).toBe(false);
  });

  it('handles month navigation, category filtering, direction filtering, and sort orders', async () => {
    const { result } = await renderHook(() => useTrackData());

    // Month navigation
    expect(result.current.view.selectedMonth).toBe('2026-10');
    await act(async () => {
      result.current.showPreviousMonth();
    });
    expect(result.current.view.selectedMonth).toBe('2026-09');

    await act(async () => {
      result.current.showNextMonth();
    });
    expect(result.current.view.selectedMonth).toBe('2026-10');

    // Category filtering
    expect(result.current.categoryChoices.map((c) => c.label)).toEqual([
      'All categories',
      'FOOD',
      'SALARY',
      'TRAVEL',
    ]);

    await act(async () => {
      result.current.setCategory({ type: 'category', value: 'FOOD' });
    });
    expect(result.current.view.transactions).toHaveLength(1);
    expect(result.current.view.transactions[0].merchant).toBe('SWIGGY');

    // Reset category
    await act(async () => {
      result.current.setCategory({ type: 'all' });
    });
    expect(result.current.view.transactions).toHaveLength(3);

    // Direction filtering
    await act(async () => {
      result.current.setDirection('credit');
    });
    expect(result.current.view.transactions).toHaveLength(1);
    expect(result.current.view.transactions[0].merchant).toBe('TECH CORP SALARY');

    await act(async () => {
      result.current.setDirection('debit');
    });
    expect(result.current.view.transactions).toHaveLength(2);

    await act(async () => {
      result.current.setDirection('all');
    });
    expect(result.current.view.transactions).toHaveLength(3);

    // Sort order: amount-desc
    await act(async () => {
      result.current.setSort('amount-desc');
    });
    expect(result.current.view.transactions[0].merchant).toBe('TECH CORP SALARY');
    expect(result.current.view.transactions[1].merchant).toBe('UBER TRIP');
    expect(result.current.view.transactions[2].merchant).toBe('SWIGGY');

    // Sort order: amount-asc
    await act(async () => {
      result.current.setSort('amount-asc');
    });
    expect(result.current.view.transactions[0].merchant).toBe('SWIGGY');
    expect(result.current.view.transactions[1].merchant).toBe('UBER TRIP');
    expect(result.current.view.transactions[2].merchant).toBe('TECH CORP SALARY');
  });

  it('handles pull-to-refresh and retry on error', async () => {
    const mockRefetchAccounts = jest.fn().mockResolvedValue({ isError: false });
    const mockRefetchTransactions = jest.fn().mockResolvedValue({ isError: false });
    mockUseAccounts.mockReturnValue({
      data: { items: sampleAccounts },
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: mockRefetchAccounts,
    });
    mockUseTransactions.mockReturnValue({
      data: {
        items: sampleTransactions,
        syncToken: 'st_123',
        changesSynced: true,
        changesErrorMessage: null,
        historyComplete: true,
        resumeCursor: null,
        readyMonths: ['2026-09', '2026-10'],
      },
      isPending: false,
      isError: false,
      isFetching: false,
      isRefetching: false,
      dataUpdatedAt: Date.now(),
      refetch: mockRefetchTransactions,
    });

    const { result } = await renderHook(() => useTrackData());

    await act(async () => {
      result.current.refresh();
    });
    expect(mockRefetchAccounts).toHaveBeenCalledTimes(1);
    expect(mockRefetchTransactions).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.retryTransactions();
    });
    expect(mockRefetchTransactions).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.retrySummary();
    });
    expect(mockRefetchTransactions).toHaveBeenCalledTimes(3);
  });
});

describe('useTrackData - progressive month readiness', () => {
  beforeEach(() => {
    mockUseAccounts.mockReturnValue({
      data: { items: sampleAccounts },
      isPending: false,
      isError: false,
      isRefetching: false,
      refetch: jest.fn().mockResolvedValue({ isError: false }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the latest ready month while older months are still loading in the background', async () => {
    mockUseTransactions.mockReturnValue({
      data: {
        items: sampleTransactions,
        syncToken: null,
        changesSynced: false,
        changesErrorMessage: null,
        historyComplete: false,
        resumeCursor: 'cursor-next',
        readyMonths: ['2026-10'],
      },
      isPending: false,
      isError: false,
      isFetching: true,
      // TanStack marks isRefetching once setQueryData has published the first month
      isRefetching: true,
      dataUpdatedAt: Date.now(),
      refetch: jest.fn().mockResolvedValue({ isError: false }),
    });

    const { result } = await renderHook(() => useTrackData());

    expect(result.current.view.selectedMonth).toBe('2026-10');
    expect(result.current.summaryStatus).toBe('ready');
    expect(result.current.transactionsStatus).toBe('ready');
    expect(result.current.refreshing).toBe(false);
    expect(result.current.listBusy).toBe(false);
    expect(result.current.view.transactions).toHaveLength(3);
    expect(result.current.view.months).toEqual(['2026-09', '2026-10']);
  });

  it('uses the existing loader when the selected month is not ready yet', async () => {
    mockUseTransactions.mockReturnValue({
      data: {
        items: sampleTransactions,
        syncToken: null,
        changesSynced: false,
        changesErrorMessage: null,
        historyComplete: false,
        resumeCursor: 'cursor-next',
        readyMonths: ['2026-10'],
      },
      isPending: false,
      isError: false,
      isFetching: true,
      isRefetching: true,
      dataUpdatedAt: Date.now(),
      refetch: jest.fn().mockResolvedValue({ isError: false }),
    });

    const { result } = await renderHook(() => useTrackData());

    await act(async () => {
      result.current.selectMonth('2026-09');
    });

    expect(result.current.view.selectedMonth).toBe('2026-09');
    expect(result.current.summaryStatus).toBe('loading');
    expect(result.current.transactionsStatus).toBe('loading');
    expect(result.current.refreshing).toBe(false);
    expect(result.current.view.transactions).toHaveLength(0);
    expect(result.current.view.income).toBeNull();
    expect(result.current.view.spend).toBeNull();
  });
});
