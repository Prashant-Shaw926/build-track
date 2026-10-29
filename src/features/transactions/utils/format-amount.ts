function groupWhole(whole: string): string {
  let grouped = '';

  for (let index = 0; index < whole.length; index += 1) {
    const remaining = whole.length - index;

    if (index > 0 && remaining % 3 === 0) {
      grouped += ',';
    }

    grouped += whole[index] ?? '';
  }

  return grouped;
}

export function formatGroupedDecimal(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);

  if (match === null) {
    return value;
  }

  const whole = groupWhole(match[2]);
  const fraction = match[3];

  if (fraction === undefined) {
    return `${match[1]}${whole}`;
  }

  return `${match[1]}${whole}.${fraction}`;
}

export function formatMinorUnits(amountMinor: number): string {
  const negative = amountMinor < 0;
  const absolute = negative ? -amountMinor : amountMinor;
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  const text = `${formatGroupedDecimal(String(whole))}.${fraction}`;

  return negative ? `-${text}` : text;
}

export function formatSummaryAmount(value: string): string {
  return formatGroupedDecimal(value);
}

export interface TransactionAmountText {
  primary: string;
  secondary: string | null;
}

export function formatTransactionAmount(input: {
  amountMinor: number;
  currency: string | null;
  inrAmountMinor: number | null;
}): TransactionAmountText {
  const amount = formatMinorUnits(input.amountMinor);

  if (input.currency === null) {
    return { primary: `${amount} · Currency unavailable`, secondary: null };
  }

  if (input.currency === 'INR') {
    return { primary: `₹${amount}`, secondary: null };
  }

  if (input.currency === 'USD') {
    return {
      primary: `USD ${amount}`,
      secondary: input.inrAmountMinor === null ? null : `₹${formatMinorUnits(input.inrAmountMinor)}`,
    };
  }

  return {
    primary: `${input.currency} ${amount}`,
    secondary: input.inrAmountMinor === null ? null : `₹${formatMinorUnits(input.inrAmountMinor)}`,
  };
}
