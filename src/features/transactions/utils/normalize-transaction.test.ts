import type { Account } from '@/features/transactions/types/account.types';
import type { NormalizationResult } from '@/features/transactions/types/normalized-transaction.types';
import {
  normalizeTransaction,
  normalizeTransactions,
} from '@/features/transactions/utils/normalize-transaction';

const accounts: Account[] = [
  {
    id: 'acc_4821',
    bank: 'HDFC Bank',
    type: 'SAVINGS',
    last4: '4821',
    nickname: 'HDFC Savings',
  },
  {
    id: 'acc_9075',
    bank: 'ICICI Bank',
    type: 'SAVINGS',
    last4: '9075',
    nickname: 'ICICI Savings',
  },
  {
    id: 'acc_3310',
    bank: 'HDFC Bank',
    type: 'CREDIT_CARD',
    last4: '3310',
    nickname: 'HDFC Millennia',
  },
];

const canonicalInr = {
  id: 'txn_CAB0F6461E85B5772A81',
  account_id: 'acc_4821',
  occurred_at: '2026-10-10T17:03:00Z',
  direction: 'debit',
  amount_minor: 4800,
  currency: 'INR',
  merchant: 'UPI/CHAI POINT',
  category: 'FOOD',
  status: 'POSTED',
  updated_at: '2026-10-10T17:50:00Z',
};

const canonicalNullCategory = {
  id: 'txn_B3E60C56FBE0CF858DAD',
  account_id: 'acc_3310',
  occurred_at: '2026-09-12T04:30:00Z',
  direction: 'debit',
  amount_minor: 247816,
  currency: 'INR',
  merchant: 'POS 4532 UNKNOWN',
  category: null,
  status: 'POSTED',
  updated_at: '2026-09-12T05:01:00Z',
};

const canonicalUsd = {
  id: 'txn_71F19FEA3921A7D7F8E0',
  account_id: 'acc_3310',
  occurred_at: '2026-10-08T21:45:00Z',
  direction: 'debit',
  amount_minor: 1000,
  currency: 'USD',
  merchant: 'NOTION LABS INC',
  category: 'SUBSCRIPTIONS',
  status: 'POSTED',
  updated_at: '2026-10-08T23:14:00Z',
  fx: { inr_minor: 86661 },
};

const canonicalTransfer = {
  id: 'txn_353BCE9C7A68AA1F2DD6',
  account_id: 'acc_9075',
  occurred_at: '2026-10-03T04:44:00Z',
  direction: 'credit',
  amount_minor: 2500000,
  currency: 'INR',
  merchant: 'SELF TRANSFER FROM XX4821',
  category: 'TRANSFER',
  status: 'POSTED',
  updated_at: '2026-10-03T05:54:00Z',
  counterparty: { type: 'OWN_ACCOUNT', account_id: 'acc_4821' },
};

const legacyDebit = {
  id: '115509',
  account: '4821',
  txn_time: 1774981380,
  amount: '516.49',
  type: 'DR',
  merchant_name: 'BLINKIT',
  category: 'GROCERIES',
  status: 'POSTED',
};

const legacyCredit = {
  id: '132083',
  account: '3310',
  txn_time: 1773848160,
  amount: '21579.63',
  type: 'CR',
  merchant_name: 'PAYMENT RECEIVED - THANK YOU',
  category: 'TRANSFER',
  status: 'POSTED',
  linked_account: '9075',
};

const legacyNullCategory = {
  id: '132723',
  account: '4821',
  txn_time: 1772531100,
  amount: '30.00',
  type: 'DR',
  merchant_name: 'UPI/0000000000@PAYTM',
  category: null,
  status: 'POSTED',
};

function expectNormalized(result: NormalizationResult) {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(result.reason);
  }

  return result.transaction;
}

describe('normalize transactions', () => {
  it('keeps a canonical INR debit in minor units and copies the id', () => {
    const transaction = expectNormalized(normalizeTransaction(canonicalInr));

    expect(transaction.id).toBe('txn_CAB0F6461E85B5772A81');
    expect(transaction.source).toBe('canonical');
    expect(transaction.direction).toBe('debit');
    expect(transaction.amountMinor).toBe(4800);
    expect(transaction.currency).toBe('INR');
    expect(transaction.inrAmountMinor).toBe(4800);
    expect(transaction.merchant).toBe('UPI/CHAI POINT');
    expect(transaction.category).toBe('FOOD');
    expect(transaction.occurredAt).toBe('2026-10-10T17:03:00Z');
    expect(transaction.accountId).toBe('acc_4821');
    expect(transaction.accountLast4).toBeNull();
    expect(transaction.accountMatch).toBe('not_requested');
    expect(transaction.updatedAt).toBe('2026-10-10T17:50:00Z');
  });

  it('preserves a null canonical category', () => {
    const transaction = expectNormalized(normalizeTransaction(canonicalNullCategory));

    expect(transaction.category).toBeNull();
    expect(transaction.merchant).toBe('POS 4532 UNKNOWN');
  });

  it('copies USD minor units and the API INR amount without applying a rate', () => {
    const transaction = expectNormalized(normalizeTransaction(canonicalUsd));

    expect(transaction.amountMinor).toBe(1000);
    expect(transaction.currency).toBe('USD');
    expect(transaction.inrAmountMinor).toBe(86661);
  });

  it('rejects a malformed fx object instead of substituting another amount', () => {
    expect(normalizeTransaction({ ...canonicalUsd, fx: { inr_minor: -1 } })).toMatchObject({
      ok: false,
      id: canonicalUsd.id,
      reason: 'invalid_fx',
    });
    expect(normalizeTransaction({ ...canonicalUsd, fx: { inr_minor: 86661.5 } })).toMatchObject({
      ok: false,
      reason: 'invalid_fx',
    });
    expect(normalizeTransaction({ ...canonicalUsd, fx: {} })).toMatchObject({
      ok: false,
      reason: 'invalid_fx',
    });
  });

  it('maps a canonical transfer counterparty', () => {
    const transaction = expectNormalized(normalizeTransaction(canonicalTransfer));

    expect(transaction.direction).toBe('credit');
    expect(transaction.counterparty).toEqual({ type: 'OWN_ACCOUNT', accountId: 'acc_4821' });
  });

  it('converts a legacy debit to minor units without assigning INR', () => {
    const transaction = expectNormalized(normalizeTransaction(legacyDebit));

    expect(transaction.id).toBe('115509');
    expect(transaction.source).toBe('legacy');
    expect(transaction.direction).toBe('debit');
    expect(transaction.amountMinor).toBe(51649);
    expect(transaction.currency).toBeNull();
    expect(transaction.inrAmountMinor).toBeNull();
    expect(transaction.merchant).toBe('BLINKIT');
    expect(transaction.category).toBe('GROCERIES');
    expect(transaction.accountId).toBeNull();
    expect(transaction.accountLast4).toBe('4821');
    expect(transaction.occurredAtMs).toBe(1774981380 * 1000);
    expect(transaction.occurredAt).toBe('2026-03-31T18:23:00.000Z');
    expect(transaction.updatedAt).toBeNull();
  });

  it('keeps a legacy credit and its linked account', () => {
    const transaction = expectNormalized(normalizeTransaction(legacyCredit));

    expect(transaction.direction).toBe('credit');
    expect(transaction.amountMinor).toBe(2157963);
    expect(transaction.linkedAccountLast4).toBe('9075');
    expect(transaction.currency).toBeNull();
  });

  it('preserves a null legacy category', () => {
    const transaction = expectNormalized(normalizeTransaction(legacyNullCategory));

    expect(transaction.category).toBeNull();
    expect(transaction.amountMinor).toBe(3000);
  });

  it('fills a unique legacy account and leaves unresolved or ambiguous lookups empty', () => {
    const unique = expectNormalized(normalizeTransaction(legacyDebit, accounts));
    const missing = expectNormalized(
      normalizeTransaction({ ...legacyDebit, account: '0000' }, accounts),
    );
    const ambiguous = expectNormalized(
      normalizeTransaction(legacyDebit, [
        accounts[0],
        { ...accounts[0], id: 'acc_other', nickname: 'Other' },
      ]),
    );

    expect(unique.accountId).toBe('acc_4821');
    expect(unique.accountLast4).toBe('4821');
    expect(unique.accountMatch).toBe('unique');
    expect(missing.accountId).toBeNull();
    expect(missing.accountLast4).toBe('0000');
    expect(missing.accountMatch).toBe('unresolved');
    expect(ambiguous.accountId).toBeNull();
    expect(ambiguous.accountLast4).toBe('4821');
    expect(ambiguous.accountMatch).toBe('ambiguous');
  });

  it('keeps a canonical account id when the lookup does not match', () => {
    const transaction = expectNormalized(normalizeTransaction(canonicalInr, []));

    expect(transaction.accountId).toBe('acc_4821');
    expect(transaction.accountLast4).toBeNull();
    expect(transaction.accountMatch).toBe('unresolved');
  });

  it('rejects timestamps that are not real UTC instants', () => {
    expect(
      normalizeTransaction({ ...canonicalInr, occurred_at: '2026-10-10' }),
    ).toMatchObject({ ok: false, reason: 'invalid_timestamp' });
    expect(
      normalizeTransaction({ ...canonicalInr, occurred_at: '2026-02-31T00:00:00Z' }),
    ).toMatchObject({ ok: false, reason: 'invalid_timestamp' });
    expect(normalizeTransaction({ ...legacyDebit, txn_time: 1774981380.5 })).toMatchObject({
      ok: false,
      reason: 'invalid_timestamp',
    });
    expect(
      normalizeTransaction({ ...legacyDebit, txn_time: Number.MAX_SAFE_INTEGER }),
    ).toMatchObject({ ok: false, reason: 'invalid_timestamp' });
  });

  it('rejects unsafe direction, amount, id, and shape without dropping neighbors', () => {
    const results = normalizeTransactions([
      legacyDebit,
      { ...canonicalInr, direction: 'DR' },
      { ...legacyDebit, amount: '516.4' },
      { ...canonicalInr, id: '' },
      { note: 'not a transaction' },
      canonicalUsd,
    ]);

    expect(results.map((result) => (result.ok ? result.transaction.id : result.id))).toEqual([
      '115509',
      canonicalInr.id,
      legacyDebit.id,
      null,
      null,
      canonicalUsd.id,
    ]);
    expect(results.filter((result) => !result.ok).map((result) => result.index)).toEqual([1, 2, 3, 4]);
    expect(results[1]).toMatchObject({ ok: false, reason: 'invalid_direction' });
    expect(results[2]).toMatchObject({ ok: false, reason: 'invalid_amount' });
    expect(results[3]).toMatchObject({ ok: false, reason: 'missing_id' });
    expect(results[4]).toMatchObject({ ok: false, reason: 'unrecognized_shape' });
    expect(results[0]?.ok).toBe(true);
    expect(results[5]?.ok).toBe(true);
  });
});
