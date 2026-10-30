import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SummaryOverview } from '@/features/transactions/components/summary-overview';

describe('SummaryOverview', () => {
  it('renders income and spend cards with ₹ symbol', async () => {
    const { getByText } = await render(
      <SummaryOverview
        status="ready"
        income="2,45,135.00"
        spend="1,09,784.98"
        errorMessage=""
        onRetry={jest.fn()}
      />
    );

    expect(getByText('Income')).toBeTruthy();
    expect(getByText('₹2,45,135.00')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('₹1,09,784.98')).toBeTruthy();
  });

  it('renders loading state', async () => {
    const { getByText } = await render(
      <SummaryOverview
        status="loading"
        income={null}
        spend={null}
        errorMessage=""
        onRetry={jest.fn()}
      />
    );
    expect(getByText('Loading summary')).toBeTruthy();
  });

  it('renders error state with retry action', async () => {
    const handleRetry = jest.fn();
    const { getByText } = await render(
      <SummaryOverview
        status="error"
        income={null}
        spend={null}
        errorMessage="Network error"
        onRetry={handleRetry}
      />
    );
    expect(getByText('Summary unavailable')).toBeTruthy();
    expect(getByText('Network error')).toBeTruthy();

    fireEvent.press(getByText('Retry'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty month state when income or spend is null', async () => {
    const { getByText } = await render(
      <SummaryOverview
        status="ready"
        income={null}
        spend={null}
        errorMessage=""
        onRetry={jest.fn()}
      />
    );
    expect(getByText('No summary for this month')).toBeTruthy();
  });
});
