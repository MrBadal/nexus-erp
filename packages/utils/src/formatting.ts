import { format as dateFnsFormat, parseISO } from 'date-fns';

/**
 * Format a monetary amount with currency symbol and locale-aware separators.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string or Date object using date-fns format tokens.
 */
export function formatDate(
  date: string | Date,
  formatStr: string = 'yyyy-MM-dd',
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return dateFnsFormat(dateObj, formatStr);
}

/**
 * Format a number with custom decimal and thousands separators.
 */
export function formatNumber(
  num: number,
  decimalSeparator: string = '.',
  thousandsSeparator: string = ',',
  decimalPlaces: number = 2,
): string {
  const fixed = num.toFixed(decimalPlaces);
  const [intPart, decPart] = fixed.split('.');

  const withThousands = intPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    thousandsSeparator,
  );

  if (decimalPlaces === 0) {
    return withThousands;
  }

  return `${withThousands}${decimalSeparator}${decPart}`;
}
