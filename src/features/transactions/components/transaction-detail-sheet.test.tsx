import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/features/transactions/components/bottom-sheet', () => ({
  BottomSheet: ({ visible, header, children }: { visible: boolean; header: React.ReactNode; children: React.ReactNode }) =>
    visible ? (
      <>
        {header}
        {children}
      </>
    ) : null,
}));

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

  it('renders normal transaction details', async () => {
    const { getByText } = await render(
      <TransactionDetailSheet
        transaction={normalTx}
        accountLabel="HDFC Savings"
        onClose={jest.fn()}
      />
    );

    expect(getByText('SWIGGY BANGALORE')).toBeTruthy();
    expect(getByText('₹350.00')).toBeTruthy();
    expect(getByText('FOOD')).toBeTruthy();
    expect(getByText('HDFC Savings')).toBeTruthy();
    expect(getByText('txn_123')).toBeTruthy();
  });

  it('renders self-transfer note when transaction is an own-account transfer', async () => {
    const { getByText } = await render(
      <TransactionDetailSheet
        transaction={selfTransferTx}
        accountLabel="HDFC Savings"
        onClose={jest.fn()}
      />
    );

    expect(getByText('This is a self-transfer, not an actual expense or income.')).toBeTruthy();
  });
});
