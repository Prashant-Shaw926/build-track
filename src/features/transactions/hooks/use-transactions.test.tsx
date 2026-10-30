import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useTransactions } from '@/features/transactions/hooks/use-transactions';
import { loadTransactionSnapshot } from '@/features/transactions/api/transactions.api';

jest.mock('@/features/transactions/api/transactions.api', () => ({
  ...jest.requireActual('@/features/transactions/api/transactions.api'),
  loadTransactionSnapshot: jest.fn(),
}));

const mockLoadTransactionSnapshot = loadTransactionSnapshot as jest.Mock;

describe('useTransactions', () => {
  it('loads transaction snapshot', async () => {
    const mockSnapshot = {
      items: [],
      syncToken: 'st_123',
      changesSynced: true,
      changesErrorMessage: null,
    };
    mockLoadTransactionSnapshot.mockResolvedValueOnce(mockSnapshot);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, unmount } = await renderHook(() => useTransactions(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSnapshot);

    unmount();
    queryClient.clear();
  });
});
