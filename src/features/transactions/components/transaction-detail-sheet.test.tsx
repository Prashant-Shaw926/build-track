import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('@/features/transactions/components/bottom-sheet', () => {
  const { Pressable, Text } = require('react-native');

  return {
    BottomSheet: ({
      visible,
      header,
      children,
      closeLabel,
      onClose,
    }: {
      visible: boolean;
      header?: React.ReactNode;
      children: React.ReactNode;
      closeLabel: string;
      onClose: () => void;
    }) =>
      visible ? (
        <>
          {header}
          <Pressable accessibilityLabel={closeLabel} accessibilityRole="button" onPress={onClose}>
            <Text>×</Text>
          </Pressable>
          {children}
        </>
      ) : null,
  };
});

import { TransactionDetailSheet } from '@/features/transactions/components/transaction-detail-sheet';
import type { NormalizedTransaction } from '@/features/transactions/types/normalized-transaction.types';

describe('TransactionDetailSheet', () => {
  const normalTx: NormalizedTransaction = {
    id: 'txn_123',
    source: 'canonical',
    accountId: 'acc_1',
    accountLast4: '4821',
    accountMatch: 'unique',
    occurredAt: '2026-10-10T14:30:00.000Z',
    occurredAtMs: Date.parse('2026-10-10T14:30:00.000Z'),
    direction: 'debit',
    amountMinor: 35000,
    currency: 'INR',
    inrAmountMinor: 35000,
    merchant: 'SWIGGY*BANGALORE',
    category: 'FOOD',
    status: 'POSTED',
    updatedAt: '2026-10-10T14:35:00.000Z',
    counterparty: null,
    linkedAccountLast4: null,
  };

  const selfTransferTx: NormalizedTransaction = {
    ...normalTx,
    id: 'txn_transfer_456',
    direction: 'credit',
    amountMinor: 500000,
    inrAmountMinor: 500000,
    merchant: 'SELF TRANSFER',
    category: 'TRANSFER',
    counterparty: { type: 'OWN_ACCOUNT', accountId: 'acc_2' },
  };

  it('renders normal transaction details with settled status and close control', async () => {
    const handleClose = jest.fn();

    await render(
      <TransactionDetailSheet transaction={normalTx} accountLabel="HDFC Savings" onClose={handleClose} />,
    );

    expect(screen.getByText('SWIGGY BANGALORE')).toBeTruthy();
    expect(screen.getByText('₹350.00')).toBeTruthy();
    expect(screen.getByText('FOOD')).toBeTruthy();
    expect(screen.getByText('Settled')).toBeTruthy();
    expect(screen.getByText('HDFC Savings')).toBeTruthy();
    expect(screen.getByText('txn_123')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close transaction details'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders self-transfer note when transaction is an own-account transfer', async () => {
    await render(
      <TransactionDetailSheet transaction={selfTransferTx} accountLabel="HDFC Savings" onClose={jest.fn()} />,
    );

    expect(screen.getByText('This is a self-transfer, not an actual expense or income.')).toBeTruthy();
  });

  it('hides details when no transaction is selected', async () => {
    await render(<TransactionDetailSheet transaction={null} accountLabel={null} onClose={jest.fn()} />);

    expect(screen.queryByText('SWIGGY BANGALORE')).toBeNull();
    expect(screen.queryByText('×')).toBeNull();
  });
});
