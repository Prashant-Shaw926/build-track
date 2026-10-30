import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useAccounts } from '@/features/transactions/hooks/use-accounts';
import { fetchAccounts } from '@/features/transactions/api/accounts.api';

jest.mock('@/features/transactions/api/accounts.api');

const mockFetchAccounts = fetchAccounts as jest.Mock;

describe('useAccounts', () => {
  it('fetches and returns account data', async () => {
    const mockAccounts = {
      items: [{ id: 'acc_1', bank: 'HDFC', type: 'SAVINGS', last4: '4821', nickname: 'HDFC Savings' }],
    };
    mockFetchAccounts.mockResolvedValueOnce(mockAccounts);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, unmount } = await renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAccounts);

    unmount();
    queryClient.clear();
  });
});
