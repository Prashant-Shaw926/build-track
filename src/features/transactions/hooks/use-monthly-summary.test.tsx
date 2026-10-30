import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { useMonthlySummary } from '@/features/transactions/hooks/use-monthly-summary';
import { fetchMonthlySummary } from '@/features/transactions/api/summary.api';

jest.mock('@/features/transactions/api/summary.api');

const mockFetchMonthlySummary = fetchMonthlySummary as jest.Mock;

describe('useMonthlySummary', () => {
  it('fetches and returns monthly summary data', async () => {
    const mockSummary = {
      months: {
        '2026-10': { spend: '100.00', income: '200.00' },
      },
    };
    mockFetchMonthlySummary.mockResolvedValueOnce(mockSummary);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, unmount } = await renderHook(() => useMonthlySummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSummary);

    unmount();
    queryClient.clear();
  });
});
