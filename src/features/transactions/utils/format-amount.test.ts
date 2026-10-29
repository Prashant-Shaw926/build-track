import {
  formatGroupedDecimal,
  formatMinorUnits,
  formatSummaryAmount,
  formatTransactionAmount,
} from '@/features/transactions/utils/format-amount';

describe('amount formatting', () => {
  it('groups a summary decimal string without adding a currency or using a float round-trip', () => {
    const source = '312156.39';

    expect(formatSummaryAmount('242333.00')).toBe('242,333.00');
    expect(formatSummaryAmount('614.28')).toBe('614.28');
    expect(formatSummaryAmount('1527891.30')).toBe('1,527,891.30');
    expect(formatSummaryAmount(source)).toBe('312,156.39');
    expect(source).toBe('312156.39');
    expect(formatSummaryAmount('242333.00')).not.toContain('₹');
    expect(formatSummaryAmount('242333.00')).not.toContain('INR');
    expect(formatSummaryAmount(source)).not.toContain('₹');
  });

  it('formats canonical and legacy minor units from integers', () => {
    expect(formatMinorUnits(34900)).toBe('349.00');
    expect(formatTransactionAmount({ amountMinor: 34900, currency: 'INR', inrAmountMinor: 34900 })).toEqual({
      primary: '₹349.00',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 1000, currency: 'USD', inrAmountMinor: 86661 })).toEqual({
      primary: 'USD 10.00',
      secondary: '₹866.61',
    });
    expect(formatTransactionAmount({ amountMinor: 1000, currency: 'USD', inrAmountMinor: null })).toEqual({
      primary: 'USD 10.00',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 51649, currency: null, inrAmountMinor: null })).toEqual({
      primary: '516.49 · Currency unavailable',
      secondary: null,
    });
  });
});
