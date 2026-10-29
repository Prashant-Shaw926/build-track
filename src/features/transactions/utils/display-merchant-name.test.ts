import { displayMerchantName } from '@/features/transactions/utils/display-merchant-name';

describe('display merchant name', () => {
  it('keeps letters and numbers and drops symbols without changing the source string', () => {
    const coffee = '☕ Third Wave Coffee';
    const payu = 'PAYU*BHARAT SANCHAR NIGAM LIMITED';
    const store = 'राम किराना स्टोर';

    expect(displayMerchantName(coffee)).toBe('Third Wave Coffee');
    expect(displayMerchantName(payu)).toBe('PAYU BHARAT SANCHAR NIGAM LIMITED');
    expect(displayMerchantName('UPI/CHAI POINT')).toBe('UPI CHAI POINT');
    expect(displayMerchantName(store)).toBe('राम किराना स्टोर');
    expect(displayMerchantName('  ***  ')).toBe('Unknown merchant');
    expect(coffee).toBe('☕ Third Wave Coffee');
    expect(payu).toBe('PAYU*BHARAT SANCHAR NIGAM LIMITED');
    expect(store).toBe('राम किराना स्टोर');
  });
});
