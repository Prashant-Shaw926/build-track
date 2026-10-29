import { formatGroupedDecimal, formatSummaryAmount, formatTransactionAmount } from '@/features/transactions/utils/format-amount';

describe('amount formatting', () => {
  it('groups a summary decimal string without adding a currency or using a float round-trip', () => {
    const source = '312156.39';

    expect(formatSummaryAmount('242333.00')).toBe('242,333.00');
    expect(formatSummaryAmount('614.28')).toBe('614.28');
    expect(formatSummaryAmount('1527891.30')).toBe('1,527,891.30');
    expect(formatSummaryAmount(source)).toBe('312,156.39');
    expect(source).toBe('312156.39');
    expect(formatGroupedDecimal('123456.78')).toBe('123,456.78');
    expect(formatSummaryAmount('242333.00')).not.toContain('₹');
    expect(formatSummaryAmount('242333.00')).not.toContain('INR');
    expect(formatSummaryAmount(source)).not.toContain('₹');
  });

  it('formats INR in Indian grouping and USD with a dollar sign', () => {
    expect(formatTransactionAmount({ amountMinor: 34900, currency: 'INR', inrAmountMinor: 34900 })).toEqual({
      primary: '₹349.00',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 12345678, currency: 'INR', inrAmountMinor: 12345678 })).toEqual({
      primary: '₹1,23,456.78',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 1, currency: 'INR', inrAmountMinor: 1 })).toEqual({
      primary: '₹0.01',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 123456, currency: 'USD', inrAmountMinor: 10234567 })).toEqual({
      primary: '$1,234.56',
      secondary: '₹1,02,345.67',
    });
    expect(formatTransactionAmount({ amountMinor: 1000, currency: 'USD', inrAmountMinor: null })).toEqual({
      primary: '$10.00',
      secondary: null,
    });
  });

  it('uses the currency code for an unsupported currency and stays available when currency is missing', () => {
    expect(formatTransactionAmount({ amountMinor: 123456, currency: 'EUR', inrAmountMinor: null })).toEqual({
      primary: 'EUR 1,234.56',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 51649, currency: null, inrAmountMinor: null })).toEqual({
      primary: '₹516.49',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: 135364, currency: '   ', inrAmountMinor: null })).toEqual({
      primary: '₹1,353.64',
      secondary: null,
    });
    expect(formatTransactionAmount({ amountMinor: Number.NaN, currency: 'INR', inrAmountMinor: null })).toEqual({
      primary: 'Amount unavailable',
      secondary: null,
    });
  });
});
