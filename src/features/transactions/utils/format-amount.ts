function groupWestern(whole: string): string {
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

function groupIndian(whole: string): string {
  if (whole.length <= 3) {
    return whole;
  }

  const tail = whole.slice(-3);
  const head = whole.slice(0, -3);
  let groupedHead = '';

  for (let index = head.length; index > 0; index -= 2) {
    const start = Math.max(0, index - 2);
    const part = head.slice(start, index);
    groupedHead = groupedHead.length === 0 ? part : `${part},${groupedHead}`;
  }

  return `${groupedHead},${tail}`;
}

export function formatGroupedDecimal(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);

  if (match === null) {
    return value;
  }

  const whole = groupWestern(match[2]);
  const fraction = match[3];

  if (fraction === undefined) {
    return `${match[1]}${whole}`;
  }

  return `${match[1]}${whole}.${fraction}`;
}

function formatMinorUnits(amountMinor: number, grouping: 'western' | 'indian'): string | null {
  if (!Number.isFinite(amountMinor)) {
    return null;
  }

  const negative = amountMinor < 0;
  const absolute = Math.trunc(Math.abs(amountMinor));
  const whole = Math.trunc(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  const grouped = grouping === 'indian' ? groupIndian(String(whole)) : groupWestern(String(whole));
  const text = `${grouped}.${fraction}`;

  return negative ? `-${text}` : text;
}

function currencyCode(currency: string | null): string | null {
  if (typeof currency !== 'string') {
    return null;
  }

  const code = currency.trim();

  return code.length === 0 ? null : code;
}

export function formatSummaryAmount(value: string): string {
  return formatGroupedDecimal(value);
}

export interface TransactionAmountText {
  primary: string;
  secondary: string | null;
}

function rupeeSecondary(inrAmountMinor: number | null): string | null {
  if (inrAmountMinor === null) {
    return null;
  }

  const amount = formatMinorUnits(inrAmountMinor, 'indian');

  return amount === null ? null : `₹${amount}`;
}

export function formatTransactionAmount(input: {
  amountMinor: number;
  currency: string | null;
  inrAmountMinor: number | null;
}): TransactionAmountText {
  const code = currencyCode(input.currency);
  const western = formatMinorUnits(input.amountMinor, 'western');
  const indian = formatMinorUnits(input.amountMinor, 'indian');

  if (western === null || indian === null) {
    return { primary: 'Amount unavailable', secondary: null };
  }

  if (code === null || code === 'INR') {
    return { primary: `₹${indian}`, secondary: null };
  }

  if (code === 'USD') {
    return { primary: `$${western}`, secondary: rupeeSecondary(input.inrAmountMinor) };
  }

  return { primary: `${code} ${western}`, secondary: rupeeSecondary(input.inrAmountMinor) };
}
