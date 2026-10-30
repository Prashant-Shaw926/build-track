import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TransactionList } from '@/features/transactions/components/transaction-list';
import type { TrackTransactionRow } from '@/features/transactions/utils/track-month';

describe('TransactionList', () => {
  const transactions: TrackTransactionRow[] = [
    {
      id: 'txn_1',
      merchant: 'SWIGGY',
      categoryLabel: 'FOOD',
      dateLabel: '10 Oct 2026',
      directionLabel: 'Debit',
      statusLabel: null,
      amountPrimary: '₹350.00',
      amountSecondary: null,
      accountLabel: 'HDFC Savings',
    },
    {
      id: 'txn_2',
      merchant: 'TECH CORP',
      categoryLabel: 'SALARY',
      dateLabel: '11 Oct 2026',
      directionLabel: 'Credit',
      statusLabel: 'Pending',
      amountPrimary: '₹2,00,000.00',
      amountSecondary: null,
      accountLabel: 'HDFC Savings',
    },
  ];

  it('renders loading state', async () => {
    const { getByText } = await render(
      <TransactionList
        status="loading"
        transactions={[]}
        errorMessage=""
        bottomInset={0}
        emptyTitle="No transactions"
        onRetry={jest.fn()}
        onSelect={jest.fn()}
        updating={false}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );
    expect(getByText('Loading transactions')).toBeTruthy();
  });

  it('renders error state with retry action', async () => {
    const handleRetry = jest.fn();
    const { getByText } = await render(
      <TransactionList
        status="error"
        transactions={[]}
        errorMessage="Could not connect to server"
        bottomInset={0}
        emptyTitle="No transactions"
        onRetry={handleRetry}
        onSelect={jest.fn()}
        updating={false}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );

    expect(getByText('Transactions unavailable')).toBeTruthy();
    expect(getByText('Could not connect to server')).toBeTruthy();
    fireEvent.press(getByText('Retry'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders empty title when transaction array is empty', async () => {
    const { getByText } = await render(
      <TransactionList
        status="ready"
        transactions={[]}
        errorMessage=""
        bottomInset={0}
        emptyTitle="No matching transactions"
        onRetry={jest.fn()}
        onSelect={jest.fn()}
        updating={false}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );
    expect(getByText('No matching transactions')).toBeTruthy();
  });

  it('renders transaction rows and handles select press', async () => {
    const handleSelect = jest.fn();
    const { getByText } = await render(
      <TransactionList
        status="ready"
        transactions={transactions}
        errorMessage=""
        bottomInset={0}
        emptyTitle="No transactions"
        onRetry={jest.fn()}
        onSelect={handleSelect}
        updating={false}
        refreshing={false}
        onRefresh={jest.fn()}
      />
    );

    expect(getByText('SWIGGY')).toBeTruthy();
    expect(getByText('₹350.00')).toBeTruthy();
    expect(getByText('TECH CORP')).toBeTruthy();
    expect(getByText('₹2,00,000.00')).toBeTruthy();

    fireEvent.press(getByText('SWIGGY'));
    expect(handleSelect).toHaveBeenCalledWith('txn_1');
  });
});
