const NON_TEXT = /[^\p{L}\p{M}\p{N}]+/gu;

export function displayMerchantName(merchant: string): string {
  const text = merchant.replace(NON_TEXT, ' ').replace(/ +/g, ' ').trim();

  return text.length > 0 ? text : 'Unknown merchant';
}
